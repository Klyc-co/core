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

    const { baseId, baseName, tableId, tableName, tableType, columnMappings, isSynced } = await req.json();

    if (!baseId || !tableId || !tableType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connection
    const { data: conn } = await supabase
      .from("airtable_connections")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn) {
      return new Response(JSON.stringify({ error: "Airtable not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertError } = await supabase
      .from("airtable_table_mappings")
      .upsert({
        user_id: user.id,
        connection_id: conn.id,
        airtable_base_id: baseId,
        airtable_base_name: baseName || null,
        airtable_table_id: tableId,
        airtable_table_name: tableName || null,
        table_type: tableType,
        column_mappings: columnMappings || {},
        is_synced: isSynced !== false,
      }, { onConflict: "user_id,airtable_base_id,airtable_table_id" });

    if (upsertError) {
      console.error("Save mapping error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save mapping" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Airtable save-mapping error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
