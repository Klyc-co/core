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

    const { displayName, subdomain, apiKey } = await req.json();

    if (!subdomain || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Subdomain and API Key are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanSubdomain = subdomain.replace(/\.freshsales\.io\/?$/, "").replace(/^https?:\/\//, "").trim();

    // Validate by fetching current user info
    const testRes = await fetch(
      `https://${cleanSubdomain}.freshsales.io/api/settings/users/me`,
      {
        headers: {
          Authorization: `Token token=${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!testRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Invalid subdomain or API Key. Please check your credentials.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const meData = await testRes.json();

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await serviceClient
      .from("crm_connections")
      .insert({
        user_id: user.id,
        provider: "freshsales",
        display_name: displayName || "Freshsales",
        access_token: apiKey,
        status: "connected",
        metadata: {
          subdomain: cleanSubdomain,
          email: meData?.user?.email || null,
          display_name: meData?.user?.display_name || null,
        },
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Freshsales connect error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
