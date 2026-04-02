import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Visual style → art direction mapping
const STYLE_DIRECTIONS: Record<string, string> = {
  "deep-contrast": "Hard tungsten lighting with orange-teal color grade. High contrast ratio. Fine film grain texture. Shallow depth of field with creamy bokeh. Dramatic shadows.",
  "soft-editorial": "Diffuse natural window light. Clean white backgrounds. Soft pastel tones. Minimal contrast. Vogue/luxury magazine editorial aesthetic. Ethereal glow.",
  "cinematic-moody": "Low-key dramatic lighting. Deep rich shadows. Teal and amber color grade. Anamorphic lens flare. Film noir atmosphere. Cinematic 2.39:1 energy.",
  "bright-commercial": "High-key studio lighting. Crisp clarity with zero grain. Product-forward hero framing. Clean white/light backgrounds. Apple-style commercial polish.",
  "documentary-real": "Natural available light. Authentic textures and real environments. Photojournalistic composition. Candid human moments. Warm honest tones.",
  "modern-minimal": "Clean negative space. Neutral desaturated backgrounds. Geometric composition. Soft directional shadows. Swiss design principles. Premium simplicity.",
  "bold-lifestyle": "Dynamic diagonal composition. Vibrant saturated colors. Human energy and motion. Social-media-native framing. Bold warm tones. Street photography energy.",
  "luxury-texture": "Rich material close-ups. Warm golden hour highlights. Elegant rule-of-thirds framing. Refined muted color palette. Marble, leather, silk textures. High-end premium feel.",
};

// Font style → typography direction
const FONT_DIRECTIONS: Record<string, string> = {
  "clean-modern-sans": "Clean sans-serif typography vibe. Minimal, tech-forward, startup aesthetic.",
  "editorial-serif": "Elegant serif typography energy. Premium editorial, New York Times style authority.",
  "bold-geometric": "Bold heavy geometric type energy. Strong impactful statements. Poster-like confidence.",
  "humanist-sans": "Warm approachable typography feel. Friendly, human, organic brand personality.",
  "luxury-contrast": "Luxury high-contrast type aesthetic. Thin/thick letterform energy. Vogue, Chanel, premium fashion.",
};

