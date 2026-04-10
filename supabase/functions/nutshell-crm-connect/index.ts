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

    const { displayName, email, apiKey } = await req.json();

    if (!email || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Email and API Key are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate credentials via Nutshell JSON-RPC API
    const testRes = await fetch("https://app.nutshell.com/api/v1/json", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(email + ":" + apiKey)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "getUser",
        id: "auth-test",
      }),
    });

    if (!testRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Invalid Email or API Key. Please check your credentials.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rpcResult = await testRes.json();

    if (rpcResult.error) {
      return new Response(
        JSON.stringify({
          error: (rpcResult.error as Record<string, unknown>)?.message || "Authentication failed. Check your credentials.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await serviceClient
      .from("crm_connections")
      .insert({
        user_id: user.id,
        provider: "nutshell",
        display_name: displayName || "Nutshell CRM",
        access_token: apiKey,
        status: "connected",
        metadata: {
          email,
          user_name: rpcResult.result?.name || null,
        },
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Nutshell CRM connect error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
