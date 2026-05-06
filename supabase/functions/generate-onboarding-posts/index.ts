import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_DIRECTIONS: Record<string, string> = {
  "deep-contrast":     "Hard tungsten lighting with orange-teal color grade. High contrast ratio. Fine film grain texture. Shallow depth of field with creamy bokeh. Dramatic shadows.",
  "soft-editorial":    "Diffuse natural window light. Clean white backgrounds. Soft pastel tones. Minimal contrast. Vogue/luxury magazine editorial aesthetic. Ethereal glow.",
  "cinematic-moody":   "Low-key dramatic lighting. Deep rich shadows. Teal and amber color grade. Anamorphic lens flare. Film noir atmosphere. Cinematic 2.39:1 energy.",
  "bright-commercial": "High-key studio lighting. Crisp clarity with zero grain. Product-forward hero framing. Clean white/light backgrounds. Apple-style commercial polish.",
  "documentary-real":  "Natural available light. Authentic textures and real environments. Photojournalistic composition. Candid human moments. Warm honest tones.",
  "modern-minimal":    "Clean negative space. Neutral desaturated backgrounds. Geometric composition. Soft directional shadows. Swiss design principles. Premium simplicity.",
  "bold-lifestyle":    "Dynamic diagonal composition. Vibrant saturated colors. Human energy and motion. Social-media-native framing. Bold warm tones. Street photography energy.",
  "luxury-texture":    "Rich material close-ups. Warm golden hour highlights. Elegant rule-of-thirds framing. Refined muted color palette. Marble, leather, silk textures. High-end premium feel.",
};

const FONT_DIRECTIONS: Record<string, string> = {
  "clean-modern-sans": "Clean sans-serif typography vibe. Minimal, tech-forward, startup aesthetic.",
  "editorial-serif":   "Elegant serif typography energy. Premium editorial, New York Times style authority.",
  "bold-geometric":    "Bold heavy geometric type energy. Strong impactful statements. Poster-like confidence.",
  "humanist-sans":     "Warm approachable typography feel. Friendly, human, organic brand personality.",
  "luxury-contrast":   "Luxury high-contrast type aesthetic. Thin/thick letterform energy. Vogue, Chanel, premium fashion.",
};

const PLATFORM_SPECS: Record<string, { width: number; height: number; aspectDesc: string; compositionNotes: string }> = {
  Instagram: {
    width: 1080, height: 1080,
    aspectDesc: "perfect 1:1 square",
    compositionNotes: "Centered subject. Clean edges. Instagram-native feed composition. Leave no dead space — fill the frame with intention.",
  },
  YouTube: {
    width: 1280, height: 720,
    aspectDesc: "16:9 landscape widescreen",
    compositionNotes: "Wide cinematic framing. Subject positioned using rule of thirds. Room for text overlay in lower third. YouTube thumbnail energy — bold, eye-catching, high contrast.",
  },
  TikTok: {
    width: 1080, height: 1920,
    aspectDesc: "9:16 vertical portrait",
    compositionNotes: "Vertical mobile-first composition. Subject centered vertically. Safe zones: 80px from top, 100px from bottom. Full-bleed edge-to-edge visual. Story/Reel native framing.",
  },
};

