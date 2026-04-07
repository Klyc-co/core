import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const visualStyles = [
  {
    id: "deep-contrast",
    name: "Deep Contrast",
    prompt: "Hard tungsten lighting, orange-teal color grading, high contrast, fine film grain, shallow depth of field, dramatic shadows",
  },
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    prompt: "Diffuse natural window light, clean whites, soft warm skin tones, minimal contrast, luxury fashion magazine editorial",
  },
  {
    id: "cinematic-moody",
    name: "Cinematic Moody",
    prompt: "Low-key dramatic lighting, deep rich shadows, cinematic color grading, anamorphic lens bokeh, film noir mood",
  },
  {
    id: "bright-commercial",
    name: "Bright Commercial",
    prompt: "High-key studio lighting, crisp sharp clarity, product-forward composition, clean white highlights, polished advertising aesthetic",
  },
  {
    id: "documentary-real",
    name: "Documentary Real",
    prompt: "Natural available daylight, authentic grain and texture, candid street photography style, real environment, photojournalistic",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    prompt: "Clean neutral background, precise geometric composition, soft diffused shadow, monochrome palette with one accent, Swiss design inspired",
  },
  {
    id: "bold-lifestyle",
    name: "Bold Lifestyle",
    prompt: "Dynamic diagonal framing, vibrant saturated colors, energetic movement, golden hour backlight, social media hero shot",
  },
  {
    id: "luxury-texture",
    name: "Luxury Texture",
    prompt: "Rich tactile materials close-up, warm golden highlights, elegant symmetrical framing, refined tonal color balance, premium high-end aesthetic",
  },
];

function extractImageUrl(data: any): string | null {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return null;

  // Path 1: images array (standard Lovable gateway response)
  if (Array.isArray(msg.images)) {
    for (const img of msg.images) {
      const url = img?.image_url?.url || img?.url;
      if (url) return url;
    }
  }

  // Path 2: content array with image parts
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === "image_url" && part.image_url?.url) return part.image_url.url;
      if (part.type === "image" && part.url) return part.url;
      if (part.inline_data?.data && part.inline_data?.mime_type) {
        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
    }
  }

  return null;
}

async function generateImage(
  apiKey: string,
  businessContext: string,
  stylePrompt: string
): Promise<string | null> {
  const fullPrompt = `Generate one photographic image. Vertical 9:16 aspect ratio. Subject: a premium visual representing a ${businessContext}. Photographic style: ${stylePrompt}. No text overlays, no watermarks, no logos, no borders. Photorealistic only.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: fullPrompt }],
            modalities: ["image", "text"],
          }),
        }
      );

      if (response.status === 429) {
        const wait = 2000 * (attempt + 1);
        console.warn(`Rate limited attempt ${attempt + 1}, waiting ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) {
        console.error(`Image gen failed: ${response.status}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      const data = await response.json();
      const imageUrl = extractImageUrl(data);
      if (imageUrl) return imageUrl;

      console.warn(`Attempt ${attempt + 1}: no image in response, retrying`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`Attempt ${attempt + 1} error:`, e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!businessContext) throw new Error("businessContext is required");

    // Generate in 2 batches of 4 with stagger to avoid rate limits
    const batch1 = visualStyles.slice(0, 4);
    const batch2 = visualStyles.slice(4, 8);

    const results1 = await Promise.all(
      batch1.map(async (style, idx) => {
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 600));
        const imageUrl = await generateImage(LOVABLE_API_KEY, businessContext, style.prompt);
        return { id: style.id, imageUrl };
      })
    );

    await new Promise((r) => setTimeout(r, 1500));

    const results2 = await Promise.all(
      batch2.map(async (style, idx) => {
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 600));
        const imageUrl = await generateImage(LOVABLE_API_KEY, businessContext, style.prompt);
        return { id: style.id, imageUrl };
      })
    );

    return new Response(JSON.stringify({ success: true, styles: [...results1, ...results2] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-style-previews error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
