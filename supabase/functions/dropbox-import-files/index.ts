import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileToImport {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  assetType?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { files, enableAutoSync, autoSyncFolderPath } = await req.json() as {
      files: FileToImport[];
      enableAutoSync?: boolean;
      autoSyncFolderPath?: string;
    };

    if (!files || files.length === 0) {
      throw new Error("No files selected for import");
    }

    // Get Dropbox connection
    const { data: connection, error: connError } = await supabase
      .from("dropbox_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connError || !connection) {
      throw new Error("Dropbox not connected");
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const importedAssets: any[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        if (file.isFolder) {
          // For folders, recursively get all files
          const folderFiles = await listFolderRecursively(accessToken, file.path);
          for (const folderFile of folderFiles) {
            const asset = await importSingleFile(
              folderFile,
              accessToken,
              user.id,
              connection.id,
              serviceSupabase
            );
            if (asset) importedAssets.push(asset);
          }
        } else {
          const asset = await importSingleFile(
            file,
            accessToken,
            user.id,
            connection.id,
            serviceSupabase
          );
          if (asset) importedAssets.push(asset);
        }
      } catch (err: unknown) {
        console.error(`Error importing ${file.name}:`, err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${file.name}: ${errorMessage}`);
      }
    }

    // Update auto-sync settings if requested
    if (enableAutoSync !== undefined) {
      await supabase
        .from("dropbox_connections")
        .update({
          auto_sync_enabled: enableAutoSync,
          auto_sync_folder_path: autoSyncFolderPath || null,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      // Just update last sync time
      await supabase
        .from("dropbox_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: importedAssets.length,
        errors: errors.length > 0 ? errors : undefined,
        assets: importedAssets,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error importing Dropbox files:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function listFolderRecursively(
  accessToken: string,
  path: string
): Promise<FileToImport[]> {
  const files: FileToImport[] = [];
  
  const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      recursive: true,
      include_media_info: true,
      include_deleted: false,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to list folder contents");
  }

  const data = await response.json();
  
  for (const entry of data.entries) {
    if (entry[".tag"] === "file") {
      files.push({
        id: entry.id,
        name: entry.name,
        path: entry.path_display,
        isFolder: false,
        size: entry.size,
        modifiedAt: entry.server_modified,
        mimeType: getMimeType(entry.name),
        assetType: getAssetType(entry.name),
      });
    }
  }

  return files;
}

async function importSingleFile(
  file: FileToImport,
  accessToken: string,
  userId: string,
  connectionId: string,
  supabase: any
): Promise<any> {
  // Check if already imported
  const { data: existing } = await supabase
    .from("dropbox_assets")
    .select("id")
    .eq("user_id", userId)
    .eq("dropbox_file_id", file.id)
    .maybeSingle();

  if (existing) {
    // Update existing asset
    const { data: updated, error } = await supabase
      .from("dropbox_assets")
      .update({
        asset_name: file.name,
        dropbox_path: file.path,
        file_size: file.size,
        mime_type: file.mimeType,
        asset_type: file.assetType,
        dropbox_modified_at: file.modifiedAt,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    return updated;
  }

  // Get thumbnail for images
  let thumbnailUrl = null;
  if (file.assetType === "image") {
    try {
      const thumbResponse = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({
            resource: { ".tag": "path", path: file.path },
            format: { ".tag": "jpeg" },
            size: { ".tag": "w256h256" },
          }),
        },
      });

      if (thumbResponse.ok) {
        const thumbBlob = await thumbResponse.blob();
        const base64 = await blobToBase64(thumbBlob);
        thumbnailUrl = `data:image/jpeg;base64,${base64}`;
      }
    } catch (e) {
      console.log("Could not generate thumbnail for", file.name);
    }
  }

  // Get parent folder path
  const pathParts = file.path.split("/");
  pathParts.pop();
  const parentFolderPath = pathParts.join("/") || "/";

  // Insert new asset
  const { data: newAsset, error } = await supabase
    .from("dropbox_assets")
    .insert({
      user_id: userId,
      dropbox_connection_id: connectionId,
      dropbox_file_id: file.id,
      dropbox_path: file.path,
      asset_name: file.name,
      asset_type: file.assetType,
      mime_type: file.mimeType,
      file_size: file.size,
      thumbnail_url: thumbnailUrl,
      dropbox_modified_at: file.modifiedAt,
      parent_folder_path: parentFolderPath,
      metadata: {
        source: "dropbox",
        original_path: file.path,
      },
      tags: [file.assetType || "other"],
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert asset:", error);
    throw error;
  }

  return newAsset;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    webm: "video/webm",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function getAssetType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"];
  const videoExts = ["mp4", "mov", "avi", "webm", "mkv", "wmv"];
  const docExts = ["pdf", "doc", "docx", "txt", "rtf"];
  const spreadsheetExts = ["xls", "xlsx", "csv"];
  
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (docExts.includes(ext)) return "document";
  if (spreadsheetExts.includes(ext)) return "spreadsheet";
  return "other";
}
