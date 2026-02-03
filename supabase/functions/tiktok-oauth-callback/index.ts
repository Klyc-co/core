import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Get redirect URL from environment or use default
  const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://klyc.ai";

  if (error) {
    console.error("TikTok OAuth error:", error, errorDescription);
    return Response.redirect(
      `${FRONTEND_URL}/profile/import?error=${encodeURIComponent(errorDescription || error)}`,
      302
    );
  }

  if (!code || !state) {
    console.error("Missing code or state parameter");
    return Response.redirect(
      `${FRONTEND_URL}/profile/import?error=Missing+authorization+code`,
      302
    );
  }

  try {
    // Parse state to get user_id
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    if (!userId) {
      throw new Error("Invalid state: missing user_id");
    }

    const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
    const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      throw new Error("TikTok credentials not configured");
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${SUPABASE_URL}/functions/v1/tiktok-oauth-callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      throw new Error(tokenData.error_description || "Failed to get access token");
    }

    console.log("Token exchange successful, scopes:", tokenData.scope);

    // Get user info from TikTok
    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const userData = await userResponse.json();
    console.log("User data response:", userData);

    const platformUserId = userData.data?.user?.open_id || tokenData.open_id;
    const platformUsername = userData.data?.user?.display_name || "TikTok User";

    // Store in database using service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token 
      ? await encryptToken(tokenData.refresh_token) 
      : null;

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert(
        {
          user_id: userId,
          platform: "tiktok",
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          scopes: tokenData.scope ? tokenData.scope.split(",") : [],
        },
        { onConflict: "user_id,platform" }
      );

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      throw new Error("Failed to save connection");
    }

    console.log("TikTok connection saved successfully for user:", userId);

    return Response.redirect(
      `${FRONTEND_URL}/profile/import?success=tiktok`,
      302
    );
  } catch (err) {
    console.error("TikTok OAuth callback error:", err);
    return Response.redirect(
      `${FRONTEND_URL}/profile/import?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
      302
    );
  }
});
