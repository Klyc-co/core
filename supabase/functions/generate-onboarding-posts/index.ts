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

    const { businessSummary, businessType, websiteUrl } = await req.json();

    // Step 1: Generate 3 post concepts using AI
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
            content: `You are a social media content strategist. Generate exactly 3 unique social media post concepts for a brand. Each post should be platform-optimized and ready to publish.`,
          },
          {
            role: "user",
            content: `Generate 3 social media posts for this business:
Website: ${websiteUrl || "N/A"}
Business type: ${businessType || "Product"}
Summary: ${businessSummary || "A modern business looking to grow their social media presence."}

For each post provide:
- title (short, catchy)
- caption (the actual post text, 2-3 sentences, engaging)  
- platforms (array of which platforms it's best for, from: LinkedIn, Instagram, Facebook, TikTok, YouTube)
- imagePrompt (a detailed visual description for AI image generation, describe a professional marketing image that would accompany this post, be specific about composition, colors, mood)`,
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
    console.log("Generated post concepts:", posts.length);

    // Step 2: Generate images for each post using Nano Banana
    const postsWithImages = await Promise.all(
      posts.map(async (post: any, index: number) => {
        try {
          console.log(`Generating image ${index + 1}...`);
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
                  content: `Generate a professional social media marketing image: ${post.imagePrompt}. The image should be vibrant, polished, and ready for social media. Output only the generated image, no text.`,
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
            console.log(`No image returned for post ${index + 1}, retrying with simplified prompt...`);
            // Retry with simpler prompt
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
                    content: `Create a beautiful social media image for a ${businessType || "brand"} post about "${post.title}". Professional, clean, vibrant colors. Output only the generated image, no text.`,
                  },
                ],
                modalities: ["image", "text"],
              }),
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const retryImage = retryData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (retryImage && retryImage.startsWith("data:image")) {
                // Upload to storage
                const uploadedUrl = await uploadImage(supabase, retryImage, userId, index);
                return { ...post, imageUrl: uploadedUrl };
              }
            }
            return { ...post, imageUrl: null };
          }

          // Upload to storage
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
    // Extract the actual base64 content
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
