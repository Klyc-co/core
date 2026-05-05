import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function buildPrompt(businessContext: string, stylePrompt: string): string {
  return `Generate one photographic image. Vertical 9:16 aspect ratio. Subject: a premium visual authentically representing ${businessContext}. Photographic style: ${stylePrompt}. The subject must be specific to this business — show real people, products, environments, or moments that this kind of company actually deals with. No text overlays, no watermarks, no logos, no borders. Photorealistic only.`;
}

async function generateOne(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  businessContext: string,
  stylePrompt: string,
): Promise<string | null> {
  const fullPrompt = buildPrompt(businessContext, stylePrompt);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
        method: "POST",
        headers: {
          "apikey": anonKey,
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "<no body>");
        console.error(
          `[generate-style-previews] generate-image failed (attempt ${attempt + 1}): ${response.status} ${text.slice(0, 200)}`,
        );
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      const data = await response.json();
      const url = data?.imageUrl || data?.image_url || data?.url;
      if (url) return url;
      console.warn(
        `[generate-style-previews] No imageUrl in generate-image response: ${JSON.stringify(data).slice(0, 300)}`,
      );
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`[generate-style-previews] Attempt ${attempt + 1} error:`, e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[generate-style-previews] auth.getUser failed:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { businessContext } = await req.json();
    if (!businessContext || typeof businessContext !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "businessContext is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[generate-style-previews] Starting for user ${user.id} ctx=${businessContext.slice(0, 120)}`,
    );

    // Two parallel batches of 4 with a small inter-task stagger and a brief
    // pause between batches to stay under generate-image rate limits.
    const batch1 = visualStyles.slice(0, 4);
    const batch2 = visualStyles.slice(4, 8);

    const results1 = await Promise.all(
      batch1.map(async (style, idx) => {
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 600));
        const imageUrl = await generateOne(
          supabaseUrl, supabaseAnonKey, authHeader, businessContext, style.prompt,
        );
        return { id: style.id, imageUrl };
      }),
    );

    await new Promise((r) => setTimeout(r, 1500));

    const results2 = await Promise.all(
      batch2.map(async (style, idx) => {
        if (idx > 0) await new Promise((r) => setTimeout(r, idx * 600));
        const imageUrl = await generateOne(
          supabaseUrl, supabaseAnonKey, authHeader, businessContext, style.prompt,
        );
        return { id: style.id, imageUrl };
      }),
    );

    const styles = [...results1, ...results2];
    const successCount = styles.filter((s) => s.imageUrl).length;
    console.log(
      `[generate-style-previews] Complete: ${successCount}/${styles.length} images generated for user ${user.id}`,
    );

    return new Response(
      JSON.stringify({ success: true, styles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[generate-style-previews] Top-level error:", msg, stack);
    return new Response(
      JSON.stringify({ success: false, error: msg, stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
