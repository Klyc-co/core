import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    let stateData: { user_id: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response("Invalid state", { status: 400 });
    }

    const FRAMEIO_CLIENT_ID = Deno.env.get("FRAMEIO_CLIENT_ID");
    const FRAMEIO_CLIENT_SECRET = Deno.env.get("FRAMEIO_CLIENT_SECRET");

    if (!FRAMEIO_CLIENT_ID || !FRAMEIO_CLIENT_SECRET) {
      return new Response("Frame.io credentials not configured", { status: 500 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/frameio-oauth-callback`;

    // Exchange code for access token
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: FRAMEIO_CLIENT_ID,
      client_secret: FRAMEIO_CLIENT_SECRET,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://applications.frame.io/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Frame.io token exchange failed:", error);
      return new Response(`Token exchange failed: ${error}`, { status: 400 });
    }

    const tokens = await tokenResponse.json();

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : null;

    // Fetch user info from Frame.io
    let platformUserId = null;
    let platformUsername = null;
    try {
      const meResponse = await fetch("https://api.frame.io/v2/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meResponse.ok) {
        const me = await meResponse.json();
        platformUserId = me.id;
        platformUsername = me.name || me.email;
      }
    } catch (e) {
      console.warn("Failed to fetch Frame.io user info:", e);
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Store connection in social_connections
    const { error: insertError } = await supabaseClient
      .from("social_connections")
      .upsert(
        {
          user_id: stateData.user_id,
          platform: "frameio",
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          scopes: ["asset.read", "asset.create", "account.read", "project.read"],
        },
        { onConflict: "user_id,platform" }
      );

    if (insertError) {
      console.error("Failed to save Frame.io connection:", insertError);
      return new Response(`Failed to save connection: ${insertError.message}`, {
        status: 500,
      });
    }

    const frontendUrl =
      Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}/profile/import?success=frameio`,
      },
    });
  } catch (error: unknown) {
    console.error("Frame.io OAuth callback error:", error);
    return new Response(`OAuth error: ${(error as Error).message}`, { status: 500 });
  }
});
