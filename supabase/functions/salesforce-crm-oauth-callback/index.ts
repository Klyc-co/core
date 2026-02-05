import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/encryption.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Get the origin for redirect
    const origin = Deno.env.get("SITE_URL") || "https://klyc.ai";

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

    // Decode state
    let stateData: { userId: string; displayName: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return Response.redirect(
        `${origin}/profile/import?error=Invalid+state+parameter`,
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/salesforce-crm-oauth-callback`;

    // Exchange code for tokens
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
        }),
      }
    );

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
    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

    // Store in database
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase.from("crm_connections").insert({
      user_id: stateData.userId,
      provider: "salesforce",
      display_name: stateData.displayName || "Salesforce",
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

    return Response.redirect(`${origin}/profile/import?success=salesforce`, 302);
  } catch (error) {
    console.error("Salesforce OAuth callback error:", error);
    const origin = Deno.env.get("SITE_URL") || "https://klyc.ai";
    return Response.redirect(
      `${origin}/profile/import?error=${encodeURIComponent(error.message)}`,
      302
    );
  }
});
