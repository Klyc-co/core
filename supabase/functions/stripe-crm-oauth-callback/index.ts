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

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://idea-to-idiom.lovable.app";

    if (error) {
      console.error("Stripe OAuth error:", error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendUrl}/profile/library?tab=crm&error=${encodeURIComponent(errorDescription || error)}`,
        },
      });
    }

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    let stateData: { userId: string; displayName: string };
    try {
      stateData = JSON.parse(atob(decodeURIComponent(state)));
    } catch {
      return new Response("Invalid state", { status: 400 });
    }

    const clientSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!clientSecret) {
      return new Response("Stripe secret key not configured", { status: 500 });
    }

    // Exchange code for access token via Stripe Connect
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${clientSecret}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Stripe token exchange failed:", errText);
      return new Response(`Token exchange failed: ${errText}`, { status: 400 });
    }

    const tokens = await tokenResponse.json();

    // tokens.access_token is the connected account's access token
    // tokens.stripe_user_id is the connected Stripe account ID
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: upsertError } = await supabaseAdmin
      .from("crm_connections")
      .upsert(
        {
          user_id: stateData.userId,
          provider: "stripe",
          display_name: stateData.displayName,
          status: "connected",
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          metadata: {
            stripe_user_id: tokens.stripe_user_id,
            stripe_publishable_key: tokens.stripe_publishable_key,
            scope: tokens.scope,
            token_type: tokens.token_type,
          },
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to save Stripe connection:", upsertError);
      return new Response(`Failed to save connection: ${upsertError.message}`, {
        status: 500,
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}/profile/library?tab=crm&connected=stripe`,
      },
    });
  } catch (err: unknown) {
    console.error("Stripe OAuth callback error:", err);
    return new Response(`OAuth error: ${(err as Error).message}`, { status: 500 });
  }
});
