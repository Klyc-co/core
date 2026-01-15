import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/14482432/ugwcaqi/";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaignDraftId, triggerType } = await req.json();

    if (!campaignDraftId || !triggerType) {
      return new Response(JSON.stringify({ error: "Missing campaignDraftId or triggerType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the campaign draft
    const { data: campaignDraft, error: draftError } = await supabase
      .from("campaign_drafts")
      .select("*")
      .eq("id", campaignDraftId)
      .single();

    if (draftError || !campaignDraft) {
      return new Response(JSON.stringify({ error: "Campaign draft not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch analytics data if requested
    let analyticsData = null;
    if (triggerType === "campaign_with_analytics" || triggerType === "all_data") {
      const { data: socialConnections } = await supabase
        .from("social_connections")
        .select("platform, platform_username")
        .eq("user_id", user.id);
      
      analyticsData = {
        connected_platforms: socialConnections || [],
      };
    }

    // Fetch competitor data if requested
    let competitorData = null;
    if (triggerType === "campaign_with_competitor" || triggerType === "all_data") {
      const { data: competitors } = await supabase
        .from("competitor_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("analyzed_at", { ascending: false })
        .limit(5);
      
      competitorData = competitors || [];
    }

    // Use service role to insert automation record
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create automation record
    const { data: automationRecord, error: insertError } = await supabaseAdmin
      .from("zapier_automation_results")
      .insert({
        user_id: user.id,
        campaign_draft_id: campaignDraftId,
        trigger_type: triggerType,
        payload_sent: {
          campaign: campaignDraft,
          analytics: analyticsData,
          competitors: competitorData,
        },
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating automation record:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create automation record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the payload for Zapier
    const zapierPayload = {
      automation_id: automationRecord.id,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      trigger_type: triggerType,
      callback_url: `${supabaseUrl}/functions/v1/zapier-callback`,
      campaign: {
        id: campaignDraft.id,
        idea: campaignDraft.campaign_idea,
        content_type: campaignDraft.content_type,
        target_audience: campaignDraft.target_audience,
        target_audience_description: campaignDraft.target_audience_description,
        video_script: campaignDraft.video_script,
        scene_prompts: campaignDraft.scene_prompts,
        post_caption: campaignDraft.post_caption,
        image_prompt: campaignDraft.image_prompt,
        article_outline: campaignDraft.article_outline,
        campaign_goals: campaignDraft.campaign_goals,
        campaign_objective: campaignDraft.campaign_objective,
        tags: campaignDraft.tags,
      },
      analytics: analyticsData,
      competitors: competitorData,
    };

    console.log("Sending to Zapier:", JSON.stringify(zapierPayload, null, 2));

    // Send to Zapier webhook
    const zapierResponse = await fetch(ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zapierPayload),
    });

    if (!zapierResponse.ok) {
      console.error("Zapier webhook error:", zapierResponse.status);
      
      // Update status to failed
      await supabaseAdmin
        .from("zapier_automation_results")
        .update({ status: "failed" })
        .eq("id", automationRecord.id);

      return new Response(JSON.stringify({ error: "Failed to trigger Zapier webhook" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to sent
    await supabaseAdmin
      .from("zapier_automation_results")
      .update({ status: "sent" })
      .eq("id", automationRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        automation_id: automationRecord.id,
        message: "Campaign data sent to Zapier successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in zapier-trigger:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
