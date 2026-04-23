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

    // Group platforms into 2x2 grids of up to 4
    const grids: string[][] = [];
    for (let i = 0; i < platforms.length; i += 4) {
      grids.push(platforms.slice(i, i + 4));
    }

    // Make ALL grid API calls in PARALLEL to avoid timeout
    const gridPromises = grids.map(async (gridPlatforms) => {
      const gridPrompt = `${brief}\n\nCRITICAL INSTRUCTIONS:\n- Generate EXACTLY 4 distinct marketing images in a 2x2 GRID LAYOUT\n- Canvas size: 2160x2160 pixels (4 images of 1080x1080 each)\n- Each quadrant shows a different variation/angle of the concept\n- NO text, NO labels, NO borders between images\n- Seamless layout - images should tile perfectly\n- All 4 variations visually distinct but cohesive`;

      try {
        const res = await fetch(`${NB_BASE}/generate`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: gridPrompt, selectedModel: NB_MODEL, mode: "sync" }),
        });

        const data = await res.json() as Record<string, unknown>;
        // Sync response: { success, imageUrls: [...], creditsUsed, remainingCredits }
        const imageUrl = (data.imageUrls as string[])?.[0]
          ?? (data.data as Record<string, unknown>)?.outputImageUrls?.[0]
          ?? null;

        if (res.ok && imageUrl) {
          return { platforms: gridPlatforms, gridUrl: imageUrl, success: true };
        } else {
          return {
            platforms: gridPlatforms,
            success: false,
            error: (data.error as string) || `NB ${res.status}: no imageUrl`,
          };
        }
      } catch (e) {
        return {
          platforms: gridPlatforms,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    });

    // Execute all API calls in parallel
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
