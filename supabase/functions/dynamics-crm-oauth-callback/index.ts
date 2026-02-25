import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("FRONTEND_URL") || "https://idea-to-idiom.lovable.app";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("Dynamics 365 OAuth error:", error, errorDescription);
      return Response.redirect(
        `${siteUrl}/profile/import?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("ONEDRIVE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("ONEDRIVE_CLIENT_SECRET")!;

    if (!clientId || !clientSecret) {
      throw new Error("Dynamics 365 credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate state
    const { data: stateRecord, error: stateError } = await supabase
      .from("oauth_pkce_states")
      .select("user_id")
      .eq("state", state)
      .eq("provider", "dynamics")
      .maybeSingle();

    if (stateError || !stateRecord) {
      throw new Error("Invalid or expired state parameter");
    }

    const userId = stateRecord.user_id;

    // Clean up state
    await supabase.from("oauth_pkce_states").delete().eq("state", state);

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/dynamics-crm-oauth-callback`;
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "https://org.crm.dynamics.com/user_impersonation offline_access openid profile",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Dynamics 365 token exchange failed:", errorData);
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    console.log("Got Dynamics 365 tokens successfully");

    // Get user profile info from Microsoft Graph
    let profileInfo: any = null;
    try {
      const graphToken = tokens.access_token;
      // Try to get profile from Graph API using the ID token claims
      const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${graphToken}` },
      });
      if (profileResponse.ok) {
        profileInfo = await profileResponse.json();
      }
    } catch (e) {
      console.warn("Could not fetch profile:", e);
    }

    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store in crm_connections table
    const { error: upsertError } = await supabase
      .from("crm_connections")
      .upsert({
        user_id: userId,
        provider: "dynamics",
        display_name: "Microsoft Dynamics 365",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: tokenExpiresAt,
        status: "connected",
        metadata: {
          email: profileInfo?.mail || profileInfo?.userPrincipalName || null,
          display_name: profileInfo?.displayName || null,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      });

    if (upsertError) {
      console.error("Failed to store Dynamics 365 connection:", upsertError);
      throw new Error("Failed to save connection");
    }

    console.log("Dynamics 365 CRM connection saved for user:", userId);
    return Response.redirect(`${siteUrl}/profile/import?success=dynamics_crm`, 302);
  } catch (error: unknown) {
    console.error("Dynamics 365 callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.redirect(
      `${siteUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});
