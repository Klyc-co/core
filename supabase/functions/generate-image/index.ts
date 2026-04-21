import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AGENT_VERSION = 31;
const DEPLOY_VERSION = 79;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const NB_BASE = "https://www.nananobanana.com/api/v1";
const NB_MODEL = "nano-banana";
const POLL_INTERVAL_MS = 4_000;
const POLL_MAX_ATTEMPTS = 30; // 120s

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://wkqiielsazzbxziqmgdb.supabase.co";
const COMPOSITE_FN_URL = `${SUPABASE_URL}/functions/v1/generate-image-composite`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function sanitizeKey(raw: string): string {
  return raw.trim().replace(/[\r\n\t]/g, "");
}

function sanitizePrompt(s: string): string {
  return s
    .replace(/\u2014/g, "-").replace(/\u2013/g, "-")
    .replace(/\u2019/g, "'").replace(/\u201c|\u201d/g, '"')
    .replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
}

function resolveApiKey(req: Request, body: Record<string, unknown>): string {
  // Prefer env secret first; only fall back to header/body if explicitly an NB key (nb_...)
  const envKey = Deno.env.get("NB_API_KEY") ?? "";
  if (envKey.length > 10) return sanitizeKey(envKey);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = sanitizeKey(authHeader.slice(7));
    // Only use as NB key if it looks like one (NB keys start with "nb_")
    if (token.startsWith("nb_") && token.length > 10) return token;
  }
  const bodyKey = sanitizeKey(String(body["nb_key"] ?? body["api_key"] ?? ""));
  if (bodyKey.startsWith("nb_") && bodyKey.length > 10) return bodyKey;
  throw new Error("No NB API key");
}

async function nbPost(apiKey: string, prompt: string): Promise<string> {
  const safe = sanitizePrompt(prompt);
  const payload = { prompt: safe, selectedModel: NB_MODEL, mode: "async" };
  console.log("NB POST prompt:", safe.slice(0, 200));
  const res = await fetch(`${NB_BASE}/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(`NB POST status=${res.status}:`, text.slice(0, 500));
  if (!res.ok) throw new Error(`NB POST HTTP ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text) as Record<string, unknown>;
  const gid = String(data["generationId"] ?? "");
  if (!gid) throw new Error(`NB POST missing generationId: ${text.slice(0, 300)}`);
  return gid;
}

async function nbPoll(apiKey: string, gid: string): Promise<{ status: string; imageUrl?: string; errorMessage?: string }> {
  for (let i = 1; i <= POLL_MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${NB_BASE}/generate?id=${encodeURIComponent(gid)}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`NB poll HTTP ${res.status}: ${text.slice(0, 200)}`);
    const d = JSON.parse(text) as Record<string, unknown>;
    const inner = (d["data"] ?? d) as Record<string, unknown>;
    const status = String(inner["processingStatus"] ?? "");
    console.log(`poll ${i} status=${status} gid=${gid}`);
    if (status === "completed") {
      const urls = inner["outputImageUrls"] as string[] | undefined;
      return { status, imageUrl: urls?.[0] };
    }
    if (status === "failed") {
      return { status, errorMessage: String(inner["errorMessage"] ?? "NB generation failed") };
    }
  }
  return { status: "processing" };
}

