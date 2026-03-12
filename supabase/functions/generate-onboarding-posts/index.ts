import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Get user from JWT
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const {
      websiteUrl,
      businessName,
      businessDescription,
      industry,
      targetAudience,
      valueProposition,
      productCategory,
      userName,
    } = body;

    // Also load from client_profiles for maximum context
    let profileData: any = {};
    if (userId) {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile) profileData = profile;
    }

    // Also load brand colors
    let brandColors: string[] = [];
    if (userId) {
      const { data: colorAssets } = await supabase
        .from("brand_assets")
        .select("value")
        .eq("user_id", userId)
        .eq("asset_type", "color");
      if (colorAssets) brandColors = colorAssets.map((c: any) => c.value);
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
`.trim();

    console.log("Generating posts with full business context for:", bName);

    // Step 1: Generate 3 post concepts using AI with rich business context
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
            content: `You are an elite social media content strategist. You must generate posts that are HIGHLY SPECIFIC to the business provided. Every post must directly reference the business's products, services, industry, or value proposition. Do NOT generate generic marketing content. The posts should feel like they were written by someone who deeply understands this specific business.

Rules:
- Every caption must mention the business by name or directly reference its specific products/services
- Image prompts must depict scenes relevant to this exact business type (e.g. if it's a barbecue restaurant, show grills, smoked meats, dining scenes; if it's a tech company, show their specific product category)
- Tailor the tone to the industry (casual for food/lifestyle, professional for B2B/tech, etc.)
- If brand colors are provided, reference them in image prompts
- Make the content something the business owner would be proud to post`,
          },
          {
            role: "user",
            content: `Generate 3 social media posts that are SPECIFICALLY tailored to this business. Every post must be directly about THIS business, its products, or its industry. No generic content.

${businessContext}

For each post provide:
- title (short, catchy, must relate to this specific business)
- caption (the actual post text, 2-3 sentences, must reference the business name "${bName}" or its specific products/services. Write as if you are the business posting about themselves)  
- platforms (array of which platforms it's best for, from: LinkedIn, Instagram, Facebook, TikTok, YouTube)
- imagePrompt (a detailed visual description for AI image generation. Must depict something directly related to this business's industry and offerings. Include brand colors "${colorPalette}" if available. Be specific about the scene - for example if it's a restaurant describe the food, if it's a tech company describe the product in use)`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_posts",
              description: "Create 3 social media post concepts",
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
                        platforms: {
                          type: "array",
                          items: { type: "string" },
                        },
                        imagePrompt: { type: "string" },
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
    console.log("Generated post concepts:", posts.length, "for business:", bName);

    // Step 2: Generate images for each post
    const postsWithImages = await Promise.all(
      posts.map(async (post: any, index: number) => {
        try {
          console.log(`Generating image ${index + 1} for ${bName}...`);
          const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [
                {
                  role: "user",
                  content: `Generate a professional social media marketing image: ${post.imagePrompt}. The image should be vibrant, polished, and ready for social media. Do not include any text or words in the image. Output only the generated image.`,
                },
              ],
              modalities: ["image", "text"],
            }),
          });

          if (!imgResponse.ok) {
            console.error(`Image generation failed for post ${index + 1}:`, imgResponse.status);
            return { ...post, imageUrl: null };
          }

          const imgData = await imgResponse.json();
          const imageBase64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageBase64 || !imageBase64.startsWith("data:image")) {
            console.log(`No image returned for post ${index + 1}, retrying...`);
            const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image",
                messages: [
                  {
                    role: "user",
                    content: `Create a beautiful social media image for a ${bIndustry || bCategory || "business"} called "${bName}" about "${post.title}". Professional, clean, vibrant. No text in the image. Output only the generated image.`,
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
            return { ...post, imageUrl: null };
          }

          const uploadedUrl = await uploadImage(supabase, imageBase64, userId, index);
          return { ...post, imageUrl: uploadedUrl };
        } catch (e) {
          console.error(`Error generating image for post ${index + 1}:`, e);
          return { ...post, imageUrl: null };
        }
      })
    );

    // Step 3: Save posts to post_queue if user is authenticated
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
