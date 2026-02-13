import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const location = url.searchParams.get("location") || "us";

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    let stateData: { userId: string; displayName: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response("Invalid state", { status: 400 });
    }

    const clientId = Deno.env.get("ZOHO_CLIENT_ID");
    const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/zoho-crm-oauth-callback`;

    // Determine Zoho accounts domain based on location
    const accountsDomain = location === "in"
      ? "accounts.zoho.in"
      : location === "eu"
      ? "accounts.zoho.eu"
      : location === "au"
      ? "accounts.zoho.com.au"
      : location === "jp"
      ? "accounts.zoho.jp"
      : "accounts.zoho.com";

    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://${accountsDomain}/oauth/v2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Zoho token exchange failed:", error);
      return new Response(`Token exchange failed: ${error}`, { status: 400 });
    }

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("Zoho token error:", tokens.error);
      return new Response(`Token error: ${tokens.error}`, { status: 400 });
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : null;

    // Determine API domain from location
    const apiDomain = location === "in"
      ? "www.zohoapis.in"
      : location === "eu"
      ? "www.zohoapis.eu"
      : location === "au"
      ? "www.zohoapis.com.au"
      : location === "jp"
      ? "www.zohoapis.jp"
      : "www.zohoapis.com";

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create CRM connection
    const { error: insertError } = await supabaseClient
      .from("crm_connections")
      .insert({
        user_id: stateData.userId,
        provider: "zoho",
        display_name: stateData.displayName,
        status: "syncing",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: new Date(
          Date.now() + (tokens.expires_in || 3600) * 1000
        ).toISOString(),
        metadata: {
          api_domain: apiDomain,
          accounts_domain: accountsDomain,
          location,
        },
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
        Location: `${frontendUrl}/profile/library?tab=crm&connected=zoho`,
      },
    });
  } catch (error: unknown) {
    console.error("Zoho OAuth callback error:", error);
    return new Response(`OAuth error: ${(error as Error).message}`, {
      status: 500,
    });
  }
});
