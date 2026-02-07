import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateImageUrl, campaignImageUrl, captionText, brandFonts, brandColors, aspectRatio } = await req.json();

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
    
    let fusionPrompt = `Analyze this social media template design and recreate it as a polished social post. `;
    
    if (campaignImageUrl) {
      fusionPrompt += `Incorporate the provided campaign/product image naturally into the template layout. `;
    }
    
    if (captionText) {
      fusionPrompt += `Use this text content: "${captionText}". `;
    }
    
    fusionPrompt += `Style guidelines:
- Use typography style similar to: ${fontsList}
- Use these brand colors: ${colorsList}
- Maintain professional social media post aesthetics
- Keep text legible with proper contrast
- Create a cohesive, polished final design ready for social media`;

    // Build message content with images
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: fusionPrompt }
    ];

    // Add template image
    messageContent.push({
      type: "image_url",
      image_url: { url: templateImageUrl }
    });

    // Add campaign image if provided
    if (campaignImageUrl) {
      messageContent.push({
        type: "image_url",
        image_url: { url: campaignImageUrl }
      });
    }

    console.log("Sending fusion request to AI with", messageContent.length, "content items");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const images = data.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      // Check if we got text instead of image
      const textContent = data.choices?.[0]?.message?.content;
      console.error("No image generated, got text:", textContent?.substring(0, 200));
      throw new Error("AI did not generate an image. Please try a different prompt.");
    }

    const generatedImageUrl = images[0]?.image_url?.url;
    if (!generatedImageUrl) {
      throw new Error("Failed to extract generated image URL");
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: generatedImageUrl,
        message: data.choices?.[0]?.message?.content || "Template fusion complete!"
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
