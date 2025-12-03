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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to generating
    await supabase
      .from("segments")
      .update({ broll_status: "generating" })
      .eq("id", segmentId);

    // MOCK: In production, call a video generation API like Runway, Pika, etc.
    // For now, we simulate with a placeholder video URL
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API delay

    // Mock video URL - in production this would be the generated video
    const mockVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

    // Update segment with generated video
    const { error: updateError } = await supabase
      .from("segments")
      .update({
        broll_status: "generated",
        broll_video_url: mockVideoUrl,
      })
      .eq("id", segmentId);

    if (updateError) {
      throw new Error("Failed to update segment");
    }

    console.log("B-roll generated for segment:", segmentId);

    return new Response(JSON.stringify({ videoUrl: mockVideoUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Generate B-roll error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Update status to failed
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { segmentId } = await req.json().catch(() => ({}));
    if (segmentId) {
      await supabase
        .from("segments")
        .update({ broll_status: "failed" })
        .eq("id", segmentId);
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
