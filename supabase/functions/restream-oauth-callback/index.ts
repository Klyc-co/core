import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AES-256-GCM encryption for tokens
async function encryptToken(plaintext: string): Promise<string> {
  const keyData = new TextEncoder().encode(
    (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").slice(0, 32)
  );
  const key = await crypto.subtle.importKey("raw", keyData, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  let binary = "";
  for (const byte of combined) binary += String.fromCharCode(byte);
  return "ENC:v1:" + btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const restreamClientId = Deno.env.get("RESTREAM_CLIENT_ID")!;
  const restreamClientSecret = Deno.env.get("RESTREAM_CLIENT_SECRET")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (error) {
    console.error("Restream OAuth error:", error);
    return Response.redirect(`${frontendUrl}/profile/import?error=restream_auth_failed`, 302);
  }

  if (!code || !state) {
    return Response.redirect(`${frontendUrl}/profile/import?error=missing_params`, 302);
  }

  try {
    // Look up the state for CSRF validation
    const { data: pkceData, error: pkceError } = await supabase
      .from("oauth_pkce_states")
      .select("*")
      .eq("state", state)
      .eq("provider", "restream")
      .single();

    if (pkceError || !pkceData) {
      console.error("State not found:", pkceError);
      return Response.redirect(`${frontendUrl}/profile/import?error=invalid_state`, 302);
    }

    const userId = pkceData.user_id;

    // Clean up the state
    await supabase.from("oauth_pkce_states").delete().eq("state", state);

    const redirectUri = `${supabaseUrl}/functions/v1/restream-oauth-callback`;

    // Exchange the code for tokens using Basic Auth (recommended by Restream)
    const basicAuth = btoa(`${restreamClientId}:${restreamClientSecret}`);
    const tokenResponse = await fetch("https://api.restream.io/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Restream token exchange failed:", errText);
      return Response.redirect(`${frontendUrl}/profile/import?error=token_exchange_failed`, 302);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token || tokens.accessToken;
    const refreshToken = tokens.refresh_token || tokens.refreshToken;
    const expiresIn = tokens.expires_in || tokens.accessTokenExpiresIn;

    // Fetch user profile
    let restreamUserId = null;
    let restreamUsername = null;
    try {
      const profileRes = await fetch("https://api.restream.io/v2/user/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        restreamUserId = profile?.id?.toString() || null;
        restreamUsername = profile?.username || profile?.email || null;
      }
    } catch (e) {
      console.warn("Could not fetch Restream profile:", e);
    }

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null;

    // Upsert into social_connections
    const { error: upsertError } = await supabase.from("social_connections").upsert(
      {
        user_id: userId,
        platform: "restream",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        platform_user_id: restreamUserId,
        platform_username: restreamUsername,
      },
      { onConflict: "user_id,platform" }
    );

    if (upsertError) {
      console.error("Failed to save Restream connection:", upsertError);
      return Response.redirect(`${frontendUrl}/profile/import?error=save_failed`, 302);
    }

    return Response.redirect(`${frontendUrl}/profile/import?success=restream`, 302);
  } catch (err) {
    console.error("Restream OAuth callback error:", err);
    return Response.redirect(`${frontendUrl}/profile/import?error=unexpected`, 302);
  }
});
