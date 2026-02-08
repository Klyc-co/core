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
      isEditMode,
      aspectRatio,
    } = await req.json();

    // Determine output dimensions based on aspect ratio
    const aspectDimensions: Record<string, { width: number; height: number; label: string }> = {
      portrait: { width: 1080, height: 1920, label: "Vertical/Portrait" },
      square: { width: 1080, height: 1080, label: "Square" },
      landscape: { width: 1920, height: 1080, label: "Horizontal/Landscape" },
    };
    const outputFormat = aspectDimensions[aspectRatio] || aspectDimensions.portrait;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!templateImageUrl) {
      throw new Error("Template image is required");
    }

    // The AI gateway/provider needs a fetchable URL (https://... or data:...) for images.
    // If a relative path slips through, fail fast with a helpful client-visible error.
    if (typeof templateImageUrl === "string" && templateImageUrl.startsWith("/")) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid template image URL. Please re-select the template (it must be a public URL or base64 data URL).",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    // Build a detailed prompt for fusion
    const fontsList = brandFonts?.length ? brandFonts.join(", ") : "modern sans-serif fonts";
    const colorsList = brandColors?.length ? brandColors.join(", ") : "vibrant brand colors";
    
    let fusionPrompt: string;
    
    // Count total images being sent
    let totalImages = 1; // template
    if (campaignImageUrl) totalImages++;
    if (additionalAssets?.length > 0) totalImages += additionalAssets.length;
    
    // CRITICAL: Always enforce output dimensions at the START of the prompt
    const dimensionInstructions = `
**CRITICAL OUTPUT FORMAT REQUIREMENTS:**
- OUTPUT DIMENSIONS: ${outputFormat.width}x${outputFormat.height} pixels
- ASPECT RATIO: ${outputFormat.label} (${outputFormat.width}:${outputFormat.height})
- The generated image MUST be ${outputFormat.label} format, NOT any other orientation
- For ${outputFormat.label}: width=${outputFormat.width}px, height=${outputFormat.height}px
${outputFormat.label === "Vertical/Portrait" ? "- This is a TALL image for mobile/Stories - height > width" : ""}
${outputFormat.label === "Horizontal/Landscape" ? "- This is a WIDE image for desktop - width > height" : ""}
${outputFormat.label === "Square" ? "- This is a SQUARE image - width = height" : ""}

`;

    // Build image reference instructions
    const imageInstructions = `
**IMAGES PROVIDED (${totalImages} total):**
- IMAGE #1: TEMPLATE - Use this as your design reference/style guide
${campaignImageUrl ? "- IMAGE #2: MAIN CAMPAIGN/PRODUCT IMAGE - Incorporate this prominently as the hero visual" : ""}
${additionalAssets?.length > 0 ? `- IMAGES #${campaignImageUrl ? "3" : "2"}+: ${additionalAssets.length} additional asset(s) - logos, secondary images, brand elements to incorporate` : ""}

YOU MUST USE ALL PROVIDED IMAGES IN THE FINAL DESIGN.
`;

    if (isEditMode) {
      // Edit mode - modify existing generated image
      fusionPrompt = dimensionInstructions + `Edit this social media post image with the following changes: ${postText || customPrompt}

IMPORTANT: 
- Make the requested changes while maintaining the overall design quality
- Keep text readable and colors consistent
- Maintain the ${outputFormat.label} (${outputFormat.width}x${outputFormat.height}) dimensions
- Output only the edited image, no additional text`;
    } else if (customPrompt) {
      // Use custom prompt from review step, but PREPEND dimension requirements
      fusionPrompt = dimensionInstructions + imageInstructions + `
CUSTOM INSTRUCTIONS:
${customPrompt}

REMINDER: Output image MUST be ${outputFormat.width}x${outputFormat.height} pixels (${outputFormat.label}).
Use ALL ${totalImages} provided image(s) in the design.`;
    } else {
      // Standard fusion prompt with aspect ratio
      fusionPrompt = dimensionInstructions + `Create a professional social media post image using the following content:

${imageInstructions}

TEMPLATE (IMAGE #1):
The first image is the TEMPLATE - use it as the primary design reference. Recreate its layout, composition, visual hierarchy, and style, adapted to the ${outputFormat.label} ${outputFormat.width}x${outputFormat.height} dimensions.

`;
      
      if (campaignImageUrl) {
        fusionPrompt += `MAIN CAMPAIGN IMAGE (IMAGE #2):
This is the main product/campaign image - YOU MUST incorporate this prominently as the hero image in the design.

`;
      }
      
      if (additionalAssets?.length > 0) {
        fusionPrompt += `ADDITIONAL ASSETS (IMAGES #${campaignImageUrl ? "3" : "2"}+):
${additionalAssets.length} additional asset(s) provided - incorporate ALL of them:
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

CRITICAL FINAL INSTRUCTIONS:
1. OUTPUT DIMENSIONS: ${outputFormat.width}x${outputFormat.height} pixels (${outputFormat.label}) - THIS IS MANDATORY
2. USE ALL ${totalImages} PROVIDED IMAGES in the final design
3. The first image is the TEMPLATE - recreate its layout and style
4. All other images are ASSETS that MUST appear in the final design
5. Maintain professional social media post aesthetics
6. Ensure all text is legible with proper contrast
7. Create a cohesive, polished final design ready for posting
8. OUTPUT ONLY THE GENERATED IMAGE - no additional text or descriptions`;
    }

    console.log("Aspect ratio:", aspectRatio, "->", outputFormat.label, outputFormat.width + "x" + outputFormat.height);
    console.log("Total images to process:", totalImages);

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
