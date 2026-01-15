import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received callback from Zapier:", JSON.stringify(body, null, 2));

    const { automation_id, result_data, status } = body;

    if (!automation_id) {
      return new Response(JSON.stringify({ error: "Missing automation_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the automation record exists
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from("zapier_automation_results")
      .select("*")
      .eq("id", automation_id)
      .single();

    if (fetchError || !existingRecord) {
      console.error("Automation record not found:", automation_id);
      return new Response(JSON.stringify({ error: "Automation record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the automation record with the result
    const { error: updateError } = await supabaseAdmin
      .from("zapier_automation_results")
      .update({
        result_data: result_data || body,
        status: status || "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", automation_id);

    if (updateError) {
      console.error("Error updating automation record:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update automation record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully updated automation record:", automation_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Callback processed successfully",
        automation_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in zapier-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
