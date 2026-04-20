import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NB_API_BASE = "https://www.nananobanana.com/api/v1";
const NB_MODEL = "nano-banana";
const FALLBACK_NB_KEY = "nb_a938d5cdc362fe2363a0031634e0eef1e1ad4776c1da0433e63d126e37948ba3";

const visualStyles = [
  { id: "deep-contrast",     name: "Deep Contrast",     prompt: "Hard tungsten lighting, orange-teal color grading, high contrast, fine film grain, shallow depth of field, dramatic shadows" },
  { id: "soft-editorial",    name: "Soft Editorial",    prompt: "Diffuse natural window light, clean whites, soft warm skin tones, minimal contrast, luxury fashion magazine editorial" },
  { id: "cinematic-moody",   name: "Cinematic Moody",   prompt: "Low-key dramatic lighting, deep rich shadows, cinematic color grading, anamorphic lens bokeh, film noir mood" },
  { id: "bright-commercial", name: "Bright Commercial", prompt: "High-key studio lighting, crisp sharp clarity, product-forward composition, clean white highlights, polished advertising aesthetic" },
  { id: "documentary-real",  name: "Documentary Real",  prompt: "Natural available daylight, authentic grain and texture, candid street photography style, real environment, photojournalistic" },
  { id: "modern-minimal",    name: "Modern Minimal",    prompt: "Clean neutral background, precise geometric composition, soft diffused shadow, monochrome palette with one accent, Swiss design inspired" },
  { id: "bold-lifestyle",    name: "Bold Lifestyle",    prompt: "Dynamic diagonal framing, vibrant saturated colors, energetic movement, golden hour backlight, social media hero shot" },
  { id: "luxury-texture",    name: "Luxury Texture",    prompt: "Rich tactile materials close-up, warm golden highlights, elegant symmetrical framing, refined tonal color balance, premium high-end aesthetic" },
];

function sanitizeKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^\x20-\x7E]/g, "").trim();
}

function resolveApiKey(): string {
  const fromEnv = sanitizeKey(
    Deno.env.get("NB_API_KEY") ||
    Deno.env.get("NANO_BANANA_KEY") ||
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("LOVABLE_API_KEY")
  );
  if (fromEnv.startsWith("nb_"))    return fromEnv;
  if (fromEnv.startsWith("AIzaSy")) return fromEnv;
  if (fromEnv.startsWith("AQ."))    return fromEnv;
  return FALLBACK_NB_KEY;
}

// ── Nano Banana ───────────────────────────────────────────────────────────────
async function generateImageNB(
  apiKey: string,
  businessContext: string,
  stylePrompt: string,
): Promise<string | null> {
  const prompt = `Generate one photographic image. Vertical 9:16 aspect ratio. Subject: a premium visual representing a ${businessContext}. Photographic style: ${stylePrompt}. No text overlays, no watermarks, no logos, no borders. Photorealistic only.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${NB_API_BASE}/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, selectedModel: NB_MODEL, mode: "sync" }),
      });

      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!response.ok) {
        console.error(`NB image gen failed: ${response.status}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      const data = await response.json();
      const imageUrl = data.data?.outputImageUrls?.[0];
      if (imageUrl) return imageUrl;

      console.warn(`Attempt ${attempt + 1}: no image URL in response`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`Attempt ${attempt + 1} error:`, e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

// ── Google Gemini Direct ──────────────────────────────────────────────────────
async function generateImageDirect(
  apiKey: string,
  businessContext: string,
  stylePrompt: string,
): Promise<string | null> {
  const fullPrompt = `Generate one photographic image. Vertical 9:16 aspect ratio. Subject: a premium visual representing a ${businessContext}. Photographic style: ${stylePrompt}. No text overlays, no watermarks, no logos, no borders. Photorealistic only.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        },
      );
      if (response.status === 429) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (!response.ok) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      const data = await response.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data);
      if (imagePart?.inline_data) return `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`;
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`Attempt ${attempt + 1} error:`, e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

// ── Lovable Gateway ───────────────────────────────────────────────────────────
async function generateImageGateway(
  apiKey: string,
  businessContext: string,
  stylePrompt: string,
): Promise<string | null> {
  const fullPrompt = `Generate one photographic image. Vertical 9:16 aspect ratio. Subject: a premium visual representing a ${businessContext}. Photographic style: ${stylePrompt}. No text overlays, no watermarks, no logos, no borders. Photorealistic only.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: fullPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (response.status === 429) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (!response.ok) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      const data = await response.json();
      const msg = data?.choices?.[0]?.message;
      if (Array.isArray(msg?.images)) {
        const url = msg.images[0]?.image_url?.url || msg.images[0]?.url;
        if (url) return url;
      }
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`Attempt ${attempt + 1} error:`, e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

// ── Unified caller ────────────────────────────────────────────────────────────
async function generateImage(apiKey: string, businessContext: string, stylePrompt: string): Promise<string | null> {
  if (apiKey.startsWith("nb_"))    return generateImageNB(apiKey, businessContext, stylePrompt);
  if (apiKey.startsWith("AIzaSy")) return generateImageDirect(apiKey, businessContext, stylePrompt);
  return generateImageGateway(apiKey, businessContext, stylePrompt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessContext } = await req.json();
    const API_KEY = resolveApiKey();
    if (!businessContext) throw new Error("businessContext is required");

    const batch1 = visualStyles.slice(0, 4);
    const batch2 = visualStyles.slice(4, 8);

    const results1 = await Promise.all(
      batch1.map(async (style, idx) => {
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 600));
        const imageUrl = await generateImage(API_KEY, businessContext, style.prompt);
        return { id: style.id, imageUrl };
      }),
    );

    await new Promise((r) => setTimeout(r, 1500));

    const results2 = await Promise.all(
      batch2.map(async (style, idx) => {
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 600));
        const imageUrl = await generateImage(API_KEY, businessContext, style.prompt);
        return { id: style.id, imageUrl };
      }),
    );

    return new Response(JSON.stringify({ success: true, styles: [...results1, ...results2] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-style-previews error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
