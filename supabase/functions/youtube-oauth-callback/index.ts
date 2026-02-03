import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Get the frontend URL for redirects
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const frontendUrl = SUPABASE_URL.includes("yfhuhcopgddbuecsrbje") 
    ? "https://idea-to-idiom.lovable.app" 
    : "http://localhost:5173";

  if (error) {
    console.error("YouTube OAuth error:", error);
    return Response.redirect(`${frontendUrl}/profile/import?youtube_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error("Missing code or state");
    return Response.redirect(`${frontendUrl}/profile/import?youtube_error=missing_params`);
  }

  try {
    // Decode state to get user_id
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    if (!userId) {
      throw new Error("No user_id in state");
    }

    console.log("Processing YouTube callback for user:", userId);

    const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID")!;
    const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${SUPABASE_URL}/functions/v1/youtube-oauth-callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token exchange response status:", tokenResponse.status);

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      throw new Error(tokenData.error_description || "Failed to exchange code for token");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Get YouTube channel info
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const channelData = await channelResponse.json();
    console.log("Channel data response:", channelResponse.status);

    let channelId = null;
    let channelTitle = null;

    if (channelResponse.ok && channelData.items?.length > 0) {
      const channel = channelData.items[0];
      channelId = channel.id;
      channelTitle = channel.snippet.title;
      console.log("Connected YouTube channel:", channelTitle, channelId);
    } else {
      // User doesn't have a YouTube channel, but we can still store the connection
      // They may have access to managed channels or want to use YouTube Analytics
      console.log("No YouTube channel found for user, proceeding with connection anyway");
    }

    // Store in social_connections table
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null;

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "youtube",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        platform_user_id: channelId,
        platform_username: channelTitle,
        scopes: ["youtube.readonly", "yt-analytics.readonly"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store connection:", upsertError);
      throw new Error("Failed to save YouTube connection");
    }

    console.log("YouTube connection saved successfully");
    return Response.redirect(`${frontendUrl}/profile/import?youtube_success=true`);

  } catch (err) {
    console.error("YouTube callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${frontendUrl}/profile/import?youtube_error=${encodeURIComponent(errorMessage)}`);
  }
});