async function generateImageViaEdgeFn(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  prompt: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
        method: "POST",
        headers: {
          "apikey": anonKey,
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      if (response.status === 429) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (!response.ok) {
        const text = await response.text().catch(() => "<no body>");
        console.error(`[generate-onboarding-posts] generate-image ${response.status}: ${text.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      const data = await response.json();
      const url = data?.imageUrl || data?.image_url || data?.url;
      if (url) return url;
      console.warn(`[generate-onboarding-posts] No imageUrl in response: ${JSON.stringify(data).slice(0, 300)}`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`[generate-onboarding-posts] image attempt ${attempt + 1} error:`, e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("[generate-onboarding-posts] ANTHROPIC_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the calling user via the JWT in the Authorization header.
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = user.id;

    // Use a service-role client for DB reads/writes (bypasses RLS for hydration & queue insert).
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      websiteUrl, businessName, businessDescription, industry,
      targetAudience, valueProposition, productCategory, userName,
      visualStyles = [], fontStyle = "clean-modern-sans",
    } = body;

    // Hydrate profile + brand assets in parallel.
    const [profileRes, colorRes, imageRes, logoRes] = await Promise.all([
      supabase.from("client_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("brand_assets").select("value").eq("user_id", userId).eq("asset_type", "color"),
      supabase.from("brand_assets").select("value, name, metadata").eq("user_id", userId).eq("asset_type", "image").limit(5),
      supabase.from("brand_assets").select("value").eq("user_id", userId).eq("asset_type", "logo").limit(1),
    ]);
    const profileData: any = profileRes.data || {};
    const brandColors: string[] = (colorRes.data || []).map((c: any) => c.value);
    const brandImageUrls: string[] = (imageRes.data || [])
      .map((i: any) => i.value)
      .filter((u: string) => u?.startsWith("http"));
    const logoUrl: string | null = logoRes.data?.[0]?.value ?? null;

    const bName       = businessName        || profileData.business_name      || "the business";
    const bDesc       = businessDescription || profileData.description        || "";
    const bIndustry   = industry            || profileData.industry           || "";
    const bAudience   = targetAudience      || profileData.target_audience    || "";
    const bValue      = valueProposition    || profileData.value_proposition  || "";
    const bCategory   = productCategory     || profileData.product_category   || "";
    const bGoals      = profileData.marketing_goals     || "";
    const bCompetitors= profileData.main_competitors    || "";
    const bMarkets    = profileData.geography_markets   || "";
    const bWebsite    = websiteUrl          || profileData.website            || "";
    const colorPalette = brandColors.length > 0
      ? brandColors.join(", ")
      : (profileData.brand_colors || []).join(", ");
    const ownerName = userName?.firstName
      ? `${userName.firstName}${userName.lastName ? " " + userName.lastName : ""}`
      : "";

    const artDirection = (visualStyles as string[]).length > 0
      ? (visualStyles as string[]).map((s) => STYLE_DIRECTIONS[s] || "").filter(Boolean).join(" ")
      : "Professional cinematic lighting. Shallow depth of field. Rich color grading. Magazine-quality production value.";

    const fontDirection = FONT_DIRECTIONS[fontStyle] || FONT_DIRECTIONS["clean-modern-sans"];

    const businessContext = `
BUSINESS NAME: ${bName}
WEBSITE: ${bWebsite}
INDUSTRY: ${bIndustry}
PRODUCT CATEGORY: ${bCategory}
DESCRIPTION: ${bDesc}
TARGET AUDIENCE: ${bAudience}
VALUE PROPOSITION: ${bValue}
MARKETING GOALS: ${bGoals}
MAIN COMPETITORS: ${bCompetitors}
GEOGRAPHIC MARKETS: ${bMarkets}
BRAND COLORS: ${colorPalette || "Not specified"}
BUSINESS OWNER: ${ownerName || "Not specified"}
BRAND REFERENCE IMAGES AVAILABLE: ${brandImageUrls.length > 0 ? "Yes — user has uploaded brand imagery" : "No"}
LOGO AVAILABLE: ${logoUrl ? "Yes" : "No"}
`.trim();

    console.log(`[generate-onboarding-posts] Starting for user ${userId} — ${bName}`);

    // ── STEP 1: Generate 3 post concepts via Anthropic Claude Haiku 4.5 ──
    const systemPrompt = `You are an elite social media content strategist AND visual art director. You create posts that are HIGHLY SPECIFIC to the business provided. Every post must directly reference the business's products, services, industry, or value proposition.

VISUAL ART DIRECTION (user's selected style):
${artDirection}

TYPOGRAPHY DIRECTION:
${fontDirection}

Rules:
- Every caption must mention the business by name or directly reference its specific products/services
- Image prompts must be HYPER-DETAILED visual art direction briefs — NOT generic descriptions
- Each image prompt must include: specific lighting setup, camera angle, color grade, composition rules, texture/material details, mood/atmosphere, and the platform's exact aspect ratio
- If brand colors are provided, specify EXACTLY how they appear (e.g. "accent lighting in #FF5733", "background gradient from ${colorPalette || "the brand palette"}")
- Tailor tone to the industry
- Make content the business owner would be PROUD to post as their brand's first impression`;

    const userPrompt = `Generate exactly 3 social media posts SPECIFICALLY tailored to this business. Each must be directly about THIS business.

${businessContext}

IMPORTANT — generate in this EXACT order:

1. INSTAGRAM post (platforms: ["Instagram"]):
   - Caption: Instagram-native with emojis, engaging hook, hashtags
   - imagePrompt: Art-directed for ${PLATFORM_SPECS.Instagram.aspectDesc}. ${PLATFORM_SPECS.Instagram.compositionNotes}

2. YOUTUBE post (platforms: ["YouTube"]):
   - Caption: Attention-grabbing title, informative description, subscribe CTA
   - imagePrompt: Art-directed for ${PLATFORM_SPECS.YouTube.aspectDesc}. ${PLATFORM_SPECS.YouTube.compositionNotes}

3. TIKTOK post (platforms: ["TikTok"]):
   - Caption: Punchy, trendy, hook-driven, short
   - imagePrompt: Art-directed for ${PLATFORM_SPECS.TikTok.aspectDesc}. ${PLATFORM_SPECS.TikTok.compositionNotes}

For EVERY imagePrompt, you MUST include ALL of these elements:
- Specific lighting (e.g., "golden hour rim lighting from camera-right", "soft diffused overhead panel")
- Camera angle (e.g., "shot at 35mm f/1.4 from slightly below eye level", "overhead flat lay")
- Color grade (reference brand colors: "${colorPalette || "warm brand-friendly tones"}" as specific accent/background/lighting colors)
- Textures & materials relevant to this ${bIndustry || bCategory || "business"} industry
- Atmosphere & mood that matches the art direction style
- Specific subject matter directly related to ${bName}'s products/services
- DO NOT include any text, logos, words, or typography in the image — pure photography/visual only`;

    const textResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [{
          name: "create_posts",
          description: "Create 3 social media post concepts with rich art direction",
          input_schema: {
            type: "object",
            properties: {
              posts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    caption: { type: "string" },
                    platforms: { type: "array", items: { type: "string" } },
                    imagePrompt: { type: "string", description: "Hyper-detailed art direction brief with lighting, camera, color grade, composition, materials, mood" },
                  },
                  required: ["title", "caption", "platforms", "imagePrompt"],
                },
              },
            },
            required: ["posts"],
          },
        }],
        tool_choice: { type: "tool", name: "create_posts" },
      }),
    });

    if (!textResponse.ok) {
      const errText = await textResponse.text().catch(() => "<no body>");
      console.error("[generate-onboarding-posts] Anthropic error:", textResponse.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${textResponse.status}`, details: errText.slice(0, 500) }),
        { status: textResponse.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const textData = await textResponse.json();
    const toolUse = (textData.content || []).find((b: any) => b.type === "tool_use");
    if (!toolUse?.input?.posts || !Array.isArray(toolUse.input.posts)) {
      console.error("[generate-onboarding-posts] No tool_use posts in Anthropic response", JSON.stringify(textData).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No post concepts returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const postConcepts: Array<{ title: string; caption: string; platforms: string[]; imagePrompt: string }> = toolUse.input.posts;
    console.log(`[generate-onboarding-posts] ${postConcepts.length} post concepts generated`);

    // ── STEP 2: Generate images for each post via existing generate-image edge fn ──
    const postsWithImages = await Promise.all(
      postConcepts.map(async (post, index) => {
        try {
          const platform = post.platforms?.[0] || "Instagram";
          const specs = PLATFORM_SPECS[platform] || PLATFORM_SPECS.Instagram;

          const fullImagePrompt = [
            `Create a stunning, professional ${specs.aspectDesc} social media image.`,
            post.imagePrompt,
            `Art direction: ${artDirection}`,
            `Target dimensions: ${specs.width}x${specs.height} pixels.`,
            `This is for ${bName}, a ${bIndustry || bCategory || "professional"} business.`,
            colorPalette ? `Brand color palette to incorporate as accent elements: ${colorPalette}.` : "",
            "CRITICAL: Do NOT include any text, words, letters, logos, or typography anywhere in the image.",
            "Quality: 8K ultra-high resolution, professional photography, magazine-cover worthy.",
            "Output only the generated image.",
          ].filter(Boolean).join(" ");

          console.log(`[generate-onboarding-posts] Generating ${platform} image for ${bName} (post ${index + 1})`);
          const imageUrl = await generateImageViaEdgeFn(supabaseUrl, supabaseAnonKey, authHeader, fullImagePrompt);
          return { ...post, imageUrl };
        } catch (e) {
          console.error(`[generate-onboarding-posts] image error for post ${index + 1}:`, e);
          return { ...post, imageUrl: null };
        }
      }),
    );

    const successCount = postsWithImages.filter((p) => p.imageUrl).length;
    console.log(`[generate-onboarding-posts] Complete: ${successCount}/${postsWithImages.length} images generated`);

    // ── STEP 3: Persist to post_queue for the StepPendingApprovals view ──
    for (const post of postsWithImages) {
      try {
        await supabase.from("post_queue").insert({
          user_id: userId,
          content_type: "image",
          post_text: `**${post.title}**\n\n${post.caption}`,
          image_url: post.imageUrl,
          status: "pending_approval",
        });
      } catch (e) {
        console.error("[generate-onboarding-posts] post_queue insert error:", e);
      }
    }

    return new Response(
      JSON.stringify({ posts: postsWithImages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[generate-onboarding-posts] Top-level error:", msg, stack);
    return new Response(
      JSON.stringify({ error: msg, stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
