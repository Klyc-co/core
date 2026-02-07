import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const frontendUrl = Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";

    if (error) {
      console.error("Notion OAuth error:", error);
      return Response.redirect(
        `${frontendUrl}/profile/import?error=${encodeURIComponent(error)}`,
        302
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${frontendUrl}/profile/import?error=Missing+code+or+state`,
        302
      );
    }

    // Decode state
    let stateData: { user_id: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return Response.redirect(
        `${frontendUrl}/profile/import?error=Invalid+state`,
        302
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("NOTION_CLIENT_ID")!;
    const clientSecret = Deno.env.get("NOTION_CLIENT_SECRET")!;

    if (!clientId || !clientSecret) {
      return Response.redirect(
        `${frontendUrl}/profile/import?error=Notion+credentials+not+configured`,
        302
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/notion-oauth-callback`;

    // Exchange code for access token
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Notion token exchange failed:", errorData);
      return Response.redirect(
        `${frontendUrl}/profile/import?error=Failed+to+exchange+token`,
        302
      );
    }

    const tokens = await tokenResponse.json();
    console.log("Got Notion tokens successfully, workspace:", tokens.workspace_name);

    // Encrypt the access token
    const encryptedAccessToken = await encryptToken(tokens.access_token);

    // Store in social_connections
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: stateData.user_id,
        platform: "notion",
        access_token: encryptedAccessToken,
        platform_user_id: tokens.owner?.user?.id || tokens.bot_id,
        platform_username: tokens.workspace_name,
        scopes: ["read_content"],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });

    if (upsertError) {
      console.error("Failed to store Notion connection:", upsertError);
      return Response.redirect(
        `${frontendUrl}/profile/import?error=Failed+to+store+connection`,
        302
      );
    }

    return Response.redirect(
      `${frontendUrl}/profile/import?success=notion`,
      302
    );
  } catch (error: unknown) {
    console.error("Notion callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const frontendUrl = Deno.env.get("SITE_URL") || "https://idea-to-idiom.lovable.app";
    return Response.redirect(
      `${frontendUrl}/profile/import?error=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});
