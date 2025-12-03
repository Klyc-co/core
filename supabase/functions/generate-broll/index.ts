import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Background task to generate B-roll
async function generateBrollTask(segmentId: string, prompt: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const runwayKey = Deno.env.get("RUNWAY_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get segment to determine duration
    const { data: segment, error: segmentError } = await supabase
      .from("segments")
      .select("*")
      .eq("id", segmentId)
      .single();

    if (segmentError || !segment) {
      console.error("Segment not found:", segmentId);
      await supabase.from("segments").update({ broll_status: "failed" }).eq("id", segmentId);
      return;
    }

    const segmentDuration = Math.ceil(segment.end_seconds - segment.start_seconds);
    // Runway veo3 only supports durations of 4, 6, or 8 seconds
    let duration = 4;
    if (segmentDuration >= 7) duration = 8;
    else if (segmentDuration >= 5) duration = 6;

    // Call Runway text-to-video API with veo3.1
    console.log("Calling Runway API for segment:", segmentId, "duration:", duration);
    
    const runwayResponse = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runwayKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "veo3.1",
        promptText: prompt,
        duration: duration,
        ratio: "720:1280",
        audio: false,
      }),
    });

    if (!runwayResponse.ok) {
      const errorText = await runwayResponse.text();
      console.error("Runway API error:", runwayResponse.status, errorText);
      await supabase.from("segments").update({ broll_status: "failed" }).eq("id", segmentId);
      return;
    }

    const runwayData = await runwayResponse.json();
    console.log("Runway task created:", runwayData.id);

    // Poll for completion
    const taskId = runwayData.id;
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 180; // 15 minutes max (180 * 5 seconds)

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
        console.error("Video generation failed:", statusData.failure || statusData.failureCode);
        await supabase.from("segments").update({ broll_status: "failed" }).eq("id", segmentId);
        return;
      }
      // THROTTLED and RUNNING are normal states - keep polling

      // Wait 5 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!videoUrl) {
      console.error("Video generation timed out for segment:", segmentId);
      await supabase.from("segments").update({ broll_status: "failed" }).eq("id", segmentId);
      return;
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
      console.error("Failed to update segment:", updateError);
      return;
    }

    console.log("B-roll generated successfully for segment:", segmentId, videoUrl);
  } catch (error) {
    console.error("Generate B-roll error:", error);
    await supabase.from("segments").update({ broll_status: "failed" }).eq("id", segmentId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segmentId, prompt } = await req.json();
    console.log("Generating B-roll for segment:", segmentId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to generating immediately
    await supabase
      .from("segments")
      .update({ broll_status: "generating" })
      .eq("id", segmentId);

    // Start background task - don't await it
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(generateBrollTask(segmentId, prompt));
    } else {
      // Fallback for environments without waitUntil
      generateBrollTask(segmentId, prompt);
    }

    // Return immediately - the task runs in background
    return new Response(JSON.stringify({ 
      message: "Generation started",
      segmentId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Generate B-roll error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