function extractBrief(body: Record<string, unknown>): string {
  if (body["test_prompt"]) return String(body["test_prompt"]);
  if (body["brief"])    return String(body["brief"]);
  if (body["sigmab"])   return String(body["sigmab"]);
  if (body["\u03c3b"]) return String(body["\u03c3b"]);  // σb
  if (body["\u03beb"]) return String(body["\u03beb"]);  // ξb
  if (body["\u039eb"]) return String(body["\u039eb"]);  // Ξb
  if (body["prompt"])  return String(body["prompt"]);
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && v.length > 10) {
      const kl = k.toLowerCase();
      if (!kl.startsWith("platform") && kl !== "count" && kl !== "lane"
          && !kl.startsWith("raw") && !kl.startsWith("test") && kl !== "nb_key"
          && kl !== "model") {
        return v;
      }
    }
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  console.log(`generate-image v${AGENT_VERSION}/deploy${DEPLOY_VERSION} invoked`);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  console.log("keys:", Object.keys(body).join(", "));

  const brief = extractBrief(body);
  if (!brief) return json({ error: "Missing brief / prompt", receivedKeys: Object.keys(body) }, 400);

  let apiKey: string;
  try { apiKey = resolveApiKey(req, body); }
  catch (e) { return json({ error: `API key: ${e instanceof Error ? e.message : e}` }, 401); }

  const count = Number(body["count"] ?? 1);
  const platforms = (body["platforms"] as string[] | undefined)
    ?? (body["\u03c0f"] as string[] | undefined)  // πf
    ?? [];
  const effectiveCount = Math.max(count, platforms.length > 0 ? platforms.length : 1);
  const isComposite = !!body["composite"];
  const isRaw = body["raw_vs_compressed"] === true;

  if (isComposite || (!isRaw && effectiveCount > 1)) {
    console.log(`composite path: count=${effectiveCount}, platforms=${platforms.length}`);
    const finalPlatforms = platforms.length >= effectiveCount
      ? platforms.slice(0, effectiveCount)
      : Array.from({ length: effectiveCount }, (_, i) => `platform@${i}`);

    try {
      const res = await fetch(COMPOSITE_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, count: effectiveCount, platforms: finalPlatforms }),
      });
      const compositeData = await res.json() as Record<string, unknown>;
      const grids = compositeData["grids"] as Array<{ platforms: string[]; gridUrl: string; success: boolean }> | undefined;

      if (!grids?.length) {
        return json({ error: "Composite generation failed", details: compositeData, deployVersion: DEPLOY_VERSION }, 500);
      }

      const sigmaO: Record<string, string> = {};
      const batch_detail: Array<Record<string, unknown>> = [];
      let idx = 0;
      for (const grid of grids) {
        if (grid.success && grid.gridUrl) {
          for (const platform of grid.platforms) {
            sigmaO[platform] = grid.gridUrl;
            batch_detail.push({ platform, url: grid.gridUrl, index: idx++ });
          }
        }
      }

      const tokensData = compositeData["tokens"] as Record<string, unknown> | undefined;
      const totalTok = Number(tokensData?.["total"] ?? grids.filter(g => g.success).length * 50);
      const perImgTok = batch_detail.length > 0 ? Math.ceil(totalTok / batch_detail.length) : 50;

      return json({
        success: true,
        sigmaO,
        batch_detail,
        totalImages: batch_detail.length,
        tokens: {
          tokens_per_image: perImgTok,
          total: totalTok,
          tokens_in: tokensData?.["tokens_in"] ?? 0,
          tokens_out: tokensData?.["tokens_out"] ?? totalTok,
        },
        composite: true,
        api_calls: compositeData["api_calls"] ?? grids.length,
        agentVersion: AGENT_VERSION,
        deployVersion: DEPLOY_VERSION,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("composite route failed:", msg);
      return json({ error: `Composite failed: ${msg}`, deployVersion: DEPLOY_VERSION }, 500);
    }
  }

  if (isRaw && effectiveCount > 1) {
    console.log(`parallel path: count=${effectiveCount}`);
    const finalPlatforms = platforms.length >= effectiveCount
      ? platforms.slice(0, effectiveCount)
      : Array.from({ length: effectiveCount }, (_, i) => `platform@${i}`);

    try {
      const gids = await Promise.all(
        finalPlatforms.map(p => nbPost(apiKey, `${brief} - platform: ${p}`))
      );
      const results = await Promise.all(gids.map(gid => nbPoll(apiKey, gid)));

      const sigmaO: Record<string, string> = {};
      const batch_detail: Array<Record<string, unknown>> = [];
      results.forEach((result, i) => {
        if (result.status === "completed" && result.imageUrl) {
          sigmaO[finalPlatforms[i]] = result.imageUrl;
          batch_detail.push({
            platform: finalPlatforms[i],
            url: result.imageUrl,
            index: i,
            generationId: gids[i],
          });
        }
      });

      return json({
        success: true,
        sigmaO,
        batch_detail,
        totalImages: batch_detail.length,
        tokens: { tokens_per_image: 1, total: batch_detail.length },
        agentVersion: AGENT_VERSION,
        deployVersion: DEPLOY_VERSION,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ error: msg, deployVersion: DEPLOY_VERSION }, 500);
    }
  }

  const platform = platforms[0] ?? String(body["platform"] ?? "generic");
  const prompt = body["test_prompt"]
    ? String(body["test_prompt"])
    : `${brief} - platform: ${platform}`;
  console.log("single path, prompt:", prompt.slice(0, 150));

  try {
    const gid = await nbPost(apiKey, prompt);
    const result = await nbPoll(apiKey, gid);

    if (result.status === "completed" && result.imageUrl) {
      return json({
        success: true,
        imageUrl: result.imageUrl,
        generationId: gid,
        platform,
        tokens: { tokens_per_image: 1, total: 1 },
        agentVersion: AGENT_VERSION,
        deployVersion: DEPLOY_VERSION,
      });
    }

    if (result.status === "failed") {
      return json({ error: `NB failed: ${result.errorMessage}`, generationId: gid, deployVersion: DEPLOY_VERSION }, 500);
    }

    return json({
      error: `NB still processing after 120s (generationId: ${gid}). Check NB dashboard for status.`,
      generationId: gid,
      nbStatus: "processing",
      deployVersion: DEPLOY_VERSION,
    }, 500);

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("single image failed:", msg);
    return json({ error: msg, deployVersion: DEPLOY_VERSION }, 500);
  }
});
