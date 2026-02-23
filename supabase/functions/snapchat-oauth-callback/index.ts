import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const snapchatClientId = Deno.env.get("SNAPCHAT_CLIENT_ID")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (error) {
    console.error("Snapchat OAuth error:", error);
    return Response.redirect(`${frontendUrl}/profile/import?error=snapchat_auth_failed`, 302);
  }

  if (!code || !state) {
    return Response.redirect(`${frontendUrl}/profile/import?error=missing_params`, 302);
  }

  try {
    // Look up the PKCE state
    const { data: pkceData, error: pkceError } = await supabase
      .from("oauth_pkce_states")
      .select("*")
      .eq("state", state)
      .eq("provider", "snapchat")
      .single();

    if (pkceError || !pkceData) {
      console.error("PKCE state not found:", pkceError);
      return Response.redirect(`${frontendUrl}/profile/import?error=invalid_state`, 302);
    }

    const userId = pkceData.user_id;
    const codeVerifier = pkceData.code_verifier;

    // Clean up the PKCE state
    await supabase.from("oauth_pkce_states").delete().eq("state", state);

    const redirectUri = `${supabaseUrl}/functions/v1/snapchat-oauth-callback`;

    // Exchange the code for tokens using PKCE (no client_secret needed)
    const tokenResponse = await fetch("https://accounts.snapchat.com/accounts/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: snapchatClientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Snapchat token exchange failed:", errText);
      return Response.redirect(`${frontendUrl}/profile/import?error=token_exchange_failed`, 302);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Fetch user profile
    let snapUserId = null;
    let snapDisplayName = null;
    try {
      const profileRes = await fetch("https://kit.snapchat.com/v1/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        snapUserId = profile?.data?.me?.externalId || null;
        snapDisplayName = profile?.data?.me?.displayName || null;
      }
    } catch (e) {
      console.warn("Could not fetch Snapchat profile:", e);
    }

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(access_token);
    const encryptedRefreshToken = refresh_token ? await encryptToken(refresh_token) : null;

    // Upsert into social_connections
    const { error: upsertError } = await supabase.from("social_connections").upsert(
      {
        user_id: userId,
        platform: "snapchat",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        platform_user_id: snapUserId,
        platform_username: snapDisplayName,
      },
      { onConflict: "user_id,platform" }
    );

    if (upsertError) {
      console.error("Failed to save Snapchat connection:", upsertError);
      return Response.redirect(`${frontendUrl}/profile/import?error=save_failed`, 302);
    }

    return Response.redirect(`${frontendUrl}/profile/import?success=snapchat`, 302);
  } catch (err) {
    console.error("Snapchat OAuth callback error:", err);
    return Response.redirect(`${frontendUrl}/profile/import?error=unexpected`, 302);
  }
});
