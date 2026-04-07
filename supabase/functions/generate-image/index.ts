import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Which platforms to generate for (default: all)
    const platforms: string[] = body.platforms || Object.keys(PLATFORM_SIZES);

    // Use batch mode if available (50% cheaper)
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

    // Generate images for each platform
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

        // Cost estimation based on resolution tier (Nano Banana 2 pricing 2026)
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
