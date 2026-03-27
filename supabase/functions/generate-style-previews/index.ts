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
    prompt: "Hard tungsten lighting. Orange-teal color tones. High contrast. Fine film grain. Shallow depth of field.",
  },
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    prompt: "Diffuse natural light. Clean whites. Soft warm skin tones. Minimal contrast. Luxury magazine editorial feel.",
  },
  {
    id: "cinematic-moody",
    name: "Cinematic Moody",
    prompt: "Low-key dramatic lighting. Deep shadows. Rich blacks. Subtle color separation. Cinematic storytelling mood.",
  },
  {
    id: "bright-commercial",
    name: "Bright Commercial",
    prompt: "High-key lighting. Crisp clarity. Product-forward framing. Clean highlights. Polished commercial ad aesthetic.",
  },
  {
    id: "documentary-real",
    name: "Documentary Real",
    prompt: "Natural available light. Authentic texture. Real-world environment. Honest, grounded, photojournalistic feel.",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    prompt: "Neutral backgrounds. Clean composition. Soft shadows. Limited color palette. Premium minimalist design.",
  },
  {
    id: "bold-lifestyle",
    name: "Bold Lifestyle",
    prompt: "Dynamic framing. Vibrant saturated color. Human energy. Social-first composition. Strong personality.",
  },
  {
    id: "luxury-texture",
    name: "Luxury Texture",
    prompt: "Rich materials and textures. Warm highlights. Elegant framing. Refined color balance. High-end premium feel.",
  },
];

async function generateImage(
  apiKey: string,
  businessContext: string,
  stylePrompt: string
): Promise<string | null> {
  const fullPrompt = `Generate a stunning vertical 9:16 aspect ratio photograph for a ${businessContext}. Style: ${stylePrompt}. The image should feel like a premium social media post or ad showcasing this specific business. No text, no watermarks, no logos. Output only the generated image, no text.`;

  for (let attempt = 0; attempt < 2; attempt++) {
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
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: fullPrompt }],
            modalities: ["image", "text"],
          }),
        }
      );

      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (!response.ok) {
        console.error(`Image gen failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const imageUrl =
        data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) return imageUrl;

      // Model returned text instead of image - retry with simplified prompt
      console.warn("Model returned text instead of image, retrying...");
      continue;
    } catch (e) {
      console.error("Image generation error:", e);
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

    if (!businessContext) {
      throw new Error("businessContext is required");
    }

    // Generate all 8 images in parallel (max concurrency) for speed
    const results = await Promise.all(
      visualStyles.map(async (style, idx) => {
        // Tiny stagger to avoid hitting rate limit on simultaneous requests
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 300));
        const imageUrl = await generateImage(
          LOVABLE_API_KEY,
          businessContext,
          style.prompt
        );
        return { id: style.id, imageUrl };
      })
    );

    return new Response(JSON.stringify({ success: true, styles: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-style-previews error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
