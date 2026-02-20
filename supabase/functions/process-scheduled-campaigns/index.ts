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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find campaigns that are due (scheduled_date + scheduled_time <= now)
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

    // Get all scheduled campaigns that are due
    const { data: dueCampaigns, error: fetchError } = await supabaseAdmin
      .from("scheduled_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .or(`scheduled_date.lt.${currentDate},and(scheduled_date.eq.${currentDate},scheduled_time.lte.${currentTime})`);

    if (fetchError) {
      console.error("Error fetching due campaigns:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueCampaigns || dueCampaigns.length === 0) {
      console.log("No due campaigns found");
      return new Response(JSON.stringify({ message: "No campaigns due", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${dueCampaigns.length} due campaigns`);
    const results: Array<{ campaignId: string; status: string; error?: string }> = [];

    for (const campaign of dueCampaigns) {
      try {
        // Mark as publishing to prevent duplicate processing
        await supabaseAdmin
          .from("scheduled_campaigns")
          .update({ status: "publishing" })
          .eq("id", campaign.id);

        // Create post_queue entry
        const { data: postQueue, error: pqError } = await supabaseAdmin
          .from("post_queue")
          .insert({
            user_id: campaign.user_id,
            post_text: campaign.campaign_name,
            content_type: "text",
            status: "draft",
          })
          .select()
          .single();

        if (pqError || !postQueue) {
          throw new Error(pqError?.message || "Failed to create post queue entry");
        }

        // Create platform targets
        const targets = (campaign.platforms as string[]).map((platform: string) => ({
          post_queue_id: postQueue.id,
          platform,
          status: "pending",
        }));

        const { error: targetError } = await supabaseAdmin
          .from("post_platform_targets")
          .insert(targets);

        if (targetError) {
          throw new Error(targetError.message);
        }

        // Call publish-post function internally
        const publishRes = await fetch(`${supabaseUrl}/functions/v1/publish-post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ postQueueId: postQueue.id }),
        });

        const publishData = await publishRes.json();

        // Update campaign status
        const finalStatus = publishData.status || (publishRes.ok ? "published" : "failed");
        await supabaseAdmin
          .from("scheduled_campaigns")
          .update({ status: finalStatus })
          .eq("id", campaign.id);

        results.push({ campaignId: campaign.id, status: finalStatus });
        console.log(`Campaign ${campaign.id} processed: ${finalStatus}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Campaign ${campaign.id} failed:`, errorMsg);

        await supabaseAdmin
          .from("scheduled_campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);

        results.push({ campaignId: campaign.id, status: "failed", error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${results.length} campaigns`, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-scheduled-campaigns:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
