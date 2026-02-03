import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Determine redirect base URL
  const frontendUrl = "https://klyc.ai";
  const fallbackUrl = "https://idea-to-idiom.lovable.app";

  const getRedirectUrl = (path: string) => {
    return `${frontendUrl}${path}`;
  };

  // Handle errors from LinkedIn
  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
    return Response.redirect(
      getRedirectUrl(`/profile/import?error=${encodeURIComponent(errorDescription || error)}`),
      302
    );
  }

  if (!code || !state) {
    console.error("Missing code or state parameter");
    return Response.redirect(
      getRedirectUrl("/profile/import?error=missing_parameters"),
      302
    );
  }

  try {
    // Decode state to get user_id
    const decodedState = JSON.parse(atob(state));
    const userId = decodedState.user_id;

    if (!userId) {
      throw new Error("No user_id in state");
    }

    // Get LinkedIn credentials
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      throw new Error("LinkedIn credentials not configured");
    }

    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth-callback`;

    // Exchange code for access token
    console.log("Exchanging code for access token...");
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error("Token error:", tokenData);
      throw new Error(tokenData.error_description || tokenData.error || "Failed to get access token");
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Get user profile using OpenID Connect userinfo endpoint
    console.log("Fetching user profile...");
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();
    console.log("Profile response status:", profileResponse.status);

    if (!profileResponse.ok) {
      console.error("Profile error:", profileData);
      throw new Error("Failed to get user profile");
    }

    // Extract user info from OpenID Connect response
    const linkedinUserId = profileData.sub;
    const displayName = profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim();

    // Store the connection in Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt the access token before storing
    const encryptedAccessToken = await encryptToken(accessToken);

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert(
        {
          user_id: userId,
          platform: "linkedin",
          access_token: encryptedAccessToken,
          token_expires_at: expiresAt,
          platform_user_id: linkedinUserId,
          platform_username: displayName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,platform",
        }
      );

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to save connection");
    }

    console.log("LinkedIn connection saved successfully for user:", userId);

    return Response.redirect(
      getRedirectUrl("/profile/import?success=linkedin"),
      302
    );
  } catch (err: unknown) {
    console.error("LinkedIn OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(
      getRedirectUrl(`/profile/import?error=${encodeURIComponent(message)}`),
      302
    );
  }
});
