import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DropboxEntry {
  ".tag": "file" | "folder";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size?: number;
  client_modified?: string;
  server_modified?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { path = "" } = await req.json();

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
    let accessToken = await decryptToken(connection.access_token);

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      accessToken = await refreshToken(connection, supabase, user.id);
    }

    // List files from Dropbox
    const listResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path || "",
        recursive: false,
        include_media_info: true,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        limit: 2000,
      }),
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Dropbox API error:", errorText);
      
      if (listResponse.status === 401) {
        // Token expired, try to refresh
        accessToken = await refreshToken(connection, supabase, user.id);
        // Retry the request
        const retryResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: path || "",
            recursive: false,
            include_media_info: true,
            include_deleted: false,
          }),
        });
        
        if (!retryResponse.ok) {
          throw new Error("Failed to list files after token refresh");
        }
        
        const retryData = await retryResponse.json();
        return formatResponse(retryData.entries);
      }
      
      throw new Error("Failed to list Dropbox files");
    }

    const data = await listResponse.json();
    return formatResponse(data.entries);
  } catch (error: unknown) {
    console.error("Error listing Dropbox files:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatResponse(entries: DropboxEntry[]) {
  const formattedEntries = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    path: entry.path_display,
    isFolder: entry[".tag"] === "folder",
    size: entry.size,
    modifiedAt: entry.server_modified || entry.client_modified,
    mimeType: getMimeType(entry.name),
    assetType: getAssetType(entry.name),
  }));

  // Sort: folders first, then files alphabetically
  formattedEntries.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return new Response(
    JSON.stringify({ entries: formattedEntries }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
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

async function refreshToken(connection: any, supabase: any, userId: string): Promise<string> {
  const dropboxAppKey = Deno.env.get("DROPBOX_APP_KEY")!;
  const dropboxAppSecret = Deno.env.get("DROPBOX_APP_SECRET")!;

  if (!connection.refresh_token) {
    throw new Error("No refresh token available. Please reconnect Dropbox.");
  }

  const decryptedRefreshToken = await decryptToken(connection.refresh_token);

  const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${dropboxAppKey}:${dropboxAppSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptedRefreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to refresh Dropbox token. Please reconnect.");
  }

  const tokens = await tokenResponse.json();
  
  // Update stored token with encrypted value
  const encryptedNewToken = await encryptToken(tokens.access_token);
  
  await supabase
    .from("dropbox_connections")
    .update({
      access_token: encryptedNewToken,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return tokens.access_token;
}
