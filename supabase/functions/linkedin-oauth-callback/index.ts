import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Determine redirect base URL from state or fallback
  const fallbackUrl = "https://idea-to-idiom.lovable.app";

  const getRedirectBase = (stateStr: string | null): string => {
    try {
      if (stateStr) {
        const s = JSON.parse(atob(stateStr));
        return s.redirect_uri || fallbackUrl;
      }
    } catch {}
    return fallbackUrl;
  };

  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
    const base = getRedirectBase(stateParam);
    return Response.redirect(`${base}?oauth_error=${encodeURIComponent(errorDescription || error)}`, 302);
  }

  if (!code || !stateParam) {
    console.error("Missing code or state parameter");
    return Response.redirect(`${fallbackUrl}?oauth_error=missing_parameters`, 302);
  }

  let state: { user_id: string; redirect_uri: string };
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    return Response.redirect(`${fallbackUrl}?oauth_error=invalid_state`, 302);
  }

  const redirectBase = state.redirect_uri || fallbackUrl;

  try {
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      throw new Error("LinkedIn credentials not configured");
    }

    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth-callback`;

    // Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token error:", tokenData);
      throw new Error(tokenData.error_description || "Failed to get access token");
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;
    const refreshToken = tokenData.refresh_token || null;

    // Get user profile
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok) {
      console.error("Profile error:", profileData);
      throw new Error("Failed to get user profile");
    }

    const linkedinUserId = profileData.sub;
    const displayName = profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const encryptedAccessToken = await encryptToken(accessToken);

    // Store in social_connections (existing analytics/import flow)
    await supabase.from("social_connections").upsert(
      {
        user_id: state.user_id,
        platform: "linkedin",
        access_token: encryptedAccessToken,
        token_expires_at: expiresAt,
        platform_user_id: linkedinUserId,
        platform_username: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );

    // Store in client_platform_connections (posting flow)
    const { error: upsertError } = await supabase
      .from("client_platform_connections")
      .upsert(
        {
          client_id: state.user_id,
          platform: "linkedin",
          access_token: encryptedAccessToken,
          refresh_token: refreshToken ? await encryptToken(refreshToken) : null,
          token_expires_at: expiresAt,
          status: "active",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "client_id,platform" }
      );

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      throw new Error("Failed to save connection");
    }

    console.log(`LinkedIn connected for user ${state.user_id} (${displayName})`);

    return Response.redirect(`${redirectBase}?oauth_success=linkedin`, 302);
  } catch (err: unknown) {
    console.error("LinkedIn OAuth callback error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${redirectBase}?oauth_error=${encodeURIComponent(msg)}`, 302);
  }
});
