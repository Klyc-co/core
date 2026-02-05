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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { displayName } = await req.json();

    const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Salesforce client ID not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/salesforce-crm-oauth-callback`;

    // State contains user info for the callback
    const state = btoa(
      JSON.stringify({
        userId: user.id,
        displayName: displayName || "Salesforce",
      })
    );

    // Salesforce OAuth 2.0 authorization URL
    // Using login.salesforce.com for production, can use test.salesforce.com for sandbox
    const authUrl = new URL("https://login.salesforce.com/services/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    // Request offline access for refresh token
    authUrl.searchParams.set("scope", "api refresh_token");

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating Salesforce auth URL:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
