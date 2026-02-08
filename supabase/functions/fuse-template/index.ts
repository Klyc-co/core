import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type OutputFormat = { width: number; height: number; label: string };

const dataUrlToBytes = (dataUrl: string): Uint8Array | null => {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;
  const base64 = match[3];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const getImageSize = async (imageUrl: string): Promise<{ width: number; height: number } | null> => {
  try {
    const bytes = dataUrlToBytes(imageUrl);
    if (!bytes) return null;
    const img = await Image.decode(bytes);
    return { width: img.width, height: img.height };
  } catch {
    return null;
  }
};

const editImageToExactDimensions = async ({
  LOVABLE_API_KEY,
  imageUrl,
  outputFormat,
}: {
  LOVABLE_API_KEY: string;
  imageUrl: string;
  outputFormat: OutputFormat;
}): Promise<string | null> => {
  const prompt = `
You are editing an existing social media image.

CRITICAL OUTPUT FORMAT REQUIREMENTS:
- OUTPUT DIMENSIONS: ${outputFormat.width}x${outputFormat.height} pixels
- OUTPUT MUST BE EXACTLY THIS SIZE.

INSTRUCTIONS:
- Convert this image to the exact dimensions above.
- Preserve the design, text, and composition as much as possible.
- If cropping is needed, crop minimally and keep the main subject centered.
- If extension is needed, extend the background in a natural way.
- Output only the edited image (no text).
`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
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
**CRITICAL OUTPUT FORMAT REQUIREMENTS (NON-NEGOTIABLE):**
- OUTPUT MUST BE EXACTLY: ${outputFormat.width}x${outputFormat.height} pixels
- ORIENTATION: ${outputFormat.label}
- Do NOT output any other size or orientation.

`;

    // Build image reference instructions
    const imageInstructions = `
**IMAGES PROVIDED (${totalImages} total):**
- IMAGE #1: TEMPLATE (layout/style reference ONLY)
${campaignImageUrl ? "- IMAGE #2: HERO ASSET (MUST be the main photo/product/subject)" : ""}
${additionalAssets?.length > 0 ? `- IMAGES #${campaignImageUrl ? "3" : "2"}+: ${additionalAssets.length} additional asset(s) (ALL MUST appear)` : ""}

**TEMPLATE IMAGE RULE (VERY IMPORTANT):**
- The TEMPLATE may contain its own photos/logos/illustrations.
- You MUST NOT reuse/copy any of the template's embedded photos/logos.
- Use the template ONLY for: layout, typography style, spacing, shapes, and overall aesthetic.
- Replace EVERY image/photo/logo area from the template with the provided asset images.
- If the template has more image slots than provided assets, fill remaining slots with abstract shapes/gradients/textures (NOT random stock photos).

**ASSET USAGE RULE (VERY IMPORTANT):**
- You MUST use ALL provided asset images (hero + additional assets) in the final design.
- Do NOT introduce any new photos not provided by the user.

`;

    const placementInstructions = campaignImageUrl
      ? `
ASSET PLACEMENT REQUIREMENTS:
- The HERO ASSET (IMAGE #2) must replace the template's main photo area and be the dominant visual.
- Additional assets must be visible (logos can go in corners/footer; secondary images can be smaller).
`
      : "";


    if (isEditMode) {
      // Edit mode - modify existing generated image
      fusionPrompt =
        dimensionInstructions +
        `Edit this social media post image with the following changes: ${postText || customPrompt}

IMPORTANT:
- Make the requested changes while maintaining the overall design quality
- Keep text readable and colors consistent
- Maintain the ${outputFormat.label} (${outputFormat.width}x${outputFormat.height}) dimensions
- Output only the edited image, no additional text`;
    } else if (customPrompt) {
      // Use custom prompt from review step, but PREPEND mandatory format + asset rules
      fusionPrompt =
        dimensionInstructions +
        imageInstructions +
        placementInstructions +
        `
CUSTOM INSTRUCTIONS:
${customPrompt}

REMINDERS:
- Output image MUST be exactly ${outputFormat.width}x${outputFormat.height} pixels (${outputFormat.label}).
- Use ALL provided asset images.
- Do NOT copy any embedded photos/logos from the template.
- Do NOT introduce any new photos not provided by the user.
`;
    } else {
      // Standard fusion prompt with aspect ratio
      fusionPrompt =
        dimensionInstructions +
        `Create a professional social media post image using the following content:

${imageInstructions}
${placementInstructions}

TEMPLATE (IMAGE #1):
The first image is the TEMPLATE. Use it ONLY as the layout/style reference (typography style, spacing, shapes, and composition).
Do NOT reuse any photos/logos/illustrations visible in the template.
Replace every photo/logo area with the provided asset images.

`;

      if (campaignImageUrl) {
        fusionPrompt += `HERO ASSET (IMAGE #2):
This is the main product/campaign image. It MUST be the dominant hero photo and replace the template's main photo area.

`;
      }

      if (additionalAssets?.length > 0) {
        fusionPrompt += `ADDITIONAL ASSETS (IMAGES #${campaignImageUrl ? "3" : "2"}+):
${additionalAssets.length} additional asset(s) provided. ALL must appear visibly in the final design:
- Logos: corners/footer
- Secondary images: smaller supporting visuals

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
1. OUTPUT MUST BE EXACTLY ${outputFormat.width}x${outputFormat.height} pixels (${outputFormat.label})
2. Use ONLY the provided asset images for photos/logos (do not copy photos/logos from the template)
3. Use ALL provided asset images (hero + additional assets)
4. Do NOT introduce any new photos not provided by the user
5. Ensure all text is legible with proper contrast
6. Output ONLY the generated image - no additional text or descriptions`;
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

    let generatedImageUrl = images[0]?.image_url?.url;
    if (!generatedImageUrl) {
      throw new Error("Failed to extract generated image URL");
    }

    // Reliability: if the model ignores the requested dimensions, do a second pass edit to force exact size.
    const size = await getImageSize(generatedImageUrl);
    if (size && (size.width !== outputFormat.width || size.height !== outputFormat.height)) {
      console.warn(
        "Generated image size mismatch:",
        `${size.width}x${size.height} (got) vs ${outputFormat.width}x${outputFormat.height} (wanted)`
      );
      const resized = await editImageToExactDimensions({
        LOVABLE_API_KEY,
        imageUrl: generatedImageUrl,
        outputFormat,
      });
      if (resized) {
        const resizedSize = await getImageSize(resized);
        if (!resizedSize || (resizedSize.width === outputFormat.width && resizedSize.height === outputFormat.height)) {
          generatedImageUrl = resized;
        }
      }
    }

    return new Response(
      JSON.stringify({
        imageUrl: generatedImageUrl,
        message: data.choices?.[0]?.message?.content || "Social post generated successfully!",
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