// Platform → image specs
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const {
      websiteUrl, businessName, businessDescription, industry,
      targetAudience, valueProposition, productCategory, userName,
      visualStyles = [], fontStyle = "clean-modern-sans",
    } = body;

    // Load profile + brand assets in parallel
    let profileData: any = {};
    let brandColors: string[] = [];
    let brandImageUrls: string[] = [];
    let logoUrl: string | null = null;

    if (userId) {
      const [profileRes, colorRes, imageRes, logoRes] = await Promise.all([
        supabase.from("client_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("brand_assets").select("value").eq("user_id", userId).eq("asset_type", "color"),
        supabase.from("brand_assets").select("value, name, metadata").eq("user_id", userId).eq("asset_type", "image").limit(5),
        supabase.from("brand_assets").select("value").eq("user_id", userId).eq("asset_type", "logo").limit(1),
      ]);
      if (profileRes.data) profileData = profileRes.data;
      if (colorRes.data) brandColors = colorRes.data.map((c: any) => c.value);
      if (imageRes.data) brandImageUrls = imageRes.data.map((i: any) => i.value).filter((u: string) => u?.startsWith("http"));
      if (logoRes.data?.[0]) logoUrl = logoRes.data[0].value;
    }

    // Build comprehensive business context
    const bName = businessName || profileData.business_name || "the business";
    const bDesc = businessDescription || profileData.description || "";
    const bIndustry = industry || profileData.industry || "";
    const bAudience = targetAudience || profileData.target_audience || "";
    const bValue = valueProposition || profileData.value_proposition || "";
    const bCategory = productCategory || profileData.product_category || "";
    const bGoals = profileData.marketing_goals || "";
    const bCompetitors = profileData.main_competitors || "";
    const bMarkets = profileData.geography_markets || "";
    const bWebsite = websiteUrl || profileData.website || "";
    const colorPalette = brandColors.length > 0 ? brandColors.join(", ") : (profileData.brand_colors || []).join(", ");
    const ownerName = userName?.firstName ? `${userName.firstName}${userName.lastName ? ' ' + userName.lastName : ''}` : "";

    // Build art direction from selected visual styles
    const artDirection = visualStyles.length > 0
      ? visualStyles.map((s: string) => STYLE_DIRECTIONS[s] || "").filter(Boolean).join(" ")
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

    console.log("Generating posts with enriched pipeline for:", bName);

    // ──────────────────────────────────────────────
    // STEP 1: Generate 3 post concepts with RICH art direction
    // ──────────────────────────────────────────────
    const textResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an elite social media content strategist AND visual art director. You create posts that are HIGHLY SPECIFIC to the business provided. Every post must directly reference the business's products, services, industry, or value proposition.

VISUAL ART DIRECTION (user's selected style):
${artDirection}

TYPOGRAPHY DIRECTION:
${fontDirection}

Rules:
- Every caption must mention the business by name or directly reference its specific products/services
- Image prompts must be HYPER-DETAILED visual art direction briefs — NOT generic descriptions
- Each image prompt must include: specific lighting setup, camera angle, color grade, composition rules, texture/material details, mood/atmosphere, and the platform's exact aspect ratio
- If brand colors are provided, specify EXACTLY how they appear (e.g. "accent lighting in #FF5733", "background gradient from ${colorPalette}")
- Tailor tone to the industry
- Make content the business owner would be PROUD to post as their brand's first impression`,
          },
          {
            role: "user",
            content: `Generate exactly 3 social media posts SPECIFICALLY tailored to this business. Each must be directly about THIS business.

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
- Color grade (reference brand colors: "${colorPalette}" as specific accent/background/lighting colors)
- Textures & materials relevant to this ${bIndustry || bCategory || "business"} industry
- Atmosphere & mood that matches the art direction style
- Specific subject matter directly related to ${bName}'s products/services
- DO NOT include any text, logos, words, or typography in the image — pure photography/visual only`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_posts",
              description: "Create 3 social media post concepts with rich art direction",
              parameters: {
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
                      additionalProperties: false,
                    },
                  },
                },
                required: ["posts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_posts" } },
      }),
    });

    if (!textResponse.ok) {
      const errText = await textResponse.text();
      console.error("AI text generation failed:", textResponse.status, errText);
      throw new Error(`AI text generation failed: ${textResponse.status}`);
    }

    const textData = await textResponse.json();
    const toolCall = textData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response from AI");

    const { posts } = JSON.parse(toolCall.function.arguments);
    console.log("Generated post concepts:", posts.length);

    // ──────────────────────────────────────────────
    // STEP 2: Generate images with upgraded model + brand references
    // ──────────────────────────────────────────────
    const postsWithImages = await Promise.all(
      posts.map(async (post: any, index: number) => {
        try {
          const platform = post.platforms?.[0] || "Instagram";
          const specs = PLATFORM_SPECS[platform] || PLATFORM_SPECS.Instagram;

          console.log(`Generating ${platform} image (${specs.width}x${specs.height}) for ${bName}...`);

          // Build the image generation prompt with full art direction
          const fullImagePrompt = [
            `Create a stunning, professional ${specs.aspectDesc} social media image.`,
            post.imagePrompt,
            `Art direction: ${artDirection}`,
            `Exact dimensions: ${specs.width}x${specs.height} pixels.`,
            `This is for ${bName}, a ${bIndustry || bCategory || "professional"} business.`,
            colorPalette ? `Brand color palette to incorporate as accent elements: ${colorPalette}.` : "",
            "CRITICAL: Do NOT include any text, words, letters, logos, or typography anywhere in the image.",
            "Quality: 8K ultra-high resolution, professional photography, magazine-cover worthy.",
            "Output only the generated image.",
          ].filter(Boolean).join(" ");

          // If brand reference images exist, use image editing endpoint to infuse brand DNA
          const hasBrandRef = brandImageUrls.length > 0 && index === 0; // Use ref for first image
          const messageContent: any = hasBrandRef
            ? [
                { type: "text", text: fullImagePrompt + ` Use the provided brand reference image as inspiration for the visual style, color tones, and mood — but create an entirely new composition.` },
                { type: "image_url", image_url: { url: brandImageUrls[0] } },
              ]
            : fullImagePrompt;

          const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [{ role: "user", content: messageContent }],
              modalities: ["image", "text"],
            }),
          });

          if (!imgResponse.ok) {
            console.error(`Image generation failed for post ${index + 1}:`, imgResponse.status);
            // Retry with simpler prompt
            return await retryImageGeneration(LOVABLE_API_KEY, post, bName, bIndustry, bCategory, artDirection, specs, supabase, userId, index);
          }

          const imgData = await imgResponse.json();
          const imageBase64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageBase64 || !imageBase64.startsWith("data:image")) {
            console.log(`No image returned for post ${index + 1}, retrying...`);
            return await retryImageGeneration(LOVABLE_API_KEY, post, bName, bIndustry, bCategory, artDirection, specs, supabase, userId, index);
          }

          // ──────────────────────────────────────────────
          // STEP 3: Post-process — add branded composition overlay
          // ──────────────────────────────────────────────
          let finalImageBase64 = imageBase64;

          // Use the image model to add branded text overlay + composition
          try {
            const compositionPrompt = [
              `Take this social media image and enhance it into a polished, branded ${platform} post design.`,
              `Add a subtle branded composition layer:`,
              `- A tasteful semi-transparent gradient overlay at the bottom (20-30% of the image) for text readability`,
              `- The headline "${post.title}" rendered in clean, modern ${fontDirection.split(".")[0]} typography at the bottom`,
              colorPalette ? `- Use brand color ${brandColors[0] || colorPalette.split(",")[0]} as the accent color for any design elements` : "",
              logoUrl ? `- Small logo watermark in the bottom-right corner` : "",
              `- Keep the original photography as the hero — the overlay should enhance, not obscure`,
              `- Make it look like a professionally designed social media post, not raw AI art`,
              `- Output dimensions: ${specs.aspectDesc}`,
              `Output only the final composed image.`,
            ].filter(Boolean).join(" ");

            const compositionMessages: any[] = [
              {
                role: "user",
                content: [
                  { type: "text", text: compositionPrompt },
                  { type: "image_url", image_url: { url: imageBase64 } },
                  ...(logoUrl ? [{ type: "image_url", image_url: { url: logoUrl } }] : []),
                ],
              },
            ];

            const compResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3.1-flash-image-preview",
                messages: compositionMessages,
                modalities: ["image", "text"],
              }),
            });

            if (compResponse.ok) {
              const compData = await compResponse.json();
              const composedImage = compData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (composedImage && composedImage.startsWith("data:image")) {
                finalImageBase64 = composedImage;
                console.log(`Post ${index + 1}: branded composition applied ✓`);
              }
            }
          } catch (compErr) {
            console.error(`Composition overlay failed for post ${index + 1}, using raw image:`, compErr);
          }

          const uploadedUrl = await uploadImage(supabase, finalImageBase64, userId, index);
          return { ...post, imageUrl: uploadedUrl };
        } catch (e) {
          console.error(`Error generating image for post ${index + 1}:`, e);
          return { ...post, imageUrl: null };
        }
      })
    );

    // Step 4: Save posts to post_queue
    if (userId) {
      for (const post of postsWithImages) {
        await supabase.from("post_queue").insert({
          user_id: userId,
          content_type: "image",
          post_text: `**${post.title}**\n\n${post.caption}`,
          image_url: post.imageUrl,
          status: "pending_approval",
        });
      }
    }

    return new Response(JSON.stringify({ posts: postsWithImages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-onboarding-posts error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function retryImageGeneration(
  apiKey: string,
  post: any,
  bName: string,
  bIndustry: string,
  bCategory: string,
  artDirection: string,
  specs: { width: number; height: number; aspectDesc: string },
  supabase: any,
  userId: string | null,
  index: number
) {
  try {
    const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Create a beautiful ${specs.aspectDesc} social media image for a ${bIndustry || bCategory || "business"} called "${bName}" about "${post.title}". ${artDirection} Professional quality, magazine-worthy. No text, no logos, no words in the image. Output only the generated image.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (retryResponse.ok) {
      const retryData = await retryResponse.json();
      const retryImage = retryData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (retryImage && retryImage.startsWith("data:image")) {
        const uploadedUrl = await uploadImage(supabase, retryImage, userId, index);
        return { ...post, imageUrl: uploadedUrl };
      }
    }
  } catch (e) {
    console.error(`Retry failed for post ${index + 1}:`, e);
  }
  return { ...post, imageUrl: null };
}

async function uploadImage(
  supabase: any,
  base64Data: string,
  userId: string | null,
  index: number
): Promise<string | null> {
  try {
    const base64Content = base64Data.split(",")[1];
    if (!base64Content) return null;

    const bytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
    const fileName = `onboarding/${userId || "anonymous"}/${Date.now()}-post-${index}.png`;

    const { error } = await supabase.storage
      .from("brand-assets")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(fileName);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.error("Upload failed:", e);
    return null;
  }
}
