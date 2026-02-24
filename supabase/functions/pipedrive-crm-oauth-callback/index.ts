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

    let stateData: { userId: string; displayName: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response("Invalid state", { status: 400 });
    }

    const clientId = Deno.env.get("PIPEDRIVE_CLIENT_ID");
    const clientSecret = Deno.env.get("PIPEDRIVE_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pipedrive-crm-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth.pipedrive.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      return new Response(`Token exchange failed: ${error}`, { status: 400 });
    }

    const tokens = await tokenResponse.json();

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : null;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Store metadata about the Pipedrive company domain
    const metadata: Record<string, string> = {};
    if (tokens.api_domain) {
      metadata.api_domain = tokens.api_domain;
    }

    // Create CRM connection
    const { error: insertError } = await supabaseClient
      .from("crm_connections")
      .insert({
        user_id: stateData.userId,
        provider: "pipedrive",
        display_name: stateData.displayName,
        status: "syncing",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: new Date(
          Date.now() + (tokens.expires_in || 3600) * 1000
        ).toISOString(),
        metadata,
      });

    if (insertError) {
      console.error("Failed to save connection:", insertError);
      return new Response(
        `Failed to save connection: ${insertError.message}`,
        { status: 500 }
      );
    }

    // Redirect back to library
    const frontendUrl =
      Deno.env.get("FRONTEND_URL") || "https://idea-to-idiom.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}/profile/library?tab=crm&connected=pipedrive`,
      },
    });
  } catch (error: unknown) {
    console.error("OAuth callback error:", error);
    return new Response(`OAuth error: ${(error as Error).message}`, {
      status: 500,
    });
  }
});
