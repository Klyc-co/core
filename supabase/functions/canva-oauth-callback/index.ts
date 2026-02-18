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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const canvaClientId = Deno.env.get("CANVA_CLIENT_ID")!;
  const canvaClientSecret = Deno.env.get("CANVA_CLIENT_SECRET")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (error) {
    console.error("Canva OAuth error:", error);
    return Response.redirect(`${frontendUrl}/profile/import?error=canva_auth_failed`, 302);
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
      .eq("provider", "canva")
      .single();

    if (pkceError || !pkceData) {
      console.error("PKCE state not found:", pkceError);
      return Response.redirect(`${frontendUrl}/profile/import?error=invalid_state`, 302);
    }

    const userId = pkceData.user_id;
    const codeVerifier = pkceData.code_verifier;

    // Clean up the PKCE state
    await supabase.from("oauth_pkce_states").delete().eq("state", state);

    const redirectUri = `${supabaseUrl}/functions/v1/canva-oauth-callback`;

    // Exchange the code for tokens
    const tokenResponse = await fetch("https://api.canva.com/rest/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: canvaClientId,
        client_secret: canvaClientSecret,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", errText);
      return Response.redirect(`${frontendUrl}/profile/import?error=token_exchange_failed`, 302);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Fetch the user profile
    let canvaUserId = null;
    let canvaUsername = null;
    try {
      const profileRes = await fetch("https://api.canva.com/rest/v1/users/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        canvaUserId = profile?.user?.id || null;
        canvaUsername = profile?.user?.email || profile?.user?.display_name || null;
      }
    } catch (e) {
      console.warn("Could not fetch Canva profile:", e);
    }

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Upsert into social_connections
    const { error: upsertError } = await supabase.from("social_connections").upsert(
      {
        user_id: userId,
        platform: "canva",
        access_token,
        refresh_token: refresh_token || null,
        token_expires_at: tokenExpiresAt,
        platform_user_id: canvaUserId,
        platform_username: canvaUsername,
      },
      { onConflict: "user_id,platform" }
    );

    if (upsertError) {
      console.error("Failed to save Canva connection:", upsertError);
      return Response.redirect(`${frontendUrl}/profile/import?error=save_failed`, 302);
    }

    return Response.redirect(`${frontendUrl}/profile/import?canva=connected`, 302);
  } catch (err) {
    console.error("Canva OAuth callback error:", err);
    return Response.redirect(`${frontendUrl}/profile/import?error=unexpected`, 302);
  }
});
