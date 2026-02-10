import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Get the origin for redirect
    const origin = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";

    if (error) {
      console.error("Salesforce OAuth error:", error, errorDescription);
      return Response.redirect(
        `${origin}/profile/import?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${origin}/profile/import?error=Missing+authorization+code+or+state`,
        302
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve the PKCE state from database
    const { data: pkceState, error: pkceError } = await supabase
      .from("oauth_pkce_states")
      .select("*")
      .eq("state", state)
      .eq("provider", "salesforce")
      .maybeSingle();

    if (pkceError || !pkceState) {
      console.error("PKCE state not found:", pkceError);
      return Response.redirect(
        `${origin}/profile/import?error=Invalid+or+expired+state+parameter`,
        302
      );
    }

    // Check if the state has expired
    if (new Date(pkceState.expires_at) < new Date()) {
      // Clean up expired state
      await supabase.from("oauth_pkce_states").delete().eq("id", pkceState.id);
      return Response.redirect(
        `${origin}/profile/import?error=Authorization+session+expired`,
        302
      );
    }

    const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
    const clientSecret = Deno.env.get("SALESFORCE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return Response.redirect(
        `${origin}/profile/import?error=Salesforce+credentials+not+configured`,
        302
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/salesforce-crm-oauth-callback`;

    // Exchange code for tokens with PKCE code_verifier
    const tokenResponse = await fetch(
      "https://login.salesforce.com/services/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code_verifier: pkceState.code_verifier,
        }),
      }
    );

    // Clean up the PKCE state (one-time use)
    await supabase.from("oauth_pkce_states").delete().eq("id", pkceState.id);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Salesforce token exchange failed:", errorData);
      return Response.redirect(
        `${origin}/profile/import?error=Failed+to+exchange+authorization+code`,
        302
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, instance_url, id } = tokenData;

    // Fetch user info from Salesforce
    let orgName = "Salesforce";
    try {
      const userInfoResponse = await fetch(id, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        orgName = userInfo.organization_id || "Salesforce";
      }
    } catch (e) {
      console.warn("Could not fetch Salesforce user info:", e);
    }

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(access_token);
    const encryptedRefreshToken = refresh_token ? await encryptToken(refresh_token) : null;

    // Store in database
    const { error: insertError } = await supabase.from("crm_connections").insert({
      user_id: pkceState.user_id,
      provider: "salesforce",
      display_name: pkceState.display_name || "Salesforce",
      status: "connected",
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      metadata: {
        instance_url,
        org_name: orgName,
      },
    });

    if (insertError) {
      console.error("Failed to save Salesforce connection:", insertError);
      return Response.redirect(
        `${origin}/profile/import?error=Failed+to+save+connection`,
        302
      );
    }

    return Response.redirect(`${origin}/profile/library?tab=crm&connected=salesforce`, 302);
  } catch (error) {
    console.error("Salesforce OAuth callback error:", error);
    const origin = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";
    return Response.redirect(
      `${origin}/profile/import?error=${encodeURIComponent(error.message)}`,
      302
    );
  }
});
