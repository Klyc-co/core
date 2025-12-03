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
    console.log("Processing project:", projectId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Mock transcription - in production, call Whisper API
    const mockTranscript = [
      { start: 0, end: 5, text: "Welcome to today's episode where we discuss something truly fascinating." },
      { start: 5, end: 10, text: "The key insight here is that innovation drives everything forward." },
      { start: 10, end: 15, text: "When you think about it, the possibilities are truly endless." },
      { start: 15, end: 20, text: "Let me share with you three strategies that have worked incredibly well." },
      { start: 20, end: 25, text: "First, always focus on the customer's core needs and desires." },
      { start: 25, end: 30, text: "Second, iterate quickly and learn from every single failure." },
    ];

    // Estimate duration from transcript
    const duration = mockTranscript[mockTranscript.length - 1]?.end || 30;

    // Update project duration
    await supabase
      .from("projects")
      .update({ duration_seconds: duration })
      .eq("id", projectId);

    // Generate visual prompts using AI
    const segments = [];

    for (let i = 0; i < mockTranscript.length; i++) {
      const segment = mockTranscript[i];

      // Call Lovable AI to generate visual prompt
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a creative director creating AI B-roll. Write a 1-2 sentence visual description that matches the spoken content and works as vertical 9:16 B-roll. No text overlays, no music, just visuals. Be cinematic and specific.",
            },
            {
              role: "user",
              content: `Create a visual prompt for this transcript: "${segment.text}"`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI API error:", await aiResponse.text());
        throw new Error("Failed to generate visual prompt");
      }

      const aiData = await aiResponse.json();
      const visualPrompt = aiData.choices?.[0]?.message?.content || "Abstract flowing visuals with soft lighting.";

      segments.push({
        project_id: projectId,
        index: i,
        start_seconds: segment.start,
        end_seconds: segment.end,
        transcript_snippet: segment.text,
        visual_prompt: visualPrompt,
        use_broll: false,
        broll_status: "not_generated",
      });
    }

    // Insert all segments
    const { error: segmentsError } = await supabase.from("segments").insert(segments);

    if (segmentsError) {
      console.error("Segments insert error:", segmentsError);
      throw new Error("Failed to create segments");
    }

    // Update project status
    await supabase
      .from("projects")
      .update({ status: "ready_for_edit" })
      .eq("id", projectId);

    console.log("Project processed successfully:", projectId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Process video error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
