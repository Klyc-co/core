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

    const segmentDuration = Math.ceil(segment.end_seconds - segment.start_seconds);
    // Runway veo3 only supports durations of 4, 6, or 8 seconds
    let duration = 4;
    if (segmentDuration >= 7) duration = 8;
    else if (segmentDuration >= 5) duration = 6;

    // Update status to generating
    await supabase
      .from("segments")
      .update({ broll_status: "generating" })
      .eq("id", segmentId);

    // Call Runway text-to-video API with veo3
    console.log("Calling Runway text-to-video API with veo3, duration:", duration);
    
    const runwayResponse = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runwayKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "veo3",
        promptText: prompt,
        duration: duration,
        ratio: "720:1280", // Vertical 9:16
        audio: false, // No audio needed, we use original
      }),
    });

    if (!runwayResponse.ok) {
      const errorText = await runwayResponse.text();
      console.error("Runway API error:", runwayResponse.status, errorText);
      
      await supabase
        .from("segments")
        .update({ broll_status: "failed" })
        .eq("id", segmentId);
      
      throw new Error(`Runway API error: ${runwayResponse.status} - ${errorText}`);
    }

    const runwayData = await runwayResponse.json();
    console.log("Runway task created:", runwayData.id);

    // Poll for completion
    const taskId = runwayData.id;
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
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
        throw new Error(`Video generation failed: ${statusData.failure || statusData.failureCode || "Unknown error"}`);
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

    console.log("B-roll generated successfully:", videoUrl);

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
