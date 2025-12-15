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
    let duration = 4;
    if (segmentDuration >= 7) duration = 8;
    else if (segmentDuration >= 5) duration = 6;

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

    const taskId = runwayData.id;
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 180;

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

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!videoUrl) {
      console.error("Video generation timed out for segment:", segmentId);
      await supabase.from("segments").update({ broll_status: "failed" }).eq("id", segmentId);
      return;
    }

    const { data: currentSegment } = await supabase
      .from("segments")
      .select("broll_status")
      .eq("id", segmentId)
      .single();

    if (currentSegment?.broll_status !== "generating") {
      console.log("Generation was cancelled for segment:", segmentId);
      return;
    }

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
    // Verify JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { segmentId, prompt } = await req.json();
    console.log("Generating B-roll for segment:", segmentId, "User:", user.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user owns the segment's project
    const { data: segment, error: segmentError } = await supabase
      .from("segments")
      .select("id, project_id")
      .eq("id", segmentId)
      .single();

    if (segmentError || !segment) {
      return new Response(JSON.stringify({ error: 'Segment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", segment.project_id)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to generating immediately
    await supabase
      .from("segments")
      .update({ broll_status: "generating" })
      .eq("id", segmentId);

    // Start background task
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(generateBrollTask(segmentId, prompt));
    } else {
      generateBrollTask(segmentId, prompt);
    }

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
