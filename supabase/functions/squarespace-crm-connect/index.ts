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

    const body = await req.json();
    const { displayName, apiKey, siteId } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the API key by fetching site info from Squarespace API
    const sitesResponse = await fetch("https://api.squarespace.com/1.0/authorization/website", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Klyc/1.0",
      },
    });

    let siteName = "Squarespace";
    let resolvedSiteId = siteId || null;

    if (!sitesResponse.ok) {
      const errData = await sitesResponse.text();
      console.error("Squarespace API validation failed:", errData, "status:", sitesResponse.status);
      return new Response(
        JSON.stringify({ error: "Invalid Squarespace API key. Please check your credentials and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteData = await sitesResponse.json();
    siteName = siteData?.websiteProfile?.siteTitle || siteData?.identifier?.externalId || "Squarespace";
    resolvedSiteId = siteData?.identifier?.externalId || resolvedSiteId;

    // Encrypt the token before storing
    const encryptedToken = await encryptToken(apiKey);

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
          provider: "squarespace",
          display_name: displayName || siteName || "Squarespace",
          access_token: encryptedToken,
          status: "connected",
          metadata: {
            site_id: resolvedSiteId,
            site_name: siteName,
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
      JSON.stringify({ success: true, connectionId: connection.id, siteName }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error connecting Squarespace:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
