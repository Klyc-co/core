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

    // Get connection with token
    const { data: conn } = await supabase
      .from("airtable_connections")
      .select("id, api_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn?.api_token) {
      return new Response(JSON.stringify({ error: "Airtable not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all synced mappings
    const { data: mappings } = await supabase
      .from("airtable_table_mappings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_synced", true);

    if (!mappings || mappings.length === 0) {
      return new Response(JSON.stringify({ error: "No tables configured for sync" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const counts: Record<string, number> = {};

    for (const mapping of mappings) {
      try {
        let allRecords: any[] = [];
        let offset: string | undefined;

        // Paginate through all records
        do {
          const url = new URL(`https://api.airtable.com/v0/${mapping.airtable_base_id}/${mapping.airtable_table_id}`);
          if (offset) url.searchParams.set("offset", offset);
          url.searchParams.set("pageSize", "100");

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${conn.api_token}` },
          });

          if (!res.ok) {
            console.error(`Failed to fetch records for ${mapping.airtable_table_name}:`, await res.text());
            break;
          }

          const data = await res.json();
          allRecords = allRecords.concat(data.records || []);
          offset = data.offset;
        } while (offset);

        const columnMappings = (mapping.column_mappings as Record<string, string>) || {};

        // Transform records using column mappings
        for (const record of allRecords) {
          const mappedData: Record<string, any> = {};
          
          for (const [airtableField, klycField] of Object.entries(columnMappings)) {
            if (klycField && klycField !== "ignore" && record.fields[airtableField] !== undefined) {
              mappedData[klycField] = record.fields[airtableField];
            }
          }

          await supabase
            .from("airtable_synced_records")
            .upsert({
              user_id: user.id,
              mapping_id: mapping.id,
              airtable_base_id: mapping.airtable_base_id,
              airtable_table_id: mapping.airtable_table_id,
              airtable_record_id: record.id,
              table_type: mapping.table_type,
              mapped_data: mappedData,
              raw_record: record.fields,
              synced_at: new Date().toISOString(),
            }, { onConflict: "user_id,airtable_base_id,airtable_table_id,airtable_record_id" });
        }

        // Update mapping record count
        await supabase
          .from("airtable_table_mappings")
          .update({
            synced_record_count: allRecords.length,
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", mapping.id);

        const typeKey = mapping.table_type || "other";
        counts[typeKey] = (counts[typeKey] || 0) + allRecords.length;
      } catch (tableError) {
        console.error(`Error syncing table ${mapping.airtable_table_name}:`, tableError);
      }
    }

    // Update connection last sync
    await supabase
      .from("airtable_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Airtable sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
