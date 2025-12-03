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
    const assemblyKey = Deno.env.get("ASSEMBLYAI_API_KEY")!;

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

    console.log("Transcribing video:", project.original_video_url);

    // Step 1: Upload video to AssemblyAI for transcription
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": assemblyKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: project.original_video_url,
        speaker_labels: false,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("AssemblyAI upload error:", errorText);
      throw new Error("Failed to start transcription");
    }

    const transcriptData = await uploadResponse.json();
    const transcriptId = transcriptData.id;
    console.log("Transcription started:", transcriptId);

    // Step 2: Poll for transcription completion
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { "Authorization": assemblyKey },
      });

      const statusData = await statusResponse.json();
      console.log("Transcription status:", statusData.status);

      if (statusData.status === "completed") {
        transcript = statusData;
        break;
      } else if (statusData.status === "error") {
        throw new Error(`Transcription failed: ${statusData.error}`);
      }

      // Wait 5 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!transcript) {
      throw new Error("Transcription timed out");
    }

    console.log("Transcription complete, duration:", transcript.audio_duration);

    // Update project duration
    const duration = transcript.audio_duration || 30;
    await supabase
      .from("projects")
      .update({ duration_seconds: duration })
      .eq("id", projectId);

    // Step 3: Split transcript into ~5 second segments
    const words = transcript.words || [];
    const segmentDuration = 5; // seconds
    const segments: Array<{
      start_seconds: number;
      end_seconds: number;
      transcript_snippet: string;
    }> = [];

    let currentSegment = {
      start_seconds: 0,
      end_seconds: 0,
      words: [] as string[],
    };

    for (const word of words) {
      const wordStart = word.start / 1000; // Convert ms to seconds
      const wordEnd = word.end / 1000;

      if (currentSegment.words.length === 0) {
        currentSegment.start_seconds = wordStart;
      }

      currentSegment.words.push(word.text);
      currentSegment.end_seconds = wordEnd;

      // Check if we've reached segment duration
      if (wordEnd - currentSegment.start_seconds >= segmentDuration) {
        segments.push({
          start_seconds: currentSegment.start_seconds,
          end_seconds: currentSegment.end_seconds,
          transcript_snippet: currentSegment.words.join(" "),
        });

        currentSegment = {
          start_seconds: 0,
          end_seconds: 0,
          words: [],
        };
      }
    }

    // Push remaining words as final segment
    if (currentSegment.words.length > 0) {
      segments.push({
        start_seconds: currentSegment.start_seconds,
        end_seconds: currentSegment.end_seconds,
        transcript_snippet: currentSegment.words.join(" "),
      });
    }

    // If no words detected, create segments from full transcript
    if (segments.length === 0 && transcript.text) {
      const sentences = transcript.text.split(/[.!?]+/).filter((s: string) => s.trim());
      const segmentCount = Math.ceil(duration / segmentDuration);
      const sentencesPerSegment = Math.ceil(sentences.length / segmentCount);

      for (let i = 0; i < segmentCount; i++) {
        const start = i * segmentDuration;
        const end = Math.min((i + 1) * segmentDuration, duration);
        const segmentSentences = sentences.slice(
          i * sentencesPerSegment,
          (i + 1) * sentencesPerSegment
        );

        segments.push({
          start_seconds: start,
          end_seconds: end,
          transcript_snippet: segmentSentences.join(". ").trim() || "...",
        });
      }
    }

    console.log(`Created ${segments.length} segments`);

    // Step 4: Generate visual prompts for each segment using Lovable AI
    const dbSegments = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      console.log(`Generating prompt for segment ${i + 1}/${segments.length}`);

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
              content: `You are a creative director creating AI B-roll for vertical short-form videos. 
Write a concise 1-2 sentence visual description that:
- Matches the emotional tone and content of the transcript
- Works as vertical 9:16 B-roll footage
- Is cinematic and visually engaging
- Contains NO text overlays, NO music references, just pure visuals
- Describes specific scenes, lighting, camera movements, or subjects

Examples of good prompts:
- "Slow motion aerial shot of a city skyline at golden hour, with lens flares catching the setting sun."
- "Close-up of hands typing on a laptop keyboard, shallow depth of field, warm office lighting."
- "Time-lapse of clouds moving over mountains, dramatic shadows sweeping across valleys."`,
            },
            {
              role: "user",
              content: `Create a visual B-roll prompt for this transcript: "${segment.transcript_snippet}"`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI API error:", await aiResponse.text());
        throw new Error("Failed to generate visual prompt");
      }

      const aiData = await aiResponse.json();
      const visualPrompt = aiData.choices?.[0]?.message?.content || 
        "Smooth cinematic footage with soft lighting and gentle movement.";

      dbSegments.push({
        project_id: projectId,
        index: i,
        start_seconds: segment.start_seconds,
        end_seconds: segment.end_seconds,
        transcript_snippet: segment.transcript_snippet,
        visual_prompt: visualPrompt.replace(/^["']|["']$/g, "").trim(),
        use_broll: false,
        broll_status: "not_generated",
      });
    }

    // Insert all segments
    const { error: segmentsError } = await supabase.from("segments").insert(dbSegments);

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

    return new Response(JSON.stringify({ success: true, segmentCount: dbSegments.length }), {
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
