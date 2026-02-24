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

    const { displayName, instanceUrl, username, password } = await req.json();

    if (!instanceUrl || !username || !password) {
      return new Response(
        JSON.stringify({ error: "Instance URL, Username, and Password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanUrl = instanceUrl.replace(/\/+$/, "");

    // Authenticate via SugarCRM OAuth2 password grant
    const tokenRes = await fetch(`${cleanUrl}/rest/v11_5/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        client_id: "sugar",
        client_secret: "",
        username,
        password,
        platform: "api",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("SugarCRM auth failed:", errBody);
      return new Response(
        JSON.stringify({
          error: "Invalid credentials or instance URL. Please check and try again.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = await tokenRes.json();

    // Use service role to store the connection
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await serviceClient
      .from("crm_connections")
      .insert({
        user_id: user.id,
        provider: "sugarcrm",
        display_name: displayName || "SugarCRM",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        status: "connected",
        metadata: {
          instance_url: cleanUrl,
          username,
        },
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("SugarCRM connect error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
