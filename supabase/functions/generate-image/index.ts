import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AGENT_VERSION = 29;
const DEPLOY_VERSION = 73;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const NB_BASE = "https://www.nananobanana.com/api/v1";
const NB_MODEL = "nano-banana";
const POLL_INTERVAL_MS = 4_000;
const POLL_MAX_ATTEMPTS = 30; // 120s — increased from 80s to handle slower NB generations

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
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = sanitizeKey(authHeader.slice(7));
    if (token.length > 10) return token;
  }
  const envKey = Deno.env.get("NB_API_KEY") ?? "";
  if (envKey.length > 10) return sanitizeKey(envKey);
  const bodyKey = String(body["nb_key"] ?? body["api_key"] ?? "");
  if (bodyKey.length > 10) return sanitizeKey(bodyKey);
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
  console.log(`generationId: ${gid}`);
  return gid;
}

async function nbPoll(apiKey: string, gid: string): Promise<{ status: string; imageUrl?: string; errorMessage?: string }> {
  for (let i = 1; i <= POLL_MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${NB_BASE}/generate?id=${encodeURIComponent(gid)}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const text = await res.text();
    console.log(`poll ${i} http=${res.status}:`, text.slice(0, 400));
    if (!res.ok) throw new Error(`NB poll HTTP ${res.status}: ${text.slice(0, 200)}`);
    const d = JSON.parse(text) as Record<string, unknown>;
    const inner = (d["data"] ?? d) as Record<string, unknown>;
    const status = String(inner["processingStatus"] ?? "");
    console.log(`processingStatus: ${status} (poll ${i}/${POLL_MAX_ATTEMPTS})`);
    if (status === "completed") {
      const urls = inner["outputImageUrls"] as string[] | undefined;
      return { status, imageUrl: urls?.[0] };
    }
    if (status === "failed") {
      return { status, errorMessage: String(inner["errorMessage"] ?? "NB generation failed") };
    }
  }
  return { status: "processing" }; // still running after 120s
}

function extractBrief(body: Record<string, unknown>): string {
  if (body["test_prompt"]) return String(body["test_prompt"]);
  if (body["brief"])    return String(body["brief"]);
  if (body["sigmab"])   return String(body["sigmab"]);
  if (body["\u03c3b"]) return String(body["\u03c3b"]);
  if (body["\u03beb"]) return String(body["\u03beb"]);
  if (body["\u039eb"]) return String(body["\u039eb"]);
  if (body["prompt"])  return String(body["prompt"]);
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && v.length > 10) {
      const kl = k.toLowerCase();
      if (!kl.startsWith("platform") && kl !== "count" && kl !== "lane"
          && !kl.startsWith("raw") && !kl.startsWith("test") && kl !== "nb_key") {
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

  const platform = String(body["platform"] ?? body["platforms"] ?? "generic");
  const prompt = body["test_prompt"] ? String(body["test_prompt"]) : `${brief} - platform: ${platform}`;
  console.log("prompt:", prompt.slice(0, 150));

  try {
    const gid = await nbPost(apiKey, prompt);
    const result = await nbPoll(apiKey, gid);

    if (result.status === "completed" && result.imageUrl) {
      return json({ success: true, imageUrl: result.imageUrl, generationId: gid, platform, deployVersion: DEPLOY_VERSION });
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
    console.error("failed:", msg);
    return json({ error: msg, deployVersion: DEPLOY_VERSION }, 500);
  }
});
