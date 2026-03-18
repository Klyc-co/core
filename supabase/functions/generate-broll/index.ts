import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RunwayVideoOptions = {
  prompt: string;
  duration: number;
  ratio?: string;
  audio?: boolean;
};

type KlingVideoOptions = {
  prompt: string;
  duration?: "5" | "10";
  aspectRatio?: "16:9" | "9:16" | "1:1";
};

async function createRunwayVideoTask({
  prompt,
  duration,
  ratio = "720:1280",
  audio = false,
}: RunwayVideoOptions) {
  const runwayKey = Deno.env.get("RUNWAY_API_KEY");

  if (!runwayKey) {
    throw new Error("RUNWAY_API_KEY is not configured");
  }

  const runwayResponse = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runwayKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: "veo3.1",
      promptText: prompt,
      duration,
      ratio,
      audio,
    }),
  });

  if (!runwayResponse.ok) {
    const errorText = await runwayResponse.text();
    console.error("Runway API error:", runwayResponse.status, errorText);

    if (runwayResponse.status === 401) {
      throw new Error("Invalid Runway API key.");
    }
    if (runwayResponse.status === 429) {
      throw new Error("Runway rate limit exceeded. Please try again later.");
    }

    throw new Error(`Runway video generation failed: ${runwayResponse.status}`);
  }

  const runwayData = await runwayResponse.json();
  console.log("Runway task created:", runwayData.id);
  return runwayData.id as string;
}

async function pollRunwayVideoTask(taskId: string) {
  const runwayKey = Deno.env.get("RUNWAY_API_KEY");

  if (!runwayKey) {
    throw new Error("RUNWAY_API_KEY is not configured");
  }

  let attempts = 0;
  const maxAttempts = 180;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${runwayKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Runway poll error:", statusResponse.status, errorText);
      throw new Error(`Failed to check Runway task status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log("Runway task status:", statusData.status);

    if (statusData.status === "SUCCEEDED") {
      const videoUrl = statusData.output?.[0];
      if (!videoUrl) {
        throw new Error("Runway task succeeded but no video was returned.");
      }
      return videoUrl as string;
    }

    if (statusData.status === "FAILED") {
      throw new Error(statusData.failure || statusData.failureCode || "Runway video generation failed.");
    }

    if (statusData.status === "CANCELLED") {
      throw new Error("Runway video generation was cancelled.");
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Runway video generation timed out. Please try again.");
}

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createKlingJwtToken() {
  const accessKey = Deno.env.get("KLING_ACCESS_KEY");
  const secretKey = Deno.env.get("KLING_SECRET_KEY");
  const legacyApiKey = Deno.env.get("KLING_API_KEY");

  if (accessKey && secretKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = encodeBase64Url(JSON.stringify({
      iss: accessKey,
      exp: now + 1800,
      nbf: now - 5,
    }));
    const signingInput = `${header}.${payload}`;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(signingInput),
    );

    return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
  }

  if (legacyApiKey) {
    return legacyApiKey;
  }

  throw new Error("Kling credentials are not configured");
}

async function createKlingVideoTask({
  prompt,
  duration = "5",
  aspectRatio = "16:9",
}: KlingVideoOptions) {
  const klingToken = await createKlingJwtToken();

  const klingResponse = await fetch("https://api-singapore.klingai.com/v1/videos/text2video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${klingToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "kling-v2-6",
      prompt,
      negative_prompt: "",
      duration,
      mode: "std",
      sound: "off",
      aspect_ratio: aspectRatio,
    }),
  });

  if (!klingResponse.ok) {
    const errorText = await klingResponse.text();
    console.error("Kling API error:", klingResponse.status, errorText);

    if (klingResponse.status === 401) {
      throw new Error("Invalid Kling credentials.");
    }
    if (klingResponse.status === 429) {
      throw new Error("Kling rate limit exceeded. Please try again later.");
    }

    throw new Error(`Kling video generation failed: ${klingResponse.status}`);
  }

  const klingData = await klingResponse.json();
  const taskId = klingData?.data?.task_id;

  if (!taskId) {
    throw new Error("Kling did not return a task ID.");
  }

  console.log("Kling task created:", taskId);
  return taskId as string;
}

async function pollKlingVideoTask(taskId: string) {
  const klingToken = await createKlingJwtToken();

  let attempts = 0;
  const maxAttempts = 180;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(`https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`, {
      headers: {
        Authorization: `Bearer ${klingToken}`,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Kling poll error:", statusResponse.status, errorText);
      throw new Error(`Failed to check Kling task status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    const taskStatus = statusData?.data?.task_status;
    console.log("Kling task status:", taskStatus);

    if (taskStatus === "succeed") {
      const videoUrl = statusData?.data?.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        throw new Error("Kling task succeeded but no video was returned.");
      }
      return videoUrl as string;
    }

    if (taskStatus === "failed") {
      throw new Error(statusData?.data?.task_status_msg || "Kling video generation failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Kling video generation timed out. Please try again.");
}

function getSegmentDuration(segment: { start_seconds: number; end_seconds: number }) {
  const segmentDuration = Math.ceil(segment.end_seconds - segment.start_seconds);
  if (segmentDuration >= 7) return 8;
  if (segmentDuration >= 5) return 6;
  return 4;
}

async function generateBrollTask(segmentId: string, prompt: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const duration = getSegmentDuration(segment);
    console.log("Calling Runway API for segment:", segmentId, "duration:", duration);

    const taskId = await createRunwayVideoTask({ prompt, duration });
    const videoUrl = await pollRunwayVideoTask(taskId);

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { segmentId, prompt, standalone, model = "runway" } = await req.json();

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["runway", "kling"].includes(model)) {
      return new Response(JSON.stringify({ error: "Unsupported video model" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (standalone) {
      console.log(`Generating standalone ${model} video for user:`, user.id);
      const videoUrl = model === "kling"
        ? await pollKlingVideoTask(await createKlingVideoTask({ prompt }))
        : await pollRunwayVideoTask(await createRunwayVideoTask({ prompt, duration: 4 }));

      return new Response(JSON.stringify({
        message: "Video generated successfully",
        model,
        videoUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (model !== "runway") {
      return new Response(JSON.stringify({ error: "Kling is currently available for standalone clip generation only" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!segmentId) {
      return new Response(JSON.stringify({ error: "Segment ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating B-roll for segment:", segmentId, "User:", user.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: segment, error: segmentError } = await supabase
      .from("segments")
      .select("id, project_id")
      .eq("id", segmentId)
      .single();

    if (segmentError || !segment) {
      return new Response(JSON.stringify({ error: "Segment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", segment.project_id)
      .single();

    if (projectError || !project || project.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("segments").update({ broll_status: "generating" }).eq("id", segmentId);

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(generateBrollTask(segmentId, prompt));
    } else {
      generateBrollTask(segmentId, prompt);
    }

    return new Response(JSON.stringify({
      message: "Generation started",
      segmentId,
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
