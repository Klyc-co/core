import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("FRONTEND_URL") || "https://idea-to-idiom.lovable.app";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("OneDrive OAuth error:", error, errorDescription);
      return Response.redirect(
        `${siteUrl}/profile/import?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const onedriveClientId = Deno.env.get("ONEDRIVE_CLIENT_ID")!;
    const onedriveClientSecret = Deno.env.get("ONEDRIVE_CLIENT_SECRET")!;

    if (!onedriveClientId || !onedriveClientSecret) {
      throw new Error("OneDrive credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate state
    const { data: stateRecord, error: stateError } = await supabase
      .from("oauth_pkce_states")
      .select("user_id")
      .eq("state", state)
      .eq("provider", "onedrive")
      .maybeSingle();

    if (stateError || !stateRecord) {
      throw new Error("Invalid or expired state parameter");
    }

    const userId = stateRecord.user_id;

    // Clean up state
    await supabase.from("oauth_pkce_states").delete().eq("state", state);

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/onedrive-oauth-callback`;
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: onedriveClientId,
        client_secret: onedriveClientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    console.log("Got OneDrive tokens successfully");

    // Get user profile info
    let profileInfo: any = null;
    try {
      const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileResponse.ok) {
        profileInfo = await profileResponse.json();
      }
    } catch (e) {
      console.warn("Could not fetch OneDrive profile:", e);
    }

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store in social_connections
    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "onedrive",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        platform_user_id: profileInfo?.id || null,
        platform_username: profileInfo?.displayName || profileInfo?.mail || null,
        scopes: ["Files.Read", "Files.Read.All", "User.Read", "offline_access"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store OneDrive connection:", upsertError);
      throw new Error("Failed to store connection");
    }

    console.log("OneDrive connection stored for user:", userId);
    return Response.redirect(`${siteUrl}/profile/import?success=onedrive`, 302);
  } catch (error: unknown) {
    console.error("OneDrive callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.redirect(
      `${siteUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});
