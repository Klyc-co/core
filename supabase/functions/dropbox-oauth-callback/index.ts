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

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("Dropbox OAuth error:", error, errorDescription);
      return Response.redirect(
        `${Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app"}/client/profile/social?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    // Extract user ID from state
    const [userId] = state.split(":");
    if (!userId) {
      throw new Error("Invalid state parameter");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dropboxAppKey = Deno.env.get("DROPBOX_APP_KEY")!;
    const dropboxAppSecret = Deno.env.get("DROPBOX_APP_SECRET")!;

    if (!dropboxAppKey || !dropboxAppSecret) {
      throw new Error("Dropbox credentials not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${dropboxAppKey}:${dropboxAppSecret}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: `${supabaseUrl}/functions/v1/dropbox-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    console.log("Got Dropbox tokens successfully");

    // Get account info
    const accountResponse = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let accountInfo = null;
    if (accountResponse.ok) {
      accountInfo = await accountResponse.json();
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

    // Calculate token expiration
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store connection in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("dropbox_connections")
      .upsert({
        user_id: userId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        account_id: accountInfo?.account_id || tokens.account_id,
        account_email: accountInfo?.email,
        account_display_name: accountInfo?.name?.display_name,
        connection_status: "connected",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Failed to store Dropbox connection:", upsertError);
      throw new Error("Failed to store connection");
    }

    const redirectUrl = `${Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app"}/client/profile/social?success=dropbox`;
    return Response.redirect(redirectUrl, 302);
  } catch (error: unknown) {
    console.error("Dropbox callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const redirectUrl = `${Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app"}/client/profile/social?error=${encodeURIComponent(errorMessage)}`;
    return Response.redirect(redirectUrl, 302);
  }
});
