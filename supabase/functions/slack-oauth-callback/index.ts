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

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || 
    (SUPABASE_URL.includes("yfhuhcopgddbuecsrbje") 
      ? "https://idea-to-idiom.lovable.app" 
      : "http://localhost:5173");

  if (error) {
    console.error("Slack OAuth error:", error);
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error("Missing code or state");
    return Response.redirect(`${frontendUrl}/profile/import?error=missing_params`);
  }

  try {
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    if (!userId) {
      throw new Error("No user_id in state");
    }

    console.log("Processing Slack callback for user:", userId);

    const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID")!;
    const SLACK_CLIENT_SECRET = Deno.env.get("SLACK_CLIENT_SECRET")!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/slack-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Slack token exchange ok:", tokenData.ok);

    if (!tokenData.ok || !tokenData.access_token) {
      console.error("Slack token exchange failed:", tokenData);
      throw new Error(tokenData.error || "Failed to exchange code for token");
    }

    const accessToken = tokenData.access_token;

    // Get Slack team/user info from the token response
    const slackTeamName = tokenData.team?.name || null;
    const slackUserId = tokenData.authed_user?.id || null;

    // Optionally get user info
    let slackUsername = slackTeamName;
    if (slackUserId) {
      try {
        const userInfoResponse = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await userInfoResponse.json();
        if (userInfo.ok && userInfo.user) {
          slackUsername = userInfo.user.real_name || userInfo.user.name || slackTeamName;
        }
      } catch (e) {
        console.warn("Could not fetch Slack user info:", e);
      }
    }

    // Store in social_connections table
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const encryptedAccessToken = await encryptToken(accessToken);

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "slack",
        access_token: encryptedAccessToken,
        refresh_token: null,
        token_expires_at: null, // Slack bot tokens don't expire
        platform_user_id: slackUserId || tokenData.team?.id,
        platform_username: slackUsername,
        scopes: tokenData.scope ? tokenData.scope.split(",") : ["channels:read", "users:read", "files:read", "chat:write"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store Slack connection:", upsertError);
      throw new Error("Failed to save Slack connection");
    }

    console.log("Slack connection saved successfully");
    return Response.redirect(`${frontendUrl}/profile/import?success=slack`);

  } catch (err) {
    console.error("Slack callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`);
  }
});
