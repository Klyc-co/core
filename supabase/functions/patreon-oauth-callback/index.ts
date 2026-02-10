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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || 
    (SUPABASE_URL.includes("yfhuhcopgddbuecsrbje") 
      ? "https://idea-to-idiom.lovable.app" 
      : "http://localhost:5173");

  if (error) {
    console.error("Patreon OAuth error:", error);
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(error)}`);
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

    console.log("Processing Patreon callback for user:", userId);

    const PATREON_CLIENT_ID = Deno.env.get("PATREON_CLIENT_ID")!;
    const PATREON_CLIENT_SECRET = Deno.env.get("PATREON_CLIENT_SECRET")!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/patreon-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://www.patreon.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: PATREON_CLIENT_ID,
        client_secret: PATREON_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Patreon token exchange status:", tokenResponse.status);

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Patreon token exchange failed:", tokenData);
      throw new Error(tokenData.error || "Failed to exchange code for token");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 2678400; // ~31 days default

    // Get Patreon user identity
    const identityResponse = await fetch(
      "https://www.patreon.com/api/oauth2/v2/identity?fields[user]=full_name,email,image_url,url",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const identityData = await identityResponse.json();
    console.log("Patreon identity response status:", identityResponse.status);

    let patreonUserId = null;
    let patreonUsername = null;

    if (identityResponse.ok && identityData.data) {
      patreonUserId = identityData.data.id;
      patreonUsername = identityData.data.attributes?.full_name || null;
      console.log("Connected Patreon user:", patreonUsername, patreonUserId);
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
        platform: "patreon",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        platform_user_id: patreonUserId,
        platform_username: patreonUsername,
        scopes: ["identity", "campaigns", "campaigns.members", "campaigns.posts"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store Patreon connection:", upsertError);
      throw new Error("Failed to save Patreon connection");
    }

    console.log("Patreon connection saved successfully");
    return Response.redirect(`${frontendUrl}/profile/import?success=patreon`);

  } catch (err) {
    console.error("Patreon callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`);
  }
});
