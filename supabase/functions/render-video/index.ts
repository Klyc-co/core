import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Segment {
  id: string;
  index: number;
  start_seconds: number;
  end_seconds: number;
  use_broll: boolean;
  broll_status: string;
  broll_video_url: string | null;
}

interface Project {
  id: string;
  original_video_url: string;
  duration_seconds: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let projectId: string | undefined;

  try {
    const body = await req.json();
    projectId = body.projectId;
    console.log("Rendering video for project:", projectId);

    if (!shotstackApiKey) {
      throw new Error("SHOTSTACK_API_KEY is not configured");
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Get segments
    const { data: segments, error: segmentsError } = await supabase
      .from("segments")
      .select("*")
      .eq("project_id", projectId)
      .order("index");

    if (segmentsError) {
      throw new Error("Failed to fetch segments");
    }

    // Validate all B-roll segments are generated
    const missingBroll = segments.filter(
      (s: Segment) => s.use_broll && s.broll_status !== "generated"
    );

    if (missingBroll.length > 0) {
      throw new Error(`${missingBroll.length} segment(s) still need B-roll generated`);
    }

    // Update status to rendering
    await supabase
      .from("projects")
      .update({ status: "rendering" })
      .eq("id", projectId);

    // Build Shotstack timeline
    const timeline = buildShotstackTimeline(project as Project, segments as Segment[]);
    console.log("Shotstack timeline:", JSON.stringify(timeline, null, 2));

    // Submit render to Shotstack
    const renderResponse = await fetch("https://api.shotstack.io/edit/v1/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": shotstackApiKey,
      },
      body: JSON.stringify(timeline),
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error("Shotstack render error:", errorText);
      throw new Error(`Shotstack render failed: ${renderResponse.status}`);
    }

    const renderData = await renderResponse.json();
    const renderId = renderData.response.id;
    console.log("Shotstack render started:", renderId);

    // Poll for completion (max 5 minutes)
    const finalVideoUrl = await pollForCompletion(renderId, shotstackApiKey);
    console.log("Final video URL:", finalVideoUrl);

    // Update project with final video
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        status: "complete",
        final_video_url: finalVideoUrl,
      })
      .eq("id", projectId);

    if (updateError) {
      throw new Error("Failed to update project");
    }

    console.log("Video rendered successfully for project:", projectId);

    return new Response(JSON.stringify({ videoUrl: finalVideoUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Render video error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Update status to ready_for_edit on failure
    if (projectId) {
      await supabase
        .from("projects")
        .update({ status: "ready_for_edit" })
        .eq("id", projectId);
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildShotstackTimeline(project: Project, segments: Segment[]) {
  // Calculate total duration from segments
  const totalDuration = segments.reduce((max, s) => Math.max(max, s.end_seconds), 0);
  
  // Build B-roll overlay clips (only for segments that use B-roll)
  const brollClips = segments
    .filter((segment) => segment.use_broll && segment.broll_video_url)
    .map((segment) => {
      const duration = segment.end_seconds - segment.start_seconds;
      return {
        asset: {
          type: "video",
          src: segment.broll_video_url,
          trim: 0,
          volume: 0, // Mute B-roll audio
        },
        start: segment.start_seconds,
        length: duration,
        fit: "cover",
      };
    });

  // Base track - full original video with audio, let fit:cover handle cropping
  const baseClip = {
    asset: {
      type: "video",
      src: project.original_video_url,
      volume: 1, // Keep original audio
    },
    start: 0,
    length: totalDuration,
    fit: "cover", // Auto-scale and crop to fill 9:16 frame
  };

  // Tracks: B-roll overlay on top, base video on bottom
  const tracks = [];
  
  // Only add B-roll track if there are B-roll clips
  if (brollClips.length > 0) {
    tracks.push({ clips: brollClips });
  }
  
  // Base video track (always present)
  tracks.push({ clips: [baseClip] });

  return {
    timeline: {
      background: "#000000",
      tracks,
    },
    output: {
      format: "mp4",
      resolution: "hd", // 1080p
      aspectRatio: "9:16", // Vertical video
      fps: 30,
    },
  };
}

async function pollForCompletion(renderId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  const pollInterval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(
      `https://api.shotstack.io/edit/v1/render/${renderId}`,
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    if (!statusResponse.ok) {
      console.error("Shotstack status check failed:", statusResponse.status);
      continue;
    }

    const statusData = await statusResponse.json();
    const status = statusData.response.status;
    console.log(`Render status (attempt ${i + 1}):`, status);

    if (status === "done") {
      return statusData.response.url;
    } else if (status === "failed") {
      throw new Error("Shotstack render failed: " + (statusData.response.error || "Unknown error"));
    }
    // Continue polling for "queued", "fetching", "rendering" statuses
  }

  throw new Error("Render timed out after 5 minutes");
}
