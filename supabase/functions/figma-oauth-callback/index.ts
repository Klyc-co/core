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
    console.error("Figma OAuth error:", error);
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

    console.log("Processing Figma callback for user:", userId);

    const FIGMA_CLIENT_ID = Deno.env.get("FIGMA_CLIENT_ID")!;
    const FIGMA_CLIENT_SECRET = Deno.env.get("FIGMA_CLIENT_SECRET")!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/figma-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.figma.com/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: FIGMA_CLIENT_ID,
        client_secret: FIGMA_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Figma token exchange status:", tokenResponse.status);

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Figma token exchange failed:", tokenData);
      throw new Error(tokenData.error || "Failed to exchange code for token");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 7776000; // ~90 days default

    // Get Figma user info
    const meResponse = await fetch("https://api.figma.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const meData = await meResponse.json();
    console.log("Figma user response status:", meResponse.status);

    let figmaUserId = null;
    let figmaHandle = null;

    if (meResponse.ok && meData.id) {
      figmaUserId = meData.id;
      figmaHandle = meData.handle || meData.email || null;
      console.log("Connected Figma user:", figmaHandle, figmaUserId);
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
        platform: "figma",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        platform_user_id: figmaUserId,
        platform_username: figmaHandle,
        scopes: ["file_content:read", "file_metadata:read"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store Figma connection:", upsertError);
      throw new Error("Failed to save Figma connection");
    }

    console.log("Figma connection saved successfully");
    return Response.redirect(`${frontendUrl}/profile/import?success=figma`);

  } catch (err) {
    console.error("Figma callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`);
  }
});
