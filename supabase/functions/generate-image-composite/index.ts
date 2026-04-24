import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// Confirmed working endpoint
const NB_BASE = "https://www.nananobanana.com/api/v1";
const NB_MODEL = "nano-banana";
const FALLBACK_NB_KEY = "nb_a938d5cdc362fe2363a0031634e0eef1e1ad4776c1da0433e63d126e37948ba3";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function extractBrief(body: Record<string, unknown>): string {
  if (body["brief"])    return String(body["brief"]);
  if (body["sigmab"])   return String(body["sigmab"]);
  if (body["\u03c3b"]) return String(body["\u03c3b"]);
  if (body["\u03beb"]) return String(body["\u03beb"]);
  if (body["\u039eb"]) return String(body["\u039eb"]);
  if (body["prompt"])  return String(body["prompt"]);
  // Fallback: first string value > 10 chars that isn't a control field
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && v.length > 10) {
      const kl = k.toLowerCase();
      if (!kl.startsWith("platform") && kl !== "count" && kl !== "lane" && !kl.startsWith("raw")) {
        return v;
      }
    }
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("OK", { headers: CORS });
  if (req.method !== "POST")   return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json() as Record<string, unknown>;
    const brief     = extractBrief(body);
    const count     = (body.count as number | undefined) ?? 1;
    const platforms = body.platforms as string[] | undefined;

    if (!brief || !platforms?.length) {
      return json({
        error: "Missing required fields: brief, platforms",
        received: { brief: !!brief, platforms: !!(platforms?.length) },
        keys_seen: Object.keys(body),
      }, 400);
    }

    const apiKey = Deno.env.get("NB_API_KEY") || FALLBACK_NB_KEY;
    const tokensIn = Math.ceil(brief.length / 4);
    const tokensPerImage = 50;

    // Group platforms into batches of up to 4 (one batch = one "grid" of 4 tiles)
    const grids: string[][] = [];
    for (let i = 0; i < platforms.length; i += 4) {
      grids.push(platforms.slice(i, i + 4));
    }

    // For each batch, generate 4 individual images in parallel (much faster than one 2x2 mega-image)
    const variationHints = [
      "hero shot, centered composition, bold and striking",
      "lifestyle angle, contextual scene, natural setting",
      "close-up detail, macro focus, premium texture",
      "wide environmental shot, atmospheric, cinematic mood",
    ];

    const generateOne = async (variantPrompt: string): Promise<string | null> => {
      try {
        const res = await fetch(`${NB_BASE}/generate`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: variantPrompt, selectedModel: NB_MODEL, mode: "sync" }),
        });
        const data = await res.json() as Record<string, unknown>;
        const imageUrl = (data.imageUrls as string[])?.[0]
          ?? (data.data as Record<string, unknown>)?.outputImageUrls?.[0]
          ?? null;
        return res.ok ? imageUrl : null;
      } catch {
        return null;
      }
    };

    const gridPromises = grids.map(async (gridPlatforms) => {
      // Fire 4 single-image calls in parallel — each ~10-20s, total ~20s instead of 150s+
      const tilePromises = variationHints.map((hint) =>
        generateOne(`${brief}\n\nVARIATION: ${hint}\n- Single 1024x1024 marketing image\n- NO text, NO labels, NO watermarks\n- High quality, distinct composition`)
      );
      const tileUrls = await Promise.all(tilePromises);
      const successful = tileUrls.filter((u): u is string => !!u);

      if (successful.length > 0) {
        return {
          platforms: gridPlatforms,
          gridUrl: successful[0],          // backward-compat: first image as "grid"
          tileUrls: successful,            // all 4 individual tiles
          success: true,
        };
      }
      return {
        platforms: gridPlatforms,
        success: false,
        error: "All tile generations failed",
      };
    });

    // Execute all batches in parallel
    const gridResults = await Promise.all(gridPromises);

    // Calculate total tokens from successful grids
    const totalTokensOut = gridResults
      .filter(g => g.success)
      .reduce((sum, g) => sum + (tokensPerImage * g.platforms.length), 0);

    return json({
      grids: gridResults,
      total_platforms: platforms.length,
      tokens: {
        tokens_in: tokensIn,
        tokens_out: totalTokensOut,
        total: tokensIn + totalTokensOut,
        tokens_per_image: tokensPerImage,
      },
      api_calls: grids.length,
      batch_count: count,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-image-composite error:", msg);
    return json({ error: "Server error", details: msg }, 500);
  }
});
