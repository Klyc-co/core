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

    const { displayName, accessToken, applicationId } = await req.json();

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Access token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the token works by fetching merchant info
    const merchantResponse = await fetch("https://connect.squareup.com/v2/merchants/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18",
        "Content-Type": "application/json",
      },
    });

    if (!merchantResponse.ok) {
      const errData = await merchantResponse.json();
      return new Response(
        JSON.stringify({ error: `Invalid Square access token: ${errData?.errors?.[0]?.detail || "Unauthorized"}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const merchantData = await merchantResponse.json();
    const merchant = merchantData.merchant;

    // Encrypt the token before storing
    const encryptedToken = await encryptToken(accessToken);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Upsert the CRM connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("crm_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "square",
          display_name: displayName || "Square",
          access_token: encryptedToken,
          status: "connected",
          metadata: {
            merchant_id: merchant?.id,
            business_name: merchant?.business_name,
            country: merchant?.country,
            currency: merchant?.currency,
            application_id: applicationId || null,
          },
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single();

    if (connError) {
      throw connError;
    }

    return new Response(
      JSON.stringify({ success: true, connectionId: connection.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error connecting Square:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
