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
    const { segmentId, transcript } = await req.json();
    console.log("Regenerating prompt for segment:", segmentId);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Lovable AI to generate new visual prompt
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
            content: "You are a creative director creating AI B-roll. Write a 1-2 sentence visual description that matches the spoken content and works as vertical 9:16 B-roll. No text overlays, no music, just visuals. Be cinematic, specific, and creative. Give a different interpretation than before.",
          },
          {
            role: "user",
            content: `Create a new visual prompt for this transcript: "${transcript}"`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate visual prompt");
    }

    const aiData = await aiResponse.json();
    const newPrompt = aiData.choices?.[0]?.message?.content || "Abstract flowing visuals with soft lighting.";

    // Update segment with new prompt
    const { error: updateError } = await supabase
      .from("segments")
      .update({ visual_prompt: newPrompt })
      .eq("id", segmentId);

    if (updateError) {
      throw new Error("Failed to update segment");
    }

    console.log("Prompt regenerated for segment:", segmentId);

    return new Response(JSON.stringify({ prompt: newPrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Regenerate prompt error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
