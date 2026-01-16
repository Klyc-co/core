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
  const errorDescription = url.searchParams.get("error_description");

  // Frontend redirect URL
  const frontendUrl = Deno.env.get("SITE_URL") || "https://klyc.ai";

  if (error) {
    console.error("Facebook OAuth error:", error, errorDescription);
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    console.error("Missing code or state");
    return Response.redirect(`${frontendUrl}/profile/import?error=missing_params`);
  }

  try {
    // Decode state
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;
    console.log("Processing callback for user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID")!;
    const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET")!;
    const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;

    // Exchange code for access token
    console.log("Exchanging code for token...");
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${clientSecret}` +
      `&code=${code}`
    );

    const tokenData = await tokenResponse.json();
    console.log("Token response status:", tokenResponse.status);

    if (!tokenData.access_token) {
      console.error("No access token in response:", tokenData);
      return Response.redirect(`${frontendUrl}/profile/import?error=token_exchange_failed`);
    }

    // Get long-lived token
    console.log("Getting long-lived token...");
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${clientId}` +
      `&client_secret=${clientSecret}` +
      `&fb_exchange_token=${tokenData.access_token}`
    );

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token || tokenData.access_token;
    const expiresIn = longLivedData.expires_in || 3600;

    // Get user's Pages
    console.log("Fetching user's Facebook Pages...");
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();
    console.log("Pages response:", JSON.stringify(pagesData, null, 2));

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error("No Facebook Pages found");
      return Response.redirect(`${frontendUrl}/profile/import?error=no_pages_found`);
    }

    // Use the first page
    const page = pagesData.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    console.log(`Found Page: ${pageName} (${pageId})`);

    // Store in database
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "facebook",
        access_token: pageAccessToken,
        platform_user_id: pageId,
        platform_username: pageName,
        token_expires_at: expiresAt,
        scopes: ["pages_show_list", "pages_read_engagement", "pages_read_user_content", "read_insights"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Error storing Facebook connection:", upsertError);
      return Response.redirect(`${frontendUrl}/profile/import?error=storage_failed`);
    }

    console.log("Facebook connection stored successfully");
    return Response.redirect(`${frontendUrl}/profile/import?success=facebook`);
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return Response.redirect(`${frontendUrl}/profile/import?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`);
  }
});
