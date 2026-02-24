import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { displayName, apiKey, email } = await req.json();

    if (!apiKey || !email) {
      return new Response(
        JSON.stringify({ error: "API Key and Email are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate credentials by making a test request
    const testRes = await fetch("https://api.copper.com/developer_api/v1/account", {
      method: "GET",
      headers: {
        "X-PW-AccessToken": apiKey,
        "X-PW-Application": "developer_api",
        "X-PW-UserEmail": email,
        "Content-Type": "application/json",
      },
    });

    if (!testRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Invalid API Key or Email. Please check your credentials.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountData = await testRes.json();

    // Use service role to store the connection
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await serviceClient
      .from("crm_connections")
      .insert({
        user_id: user.id,
        provider: "copper",
        display_name: displayName || "Copper CRM",
        access_token: apiKey,
        status: "connected",
        metadata: {
          email,
          account_name: accountData?.name || null,
        },
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Copper CRM connect error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
