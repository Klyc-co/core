import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, apiToken } = await req.json();

    if (action === "connect") {
      if (!apiToken) {
        return new Response(JSON.stringify({ error: "API token is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate the token by calling Airtable meta API
      const metaRes = await fetch("https://api.airtable.com/v0/meta/bases", {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      if (!metaRes.ok) {
        const errText = await metaRes.text();
        console.error("Airtable validation failed:", errText);
        return new Response(JSON.stringify({ error: "Invalid Airtable API token. Please check your token and try again." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metaData = await metaRes.json();
      const baseCount = metaData.bases?.length || 0;

      // Upsert connection
      const { error: upsertError } = await supabase
        .from("airtable_connections")
        .upsert({
          user_id: user.id,
          api_token: apiToken,
          display_name: "Airtable",
          connection_status: "connected",
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save connection" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, baseCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      // Delete connection (cascade will remove mappings & records)
      await supabase.from("airtable_connections").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data: conn } = await supabase
        .from("airtable_connections")
        .select("id, connection_status, last_sync_at, sync_frequency, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(JSON.stringify({ connection: conn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_sync_frequency") {
      const { frequency } = await req.json().catch(() => ({}));
      // frequency already parsed above with action
      const body = JSON.parse(await new Response(req.body).text().catch(() => "{}"));
      
      await supabase
        .from("airtable_connections")
        .update({ sync_frequency: body.frequency || "manual" })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Airtable connect error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
