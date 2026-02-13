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

    const { displayName } = await req.json();

    const clientId = Deno.env.get("ZOHO_CLIENT_ID");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/zoho-crm-oauth-callback`;

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Zoho client ID not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const state = btoa(
      JSON.stringify({
        userId: user.id,
        displayName: displayName || "Zoho CRM",
      })
    );

    const scopes = [
      "ZohoCRM.modules.contacts.READ",
      "ZohoCRM.modules.deals.READ",
      "ZohoCRM.modules.accounts.READ",
    ].join(",");

    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${encodeURIComponent(scopes)}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&prompt=consent`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error generating Zoho auth URL:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
