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
  const errorDescription = url.searchParams.get("error_description");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") ||
    (SUPABASE_URL.includes("yfhuhcopgddbuecsrbje")
      ? "https://idea-to-idiom.lovable.app"
      : "http://localhost:5173");

  if (error) {
    console.error("Twitch OAuth error:", error, errorDescription);
    return Response.redirect(
      `${frontendUrl}/profile/import?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    console.error("Missing code or state");
    return Response.redirect(`${frontendUrl}/profile/import?error=missing_params`);
  }

  try {
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    if (!userId) {
      throw new Error("No user_id in state");
    }

    console.log("Processing Twitch callback for user:", userId);

    const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID")!;
    const TWITCH_CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET")!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/twitch-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Twitch token exchange status:", tokenResponse.status);

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Twitch token exchange failed:", tokenData);
      throw new Error(tokenData.message || "Failed to exchange code for token");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 14400; // ~4 hours default

    // Get Twitch user identity
    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    });

    const userData = await userResponse.json();
    console.log("Twitch user response status:", userResponse.status);

    let twitchUserId = null;
    let twitchUsername = null;

    if (userResponse.ok && userData.data?.[0]) {
      twitchUserId = userData.data[0].id;
      twitchUsername = userData.data[0].display_name || userData.data[0].login;
      console.log("Connected Twitch user:", twitchUsername, twitchUserId);
    }

    // Store in social_connections table
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null;

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "twitch",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        platform_user_id: twitchUserId,
        platform_username: twitchUsername,
        scopes: ["user:read:email", "channel:read:subscriptions", "analytics:read:extensions", "analytics:read:games"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store Twitch connection:", upsertError);
      throw new Error("Failed to save Twitch connection");
    }

    console.log("Twitch connection saved successfully");
    return Response.redirect(`${frontendUrl}/profile/import?success=twitch`);

  } catch (err) {
    console.error("Twitch callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`);
  }
});
