// Strategy Image Generator
// Generates an image via Lovable AI Gateway (Nano Banana 2),
// uploads it to the public `brand-assets` bucket, returns a public URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "brand-assets";
const MODEL = "google/gemini-3.1-flash-image-preview"; // Nano Banana 2

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const prompt: string = (body.prompt || "").toString().trim();
    if (!prompt || prompt.length < 3) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Prompt too long (max 2000)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 502;
      return new Response(
        JSON.stringify({
          error:
            aiResp.status === 429
              ? "Rate limited. Please try again in a moment."
              : aiResp.status === 402
              ? "AI credits exhausted. Add funds in Workspace > Usage."
              : `AI generation failed: ${errText.slice(0, 200)}`,
        }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResp.json();
    const imageDataUrl: string | undefined =
      aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl || !imageDataUrl.startsWith("data:image")) {
      return new Response(JSON.stringify({ error: "No image returned by model" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse data URL → bytes
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Invalid image payload" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const contentType = match[1];
    const ext = contentType.split("/")[1] || "png";
    const base64 = match[2];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const filename = `${userId}/strategy/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(filename, bytes, { contentType, upsert: false });

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicData } = sb.storage.from(BUCKET).getPublicUrl(filename);

    return new Response(
      JSON.stringify({
        url: publicData.publicUrl,
        path: filename,
        content_type: contentType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("strategy-image-gen error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
