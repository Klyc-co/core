import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  // Get frontend URL for redirects
  const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://klyc.ai";

  if (error) {
    console.error("Instagram OAuth error:", error, errorDescription);
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
    // Decode the state to get user_id
    const decodedState = JSON.parse(atob(state));
    const userId = decodedState.user_id;

    if (!userId) {
      throw new Error("Invalid state: missing user_id");
    }

    // Get Instagram credentials
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      throw new Error("Instagram credentials not configured");
    }

    const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Short-lived token obtained successfully");

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${tokenData.access_token}`,
      { method: "GET" }
    );

    let accessToken = tokenData.access_token;
    let expiresIn = 3600; // Default 1 hour for short-lived token

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000; // ~60 days
      console.log("Long-lived token obtained successfully");
    } else {
      console.warn("Could not get long-lived token, using short-lived token");
    }

    // Get user info
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );

    let platformUserId = tokenData.user_id?.toString();
    let platformUsername = null;

    if (userResponse.ok) {
      const userData = await userResponse.json();
      platformUserId = userData.id;
      platformUsername = userData.username;
      console.log("User info obtained:", { platformUserId, platformUsername });
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store in database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert(
        {
          user_id: userId,
          platform: "instagram",
          access_token: accessToken,
          refresh_token: null, // Instagram doesn't use refresh tokens the same way
          token_expires_at: tokenExpiresAt,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          scopes: ["user_profile", "user_media"],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,platform",
        }
      );

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      throw new Error(`Failed to save connection: ${upsertError.message}`);
    }

    console.log("Instagram connection saved successfully for user:", userId);

    return Response.redirect(
      `${FRONTEND_URL}/profile/import?success=instagram`,
      302
    );
  } catch (err) {
    console.error("Instagram OAuth callback error:", err);
    return Response.redirect(
      `${FRONTEND_URL}/profile/import?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
      302
    );
  }
});
