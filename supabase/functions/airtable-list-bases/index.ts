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

    // Get stored token
    const { data: conn } = await supabase
      .from("airtable_connections")
      .select("api_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn?.api_token) {
      return new Response(JSON.stringify({ error: "Airtable not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { baseId } = body;

    if (baseId) {
      // Fetch tables for a specific base
      const tablesRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: { Authorization: `Bearer ${conn.api_token}` },
      });

      if (!tablesRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch tables. Check permissions." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tablesData = await tablesRes.json();
      const tables = (tablesData.tables || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        fields: (t.fields || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          description: f.description || null,
        })),
      }));

      // Also fetch existing mappings for this base
      const { data: mappings } = await supabase
        .from("airtable_table_mappings")
        .select("*")
        .eq("user_id", user.id)
        .eq("airtable_base_id", baseId);

      return new Response(JSON.stringify({ tables, mappings: mappings || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all bases
    const basesRes = await fetch("https://api.airtable.com/v0/meta/bases", {
      headers: { Authorization: `Bearer ${conn.api_token}` },
    });

    if (!basesRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch bases" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basesData = await basesRes.json();
    const bases = (basesData.bases || []).map((b: any) => ({
      id: b.id,
      name: b.name,
    }));

    // Fetch all existing mappings
    const { data: allMappings } = await supabase
      .from("airtable_table_mappings")
      .select("airtable_base_id, airtable_table_id, table_type, synced_record_count, is_synced")
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ bases, mappings: allMappings || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Airtable list-bases error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
