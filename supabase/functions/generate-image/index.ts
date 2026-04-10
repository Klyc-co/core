import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const normalizeReferenceImage = async (imageUrl: string): Promise<string | null> => {
  if (typeof imageUrl !== "string") return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (SUPPORTED_DATA_URL_PATTERN.test(trimmed)) return trimmed;

  if (!/^https?:\/\//i.test(trimmed)) {
    console.warn("Skipping unsupported reference image URL", trimmed.slice(0, 120));
    return null;
  }

  try {
    const response = await fetch(trimmed);
    if (!response.ok) {
      console.warn("Reference image fetch failed", response.status, trimmed);
      return null;
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      console.warn("Reference image URL did not return image content", contentType, trimmed);
      return null;
    }
    const base64 = arrayBufferToBase64(await response.arrayBuffer());
    const normalizedType = contentType.split(";")[0].toLowerCase();
    const safeType = normalizedType.match(/^image\/(png|jpeg|jpg|webp|gif)$/i) ? normalizedType : "image/png";
    return `data:${safeType};base64,${base64}`;
  } catch (error) {
    console.warn("Failed to normalize reference image", trimmed, error);
    return null;
  }
};

// Platform-specific image size presets
const PLATFORM_SIZES: Record<string, { width: number; height: number; label: string }> = {
  linkedin:  { width: 1200, height: 627,  label: "LinkedIn Feed" },
  twitter:   { width: 1200, height: 675,  label: "X/Twitter Post" },
  instagram: { width: 1080, height: 1080, label: "Instagram Square" },
  facebook:  { width: 1200, height: 630,  label: "Facebook Feed" },
  tiktok:    { width: 1080, height: 1920, label: "TikTok Cover" },
  youtube:   { width: 1280, height: 720,  label: "YouTube Thumbnail" },
  story:     { width: 1080, height: 1920, label: "Story (IG/FB)" },
};

async function logHealth(functionName: string, success: boolean, elapsedMs: number) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("submind_health_snapshots").insert({
      function_name: functionName,
      success,
      elapsed_ms: elapsedMs,
    });
  } catch (_) {
    // non-blocking — never let health logging break the response
  }
}

async function callGeminiImageGen(
  geminiKey: string,
  prompt: string,
  referenceImages: string[] = [],
): Promise<string> {
  // Build parts: reference images first (inlineData), then text prompt
  const parts: any[] = [];
  for (const imgUrl of referenceImages) {
    const mimeMatch = imgUrl.match(/^data:([^;]+)/);
    const mimeType = mimeMatch?.[1] || "image/png";
    const base64Data = imgUrl.split(",")[1];
    if (base64Data) {
      parts.push({ inlineData: { mimeType, data: base64Data } });
    }
  }
  parts.push({ text: prompt });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const imageData = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;

  if (!imageData) {
    throw new Error("No image returned from Gemini");
  }

  return `data:${imageData.mimeType};base64,${imageData.data}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const start = Date.now();
  let success = false;

  try {
    const body = await req.json();

    // Health check
    if (body.action === "health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          provider: "gemini-2.0-flash-image",
          platforms: Object.keys(PLATFORM_SIZES),
          version: "v3",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = body.prompt || "";
    if (!prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Image prompt required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiKey = Deno.env.get("Gemini");
    if (!geminiKey) {
      console.error("Gemini API key not configured.");
      return new Response(
        JSON.stringify({ error: "Image generation not configured. Contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize all reference images upfront
    const rawRefs: string[] = body.referenceImages || [];
    const inspirationRaw: string = body.inspirationImageUrl || "";
    const normalizedRefs = (
      await Promise.all(rawRefs.map((u) => normalizeReferenceImage(u)))
    ).filter((u): u is string => Boolean(u));
    const inspirationNorm = await normalizeReferenceImage(inspirationRaw);
    if (inspirationNorm && !normalizedRefs.includes(inspirationNorm)) {
      normalizedRefs.unshift(inspirationNorm);
    }

    // --- Single image mode (Creative Studio — width + height provided) ---
    const directWidth = body.width as number | undefined;
    const directHeight = body.height as number | undefined;

    if (directWidth && directHeight) {
      try {
        const aspectNote = normalizedRefs.length > 0
          ? `Using the attached reference image(s), generate a high-quality marketing image with a ${directWidth}x${directHeight} aspect ratio. Incorporate the product/subject from the reference(s). Instructions: ${prompt}`
          : `Generate a high-quality marketing image with a ${directWidth}x${directHeight} aspect ratio. ${prompt}`;

        const imageUrl = await callGeminiImageGen(geminiKey, aspectNote, normalizedRefs);
        success = true;

        return new Response(
          JSON.stringify({
            imageUrl,
            size: `${directWidth}x${directHeight}`,
            model: "gemini-2.0-flash-image",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err) {
        console.error("Single image generation error:", err);
        return new Response(
          JSON.stringify({ error: err.message || "Image generation failed." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } finally {
        await logHealth("generate-image", success, Date.now() - start);
      }
    }

    // --- Multi-platform generation path ---
    const platforms: string[] = body.platforms || Object.keys(PLATFORM_SIZES);
    const results: Record<string, any> = {};
    let totalImages = 0;

    for (const platform of platforms) {
      const size = PLATFORM_SIZES[platform];
      if (!size) {
        results[platform] = { error: `Unknown platform: ${platform}` };
        continue;
      }

      try {
        const platformPrompt = normalizedRefs.length > 0
          ? `Using the attached reference image(s), generate a high-quality ${size.label} marketing image (${size.width}x${size.height} aspect ratio). Instructions: ${prompt}`
          : `Generate a high-quality ${size.label} marketing image (${size.width}x${size.height} aspect ratio). ${prompt}`;

        const imageUrl = await callGeminiImageGen(geminiKey, platformPrompt, normalizedRefs);
        totalImages++;

        results[platform] = {
          url: imageUrl,
          size: `${size.width}x${size.height}`,
          label: size.label,
          model: "gemini-2.0-flash-image",
        };
      } catch (err) {
        console.error(`Platform ${platform} image gen error:`, err);
        results[platform] = { error: err.message };
      }
    }

    success = totalImages > 0;

    return new Response(
      JSON.stringify({
        images: results,
        totalImages,
        model: "gemini-2.0-flash-image",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({ error: "Image generation failed. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } finally {
    await logHealth("generate-image", success, Date.now() - start);
  }
});
