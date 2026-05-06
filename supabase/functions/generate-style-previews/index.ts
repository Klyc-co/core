import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Each style is written as an EXTREME, unmistakable photographic brief — specific
// lighting setup, exact color palette, lens/camera, and named genre/photographer
// references. The goal is for the eight previews to look so different from each
// other that a user can pick a style on aesthetic alone.
const visualStyles = [
  {
    id: "deep-contrast",
    name: "Deep Contrast",
    prompt:
      "DEEP-CONTRAST cinematography. Hard tungsten key light from camera-left carving dramatic chiaroscuro on the subject. Aggressive orange-and-teal Hollywood color grade — burnt amber highlights, deep cyan-teal shadows, almost no neutral midtones. Crushed inky blacks, glowing warm rim-light. Visible 35mm film grain. Anamorphic 50mm at f/1.4 with shallow creamy bokeh. Mood: Roger Deakins, Blade Runner 2049, A24 thriller. Heavy contrast ratio, moody atmosphere.",
  },
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    prompt:
      "SOFT-EDITORIAL fashion photography. Diffuse overcast daylight from a north-facing window — flat, glowing, shadowless. Pure ivory, milky cream, blush pink, sage green palette. Almost zero contrast, everything bathed in a soft luminous haze. Subject in clean negative space against an off-white seamless backdrop. Hasselblad medium format with 80mm lens, f/4. Mood: Vogue, Kinfolk, Cereal magazine, Tim Walker editorial, Glossier campaign.",
  },
  {
    id: "cinematic-moody",
    name: "Cinematic Moody",
    prompt:
      "CINEMATIC-MOODY low-key chiaroscuro. 90% deep black shadow, 10% small pools of warm amber practical light. Smoky atmosphere with visible god-rays cutting through haze. Teal-and-amber color grade — cyan shadows, gold highlights, no neutral tones. Anamorphic horizontal lens flare. Crushed blacks. 2.39:1 cinematic widescreen energy. Mood: Blade Runner 2049, The Godfather, David Fincher, dark academia.",
  },
  {
    id: "bright-commercial",
    name: "Bright Commercial",
    prompt:
      "BRIGHT-COMMERCIAL high-key product photography. Pure white seamless infinity backdrop — no horizon, no shadows. Massive softbox + ring-light setup eliminating ALL shadow. Razor-sharp pin-clarity focus across the entire frame, zero grain, zero artifacts. Color palette: pure white, gloss black, single saturated pop accent. Massive negative space. Hasselblad with macro lens. Mood: Apple keynote, Aesop, Bang & Olufsen, brutalist minimalism, polished advertising.",
  },
  {
    id: "documentary-real",
    name: "Documentary Real",
    prompt:
      "DOCUMENTARY-REAL photojournalism. Available natural light only — no studio, no styling, no setup. Subject caught mid-gesture in a real working environment, slightly imperfect framing, candid energy. Visible Kodak Portra 400 film grain. Muted earthy palette: faded denim, weathered wood, cracked paint, warm skin. Slight motion blur in background. 35mm prime at f/2.8. Mood: Magnum Photos, Steve McCurry, National Geographic, Nan Goldin, Alec Soth.",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    prompt:
      "MODERN-MINIMAL Swiss-design photography. Single subject precisely centered against flat taupe / warm-grey / off-white backdrop. ONE soft directional shadow at 45 degrees, nothing else. Pure geometric composition with massive negative space — subject occupies maybe 25% of the frame. Two-color palette only. Sharp clarity, zero grain. Studio strobe lighting. Mood: Aesop product shot, Muji catalog, Dieter Rams industrial design, Bauhaus poster, Helvetica typography aesthetic.",
  },
  {
    id: "bold-lifestyle",
    name: "Bold Lifestyle",
    prompt:
      "BOLD-LIFESTYLE high-energy editorial. Hyper-saturated punchy colors — electric magenta, lime green, hot orange, neon cyan. Dynamic diagonal composition, dutch tilt, subject in motion mid-action. Golden hour rim-lighting from camera-right combined with on-camera flash for layered light. Slight chromatic aberration on edges. Vogue Italia editorial energy. Mood: Tyler Mitchell, Petra Collins, Solange music video, MTV-era pop culture, René Habermacher.",
  },
  {
    id: "luxury-texture",
    name: "Luxury Texture",
    prompt:
      "LUXURY-TEXTURE macro detail photography. Hyper-close-up of rich tactile materials — Italian full-grain leather, polished veined Carrara marble, raw silk weave, brushed antique brass. Warm golden-hour side-light at low angle revealing every texture. Refined muted palette: bone, oat cream, espresso brown, antique gold. Macro lens at f/4 with razor-thin focus plane. Magazine-cover production value. Mood: Hermès campaign, Aman Resorts brochure, Bottega Veneta, fine-art print catalog.",
  },
];

// Combine the style brief with the business context so the STYLE is unmistakably
// the dominant aesthetic, with the business as the subject *inside* that style.
function buildPrompt(businessContext: string, stylePrompt: string): string {
  return [
    "Generate ONE photorealistic photographic image, vertical 9:16 portrait aspect ratio.",
    "",
    "=== PHOTOGRAPHIC STYLE (THIS IS THE PRIMARY DIRECTIVE — the image MUST look unmistakably like this style, even at thumbnail size) ===",
    stylePrompt,
    "",
    `=== SUBJECT (what's in the frame) ===`,
    `A scene that authentically represents this business: ${businessContext}.`,
    "Show real people, real products, real environments, or real moments specific to this kind of company — but rendered fully in the style above. The subject is the canvas; the style is the law.",
    "",
    "=== HARD CONSTRAINTS ===",
    "• Photorealistic only — no illustration, no 3D render, no CG.",
    "• No text, words, letters, logos, or typography anywhere in the image.",
    "• No watermarks, no borders, no frames.",
    "• The aesthetic difference between this image and a different photographic style must be IMMEDIATELY OBVIOUS at a glance.",
  ].join("\n");
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
