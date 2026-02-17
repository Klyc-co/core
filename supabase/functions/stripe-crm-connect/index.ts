import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { displayName, secretKey } = await req.json();

    if (!secretKey || !secretKey.startsWith("sk_")) {
      return new Response(
        JSON.stringify({ error: "Invalid Stripe secret key. It should start with 'sk_'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the key works by fetching account info
    const accountRes = await fetch("https://api.stripe.com/v1/account", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!accountRes.ok) {
      const err = await accountRes.json();
      return new Response(
        JSON.stringify({ error: err?.error?.message || "Invalid Stripe secret key." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const account = await accountRes.json();
    const encryptedKey = await encryptToken(secretKey);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: upsertError } = await supabaseAdmin
      .from("crm_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "stripe",
          display_name: displayName || "Stripe",
          status: "connected",
          access_token: encryptedKey,
          metadata: {
            stripe_account_id: account.id,
            business_name: account.business_profile?.name || account.display_name,
            country: account.country,
          },
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to save Stripe connection:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Stripe connect error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
