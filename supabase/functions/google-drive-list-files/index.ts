import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  thumbnailLink?: string;
  webContentLink?: string;
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

    const { folderId = "root" } = await req.json().catch(() => ({}));

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "google_drive")
      .maybeSingle();

    if (connError || !connection) {
      throw new Error("Google Drive not connected");
    }

    // Decrypt and possibly refresh token
    let accessToken = await decryptToken(connection.access_token);

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      if (!connection.refresh_token) {
        throw new Error("Token expired and no refresh token available. Please reconnect.");
      }
      accessToken = await refreshToken(connection, supabase, user.id);
    }

    // List files from Google Drive
    const query = folderId === "root" 
      ? "'root' in parents and trashed = false"
      : `'${folderId}' in parents and trashed = false`;
    
    const fields = "files(id,name,mimeType,size,modifiedTime,parents,thumbnailLink,webContentLink)";
    
    const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
    listUrl.searchParams.set("q", query);
    listUrl.searchParams.set("fields", fields);
    listUrl.searchParams.set("pageSize", "100");
    listUrl.searchParams.set("orderBy", "folder,name");

    const listResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Google Drive API error:", errorText);
      
      if (listResponse.status === 401) {
        // Token expired, try to refresh
        if (connection.refresh_token) {
          accessToken = await refreshToken(connection, supabase, user.id);
          
          // Retry the request
          const retryResponse = await fetch(listUrl.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          if (!retryResponse.ok) {
            throw new Error("Failed to list files after token refresh");
          }
          
          const retryData = await retryResponse.json();
          return formatResponse(retryData.files || []);
        }
        throw new Error("Token expired. Please reconnect Google Drive.");
      }
      
      throw new Error("Failed to list Google Drive files");
    }

    const data = await listResponse.json();
    return formatResponse(data.files || []);
  } catch (error: unknown) {
    console.error("Error listing Google Drive files:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatResponse(files: DriveFile[]) {
  const formattedEntries = files.map((file) => {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    
    return {
      id: file.id,
      name: file.name,
      path: file.id, // Use ID as path for Google Drive
      isFolder,
      size: file.size ? parseInt(file.size) : undefined,
      modifiedAt: file.modifiedTime,
      mimeType: file.mimeType,
      assetType: getAssetType(file.mimeType, file.name),
      thumbnailUrl: file.thumbnailLink,
      downloadUrl: file.webContentLink,
    };
  });

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

function getAssetType(mimeType: string, filename: string): string {
  // Check Google Docs types
  if (mimeType.includes("google-apps.document")) return "document";
  if (mimeType.includes("google-apps.spreadsheet")) return "spreadsheet";
  if (mimeType.includes("google-apps.presentation")) return "presentation";
  if (mimeType.includes("google-apps.folder")) return "folder";
  
  // Check standard MIME types
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text/")) return "document";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "spreadsheet";
  
  // Fallback to extension check
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
  const googleClientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!;
  const googleClientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!;

  const decryptedRefreshToken = await decryptToken(connection.refresh_token);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: decryptedRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to refresh Google Drive token. Please reconnect.");
  }

  const tokens = await tokenResponse.json();
  
  // Update stored token with encrypted value
  const encryptedNewToken = await encryptToken(tokens.access_token);
  
  await supabase
    .from("social_connections")
    .update({
      access_token: encryptedNewToken,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("platform", "google_drive");

  return tokens.access_token;
}
