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

    if (error) {
      console.error("OAuth error:", error);
      return createRedirectResponse(`/profile/import?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return createRedirectResponse("/profile/import?error=missing_params");
    }

    // Decode state
    let stateData: { user_id: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return createRedirectResponse("/profile/import?error=invalid_state");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const boxClientId = Deno.env.get("BOX_CLIENT_ID")!;
    const boxClientSecret = Deno.env.get("BOX_CLIENT_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/box-oauth-callback`;

    const tokenResponse = await fetch("https://api.box.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: boxClientId,
        client_secret: boxClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return createRedirectResponse("/profile/import?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();

    // Get user info from Box
    const userInfoResponse = await fetch("https://api.box.com/2.0/users/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let userEmail = null;
    let userName = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.login;
      userName = userInfo.name;
    }

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : null;

    // Store connection
    const { error: insertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: stateData.user_id,
        platform: "box",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        platform_username: userEmail || userName,
        scopes: ["root_readwrite"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (insertError) {
      console.error("Failed to store connection:", insertError);
      return createRedirectResponse("/profile/import?error=storage_failed");
    }

    return createRedirectResponse("/profile/import?success=box");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return createRedirectResponse("/profile/import?error=callback_failed");
  }
});

function createRedirectResponse(path: string): Response {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://klyc.ai";
  const redirectUrl = `${frontendUrl}${path}`;

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: redirectUrl,
    },
  });
}
