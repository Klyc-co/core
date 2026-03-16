import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Word {
  text: string;
  start: number;
  end: number;
  confidence: number;
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

    const { projectId } = await req.json();
    console.log("Processing project:", projectId, "User:", user.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const assemblyKey = Deno.env.get("ASSEMBLYAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    if (project.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a signed URL so AssemblyAI can download the private video
    const videoPath = project.original_video_url;
    const { data: signedData, error: signedError } = await supabase.storage
      .from("videos")
      .createSignedUrl(videoPath, 3600); // 1 hour

    if (signedError || !signedData?.signedUrl) {
      console.error("Failed to create signed URL:", signedError);
      throw new Error("Failed to create signed URL for video");
    }

    const videoUrl = signedData.signedUrl;
    console.log("Transcribing video with signed URL");

    let transcript: any = null;
    let duration = 30; // default fallback
    let noAudio = false;

    // Step 1: Upload video to AssemblyAI for transcription
    try {
      const uploadResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          "Authorization": assemblyKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: videoUrl,
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
      let attempts = 0;
      const maxAttempts = 60;

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
          // Check if it's a "no audio" error — handle gracefully
          const errMsg = statusData.error || "";
          if (errMsg.includes("No audio") || errMsg.includes("audio stream")) {
            console.log("No audio stream found — proceeding with time-based segments");
            noAudio = true;
            break;
          }
          throw new Error(`Transcription failed: ${statusData.error}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      }

      if (!transcript && !noAudio) {
        throw new Error("Transcription timed out");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("No audio") || msg.includes("audio stream")) {
        console.log("No audio — falling back to time-based segments");
        noAudio = true;
      } else {
        throw err;
      }
    }

    if (transcript) {
      console.log("Transcription complete, duration:", transcript.audio_duration);
      console.log("Words count:", transcript.words?.length || 0);
      duration = transcript.audio_duration || 30;
    }

    // Update project duration
    await supabase
      .from("projects")
      .update({ duration_seconds: duration })
      .eq("id", projectId);

    // Step 3: Split transcript into ~5 second segments
    const words: Word[] = transcript?.words || [];
    const segmentDuration = 5;
    const segments: Array<{
      start_seconds: number;
      end_seconds: number;
      transcript_snippet: string;
      words_json: Array<{ text: string; start: number; end: number }>;
    }> = [];

    if (!noAudio && words.length > 0) {
      let currentSegment = {
        start_seconds: 0,
        end_seconds: 0,
        wordTexts: [] as string[],
        words: [] as Array<{ text: string; start: number; end: number }>,
      };

      for (const word of words) {
        const wordStart = word.start / 1000;
        const wordEnd = word.end / 1000;

        if (currentSegment.wordTexts.length === 0) {
          currentSegment.start_seconds = wordStart;
        }

        currentSegment.wordTexts.push(word.text);
        currentSegment.words.push({
          text: word.text,
          start: wordStart,
          end: wordEnd,
        });
        currentSegment.end_seconds = wordEnd;

        if (wordEnd - currentSegment.start_seconds >= segmentDuration) {
          segments.push({
            start_seconds: currentSegment.start_seconds,
            end_seconds: currentSegment.end_seconds,
            transcript_snippet: currentSegment.wordTexts.join(" "),
            words_json: currentSegment.words,
          });

          currentSegment = {
            start_seconds: 0,
            end_seconds: 0,
            wordTexts: [],
            words: [],
          };
        }
      }

      if (currentSegment.wordTexts.length > 0) {
        segments.push({
          start_seconds: currentSegment.start_seconds,
          end_seconds: currentSegment.end_seconds,
          transcript_snippet: currentSegment.wordTexts.join(" "),
          words_json: currentSegment.words,
        });
      }
    }

    if (segments.length === 0 && transcript?.text) {
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
          words_json: [],
        });
      }
    }

    // Fallback: no audio or no transcript text — create time-based segments
    if (segments.length === 0) {
      console.log("No transcript available — creating time-based segments");
      const segmentCount = Math.max(1, Math.ceil(duration / segmentDuration));
      for (let i = 0; i < segmentCount; i++) {
        const start = i * segmentDuration;
        const end = Math.min((i + 1) * segmentDuration, duration);
        segments.push({
          start_seconds: start,
          end_seconds: end,
          transcript_snippet: "(visual only)",
          words_json: [],
        });
      }
    }

    console.log(`Created ${segments.length} segments`);

    // Step 4: Generate visual prompts for each segment
    const dbSegments = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      console.log(`Generating prompt for segment ${i + 1}/${segments.length}`);

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
        words_json: segment.words_json,
      });
    }

    const { error: segmentsError } = await supabase.from("segments").insert(dbSegments);

    if (segmentsError) {
      console.error("Segments insert error:", segmentsError);
      throw new Error("Failed to create segments");
    }

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

    // Mark project as error so the UI can show it
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      const body = await req.clone().json().catch(() => ({}));
      if (body.projectId) {
        await sb.from("projects").update({ status: "error" }).eq("id", body.projectId);
      }
    } catch (_) { /* best effort */ }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
