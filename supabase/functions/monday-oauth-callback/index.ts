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
    console.error("Monday OAuth error:", error);
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

    console.log("Processing Monday callback for user:", userId);

    const MONDAY_CLIENT_ID = Deno.env.get("MONDAY_CLIENT_ID")!;
    const MONDAY_CLIENT_SECRET = Deno.env.get("MONDAY_CLIENT_SECRET")!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/monday-oauth-callback`;

    // Exchange code for token
    const tokenResponse = await fetch("https://auth.monday.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: MONDAY_CLIENT_ID,
        client_secret: MONDAY_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Monday token exchange status:", tokenResponse.status);

    if (!tokenData.access_token) {
      console.error("Monday token exchange failed:", tokenData);
      throw new Error(tokenData.error || "Failed to exchange code for token");
    }

    const accessToken = tokenData.access_token;

    // Get Monday.com user info via API
    const userInfoResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ query: "{ me { id name email } }" }),
    });
    const userInfoData = await userInfoResponse.json();
    const meData = userInfoData?.data?.me;

    const mondayUsername = meData?.name || "Monday User";
    const mondayUserId = meData?.id?.toString() || null;

    console.log("Monday user:", mondayUsername, mondayUserId);

    // Store in social_connections table
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const encryptedAccessToken = await encryptToken(accessToken);

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "monday",
        access_token: encryptedAccessToken,
        refresh_token: null,
        token_expires_at: null, // Monday tokens don't expire
        platform_user_id: mondayUserId,
        platform_username: mondayUsername,
        scopes: ["boards:read"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store Monday connection:", upsertError);
      throw new Error("Failed to save Monday connection");
    }

    console.log("Monday connection saved successfully");
    return Response.redirect(`${frontendUrl}/profile/import?success=monday`);

  } catch (err) {
    console.error("Monday callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`);
  }
});
