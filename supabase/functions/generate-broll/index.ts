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
    const { segmentId, prompt } = await req.json();
    console.log("Generating B-roll for segment:", segmentId);
    console.log("Prompt:", prompt);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const runwayKey = Deno.env.get("RUNWAY_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get segment to determine duration
    const { data: segment, error: segmentError } = await supabase
      .from("segments")
      .select("*")
      .eq("id", segmentId)
      .single();

    if (segmentError || !segment) {
      throw new Error("Segment not found");
    }

    const duration = Math.ceil(segment.end_seconds - segment.start_seconds);

    // Update status to generating
    await supabase
      .from("segments")
      .update({ broll_status: "generating" })
      .eq("id", segmentId);

    // Call Runway API to generate video
    // Runway Gen-3 Alpha Turbo endpoint
    const runwayResponse = await fetch("https://api.runwayml.com/v1/text-to-video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runwayKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen3a_turbo",
        promptText: prompt,
        duration: Math.min(duration, 10), // Runway max is 10 seconds
        ratio: "9:16", // Vertical format
        watermark: false,
      }),
    });

    if (!runwayResponse.ok) {
      const errorText = await runwayResponse.text();
      console.error("Runway API error:", runwayResponse.status, errorText);
      
      // If Runway fails, use a fallback approach
      // Update with placeholder for now
      await supabase
        .from("segments")
        .update({
          broll_status: "failed",
        })
        .eq("id", segmentId);
      
      throw new Error(`Runway API error: ${runwayResponse.status}`);
    }

    const runwayData = await runwayResponse.json();
    console.log("Runway response:", runwayData);

    // Runway returns a task ID, we need to poll for completion
    const taskId = runwayData.id;
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${runwayKey}`,
          "X-Runway-Version": "2024-11-06",
        },
      });

      const statusData = await statusResponse.json();
      console.log("Runway task status:", statusData.status);

      if (statusData.status === "SUCCEEDED") {
        videoUrl = statusData.output?.[0];
        break;
      } else if (statusData.status === "FAILED") {
        throw new Error(`Video generation failed: ${statusData.error || "Unknown error"}`);
      }

      // Wait 5 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!videoUrl) {
      throw new Error("Video generation timed out");
    }

    // Update segment with generated video
    const { error: updateError } = await supabase
      .from("segments")
      .update({
        broll_status: "generated",
        broll_video_url: videoUrl,
      })
      .eq("id", segmentId);

    if (updateError) {
      throw new Error("Failed to update segment");
    }

    console.log("B-roll generated for segment:", segmentId);

    return new Response(JSON.stringify({ videoUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Generate B-roll error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Try to update status to failed
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const body = await req.clone().json().catch(() => ({}));
      if (body.segmentId) {
        await supabase
          .from("segments")
          .update({ broll_status: "failed" })
          .eq("id", body.segmentId);
      }
    } catch (e) {
      console.error("Failed to update segment status:", e);
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
