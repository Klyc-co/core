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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

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

    // Step 1: Generate an image from the prompt using Lovable AI (Gemini image gen)
    console.log("Step 1: Generating image from prompt...");
    
    const imagePrompt = `${prompt}. Vertical 9:16 aspect ratio, cinematic, high quality, suitable for video B-roll.`;
    
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Image generation error:", imageResponse.status, errorText);
      throw new Error(`Image generation failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageUrl) {
      console.error("No image URL in response:", JSON.stringify(imageData));
      throw new Error("No image generated");
    }

    console.log("Image generated successfully, length:", generatedImageUrl.length);

    // Step 2: Use Runway to animate the image
    console.log("Step 2: Animating image with Runway...");
    
    const runwayResponse = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runwayKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen3a_turbo",
        promptImage: generatedImageUrl,
        promptText: prompt,
        duration: Math.min(Math.max(duration, 5), 10), // Runway: 5-10 seconds
        ratio: "720:1280", // Vertical 9:16
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
