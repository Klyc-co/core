import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const normalizeReferenceImage = async (imageUrl: string): Promise<string | null> => {
  if (typeof imageUrl !== "string") return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (SUPPORTED_DATA_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    console.warn("Skipping unsupported reference image URL", trimmed.slice(0, 120));
    return null;
  }

  try {
    const response = await fetch(trimmed);
    if (!response.ok) {
      console.warn("Reference image fetch failed", response.status, trimmed);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      console.warn("Reference image URL did not return image content", contentType, trimmed);
      return null;
    }

    const base64 = arrayBufferToBase64(await response.arrayBuffer());
    const normalizedType = contentType.split(";")[0].toLowerCase();
    const safeType = normalizedType.match(/^image\/(png|jpeg|jpg|webp|gif)$/i) ? normalizedType : "image/png";
    return `data:${safeType};base64,${base64}`;
  } catch (error) {
    console.warn("Failed to normalize reference image", trimmed, error);
    return null;
  }
};

// Platform-specific image size presets
const PLATFORM_SIZES: Record<string, { width: number; height: number; label: string }> = {
  linkedin:  { width: 1200, height: 627,  label: "LinkedIn Feed" },
  twitter:   { width: 1200, height: 675,  label: "X/Twitter Post" },
  instagram: { width: 1080, height: 1080, label: "Instagram Square" },
  facebook:  { width: 1200, height: 630,  label: "Facebook Feed" },
  tiktok:    { width: 1080, height: 1920, label: "TikTok Cover" },
  youtube:   { width: 1280, height: 720,  label: "YouTube Thumbnail" },
  story:     { width: 1080, height: 1920, label: "Story (IG/FB)" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Health check
    if (body.action === "health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          provider: "nano-banana-2",
          platforms: Object.keys(PLATFORM_SIZES),
          version: "v2"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = body.prompt || "";
    if (!prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Image prompt required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check for direct width/height (single image mode from Creative Studio)
    const directWidth = body.width as number | undefined;
    const directHeight = body.height as number | undefined;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // If width/height provided, use Lovable AI (Nano Banana 2) for single image
    if (directWidth && directHeight && LOVABLE_API_KEY) {
      try {
        const referenceImages: string[] = body.referenceImages || [];
        const normalizedReferenceImages = (
          await Promise.all(referenceImages.map((imgUrl) => normalizeReferenceImage(imgUrl)))
        ).filter((imgUrl): imgUrl is string => Boolean(imgUrl));
        const inspirationImageUrl = await normalizeReferenceImage(body.inspirationImageUrl || "");
        if (inspirationImageUrl && !normalizedReferenceImages.includes(inspirationImageUrl)) {
          normalizedReferenceImages.unshift(inspirationImageUrl);
        }

        // Build message content — multimodal if reference images are provided
        let messageContent: any;
        if (normalizedReferenceImages.length > 0) {
          const parts: any[] = [];
          // Add reference images first
          for (const imgUrl of normalizedReferenceImages) {
            parts.push({ type: "image_url", image_url: { url: imgUrl } });
          }
          // Add the text prompt
          parts.push({
            type: "text",
            text: `Using the attached reference image(s), generate a high-quality marketing image at exactly ${directWidth}x${directHeight} pixels. Incorporate the product/subject from the reference image(s) into the scene. Instructions: ${prompt}`,
          });
          messageContent = parts;
        } else {
          if (referenceImages.length > 0) {
            console.warn("All reference images were skipped after normalization; falling back to text-only generation");
          }
          messageContent = `Generate a high-quality marketing image at exactly ${directWidth}x${directHeight} pixels. The image should be: ${prompt}`;
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [
              {
                role: "user",
                content: messageContent,
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "Unknown error");
          console.error("AI gateway error:", response.status, errText);
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in workspace settings." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          throw new Error("No image returned from AI");
        }

        return new Response(JSON.stringify({
          imageUrl,
          size: `${directWidth}x${directHeight}`,
          model: "nano-banana-2",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Single image generation error:", err);
        return new Response(
          JSON.stringify({ error: err.message || "Image generation failed." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Legacy multi-platform generation path ---
    const platforms: string[] = body.platforms || Object.keys(PLATFORM_SIZES);
    const useBatch = body.batch !== false;

    const nanoBananaKey = Deno.env.get("NANO_BANANA_API_KEY");
    if (!nanoBananaKey) {
      console.error("NANO_BANANA_API_KEY is not set in environment variables.");
      return new Response(
        JSON.stringify({ error: "Nano Banana API key not configured. Please add NANO_BANANA_API_KEY in project secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nanoBananaEndpoint = Deno.env.get("NANO_BANANA_API_URL") || "https://api.nanobanana.com/v1/generate";

    const results: Record<string, any> = {};
    let totalCost = 0;
    let totalImages = 0;

    for (const platform of platforms) {
      const size = PLATFORM_SIZES[platform];
      if (!size) {
        results[platform] = { error: `Unknown platform: ${platform}` };
        continue;
      }

      try {
        const response = await fetch(nanoBananaEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nanoBananaKey}`,
          },
          body: JSON.stringify({
            prompt: prompt,
            width: size.width,
            height: size.height,
            model: "nano-banana-2",
            batch: useBatch,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "Unknown error");
          results[platform] = { error: `Nano Banana error: ${errText}`, status: response.status };
          continue;
        }

        const data = await response.json();

        const pixels = size.width * size.height;
        let imageCost;
        if (pixels <= 512 * 512) imageCost = useBatch ? 0.022 : 0.045;
        else if (pixels <= 1024 * 1024) imageCost = useBatch ? 0.034 : 0.067;
        else if (pixels <= 2048 * 2048) imageCost = useBatch ? 0.050 : 0.101;
        else imageCost = useBatch ? 0.075 : 0.151;

        totalCost += imageCost;
        totalImages++;

        results[platform] = {
          url: data.url || data.image_url || null,
          size: `${size.width}x${size.height}`,
          label: size.label,
          cost: imageCost,
          model: "nano-banana-2",
          batch: useBatch,
        };
      } catch (err) {
        results[platform] = { error: err.message };
      }
    }

    return new Response(JSON.stringify({
      images: results,
      totalImages,
      totalCost,
      model: "nano-banana-2",
      batch: useBatch,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({ error: "Image generation failed. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
