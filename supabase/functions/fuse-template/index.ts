import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      templateImageUrl, 
      campaignImageUrl, 
      additionalAssets,
      postText,
      campaignIdea,
      targetAudience,
      brandFonts, 
      brandColors,
      customPrompt,
      isEditMode
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!templateImageUrl) {
      throw new Error("Template image is required");
    }

    // Build a detailed prompt for fusion
    const fontsList = brandFonts?.length ? brandFonts.join(", ") : "modern sans-serif fonts";
    const colorsList = brandColors?.length ? brandColors.join(", ") : "vibrant brand colors";
    
    let fusionPrompt: string;
    
    if (isEditMode) {
      // Edit mode - modify existing generated image
      fusionPrompt = `Edit this social media post image with the following changes: ${postText || customPrompt}

IMPORTANT: 
- Make the requested changes while maintaining the overall design quality
- Keep text readable and colors consistent
- Output only the edited image, no additional text`;
    } else if (customPrompt) {
      // Use custom prompt from review step
      fusionPrompt = customPrompt;
    } else {
      // Standard fusion prompt
      fusionPrompt = `Create a professional social media post image using the following content:

TEMPLATE (IMAGE #1):
The first image is the TEMPLATE - use it as the primary design reference. Recreate its layout, composition, visual hierarchy, and style.

`;
      
      if (campaignImageUrl) {
        fusionPrompt += `MAIN CAMPAIGN IMAGE (IMAGE #2):
This is the main product/campaign image to incorporate into the template design. Place it prominently as the hero image.

`;
      }
      
      if (additionalAssets?.length > 0) {
        fusionPrompt += `ADDITIONAL ASSETS (IMAGES #3+):
${additionalAssets.length} additional asset(s) provided - these may include logos, secondary images, or brand elements. Incorporate them appropriately:
- Logos should be placed in corners or footer areas
- Secondary images can support the main design
- Brand elements should enhance the overall composition

`;
      }
      
      if (campaignIdea) {
        fusionPrompt += `CAMPAIGN THEME: ${campaignIdea}

`;
      }
      
      if (postText) {
        fusionPrompt += `POST TEXT/CAPTION: "${postText}"
Include this text prominently in the design using appropriate typography.

`;
      }
      
      if (targetAudience) {
        fusionPrompt += `TARGET AUDIENCE: ${targetAudience}
Ensure the design appeals to this demographic.

`;
      }
      
      fusionPrompt += `BRAND STYLING:
- Typography: Use fonts similar to ${fontsList}
- Color palette: Incorporate these colors: ${colorsList}

CRITICAL INSTRUCTIONS:
1. The first image is the TEMPLATE - recreate its layout and style
2. Subsequent images are ASSETS to incorporate into that layout
3. Maintain professional social media post aesthetics
4. Ensure all text is legible with proper contrast
5. Create a cohesive, polished final design ready for posting
6. OUTPUT ONLY THE GENERATED IMAGE - no additional text or descriptions`;
    }

    // Build message content with images
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: fusionPrompt }
    ];

    // Add template image as first image
    messageContent.push({
      type: "image_url",
      image_url: { url: templateImageUrl }
    });

    // Add campaign image if provided (second image)
    if (campaignImageUrl && !isEditMode) {
      messageContent.push({
        type: "image_url",
        image_url: { url: campaignImageUrl }
      });
    }

    // Add additional assets (subsequent images)
    if (additionalAssets?.length > 0 && !isEditMode) {
      for (const assetUrl of additionalAssets) {
        if (assetUrl) {
          messageContent.push({
            type: "image_url",
            image_url: { url: assetUrl }
          });
        }
      }
    }

    console.log("Sending fusion request with", messageContent.length, "content items (1 prompt +", messageContent.length - 1, "images)");

    // Try with the primary model first
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: messageContent
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const images = data.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      // Check if we got text instead of image - retry with simplified prompt
      const textContent = data.choices?.[0]?.message?.content;
      console.error("No image generated, got text:", textContent?.substring(0, 200));
      
      // Retry with a simpler prompt
      console.log("Retrying with simplified prompt...");
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
              content: [
                { 
                  type: "text", 
                  text: "Recreate this template design as a social media post. Use the same layout and style. Output only the generated image." 
                },
                { type: "image_url", image_url: { url: templateImageUrl } }
              ]
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryImages = retryData.choices?.[0]?.message?.images;
        if (retryImages?.length > 0) {
          const generatedImageUrl = retryImages[0]?.image_url?.url;
          if (generatedImageUrl) {
            return new Response(
              JSON.stringify({ 
                imageUrl: generatedImageUrl,
                message: "Social post generated (simplified mode)"
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
      
      throw new Error("AI did not generate an image. Please try with a different template or fewer assets.");
    }

    const generatedImageUrl = images[0]?.image_url?.url;
    if (!generatedImageUrl) {
      throw new Error("Failed to extract generated image URL");
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: generatedImageUrl,
        message: data.choices?.[0]?.message?.content || "Social post generated successfully!"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fuse-template:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
