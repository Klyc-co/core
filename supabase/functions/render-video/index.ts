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
    const { projectId } = await req.json();
    console.log("Rendering video for project:", projectId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project and segments
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

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
      (s: any) => s.use_broll && s.broll_status !== "generated"
    );

    if (missingBroll.length > 0) {
      throw new Error(`${missingBroll.length} segment(s) still need B-roll generated`);
    }

    // Update status to rendering
    await supabase
      .from("projects")
      .update({ status: "rendering" })
      .eq("id", projectId);

    // MOCK: In production, use ffmpeg to:
    // 1. Extract audio from original video
    // 2. For each segment, use either B-roll or cropped original
    // 3. Concatenate all clips
    // 4. Merge with original audio
    // 5. Output final 9:16 MP4

    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate rendering

    // Mock final video URL
    const finalVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4";

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

    console.log("Video rendered for project:", projectId);

    return new Response(JSON.stringify({ videoUrl: finalVideoUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Render video error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Update status to ready_for_edit on failure
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId } = await req.json().catch(() => ({}));
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
