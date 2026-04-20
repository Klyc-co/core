import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_ID = "image";
const AGENT_VERSION = "v28";
const PERMITTED_LANES = new Set(["image"]);
const STORAGE_BUCKET = "generated-images";

const NB_API_BASE = "https://www.nananobanana.com/api/v1";
const NB_MODEL = "nano-banana";
const FALLBACK_NB_KEY = "nb_a938d5cdc362fe2363a0031634e0eef1e1ad4776c1da0433e63d126e37948ba3";

function knpEnvelope(sigmaO: unknown, elapsedMs: number, confidence = 0.95): Record<string, unknown> {
  return {
    "σo": sigmaO,
    "δi": AGENT_ID,
    "κw": confidence,
    "τt": new Date().toISOString(),
    "ρs": `generate-image∷${AGENT_VERSION}`,
    "knp": "Ψ3",
    "elapsed_ms": elapsedMs,
  };
}

function sanitizeKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^\x20-\x7E]/g, "").trim();
}

function resolveApiKey(): string {
  const fromEnv = sanitizeKey(
    Deno.env.get("NB_API_KEY") ||
    Deno.env.get("NANO_BANANA_KEY") ||
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("LOVABLE_API_KEY")
  );
  if (fromEnv.startsWith("nb_"))    return fromEnv;
  if (fromEnv.startsWith("AIzaSy")) return fromEnv;
  if (fromEnv.startsWith("AQ."))    return fromEnv;
  return FALLBACK_NB_KEY;
}

const PLATFORM_SIZES: Record<string, { width: number; height: number; label: string }> = {
  linkedin:  { width: 1200, height: 627,  label: "LinkedIn Feed" },
  twitter:   { width: 1200, height: 675,  label: "X/Twitter Post" },
  instagram: { width: 1080, height: 1080, label: "Instagram Square" },
  facebook:  { width: 1200, height: 630,  label: "Facebook Feed" },
  tiktok:    { width: 1080, height: 1920, label: "TikTok Cover" },
  youtube:   { width: 1280, height: 720,  label: "YouTube Thumbnail" },
  story:     { width: 1080, height: 1920, label: "Story (IG/FB)" },
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  base64Data: string,
  mimeType: string,
): Promise<string> {
  const bytes = base64ToUint8Array(base64Data);
  const ext = mimeType.split("/")[1]?.split("+")[0] || "jpg";
  const fileName = `campaign-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, bytes, {
    contentType: mimeType, upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${(error as Error).message}`);
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const resp = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (!resp.ok) return longUrl;
    const short = await resp.text();
    return short.startsWith("https://") ? short : longUrl;
  } catch { return longUrl; }
}

// ── Nano Banana API ──────────────────────────────────────────────────────────
async function callNanoBanana(
  apiKey: string,
  prompt: string,
  referenceImageUrls: string[] = [],
): Promise<{ base64: string; mimeType: string }> {
  const body: Record<string, unknown> = {
    prompt,
    selectedModel: NB_MODEL,
    mode: "sync",
  };
  const webRefs = referenceImageUrls.filter(u => /^https?:\/\//i.test(u));
  if (webRefs.length > 0) body.referenceImageUrls = webRefs;

  const response = await fetch(`${NB_API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`NanoBanana API ${response.status}: ${errText.slice(0, 400)}`);
  }

  const data = await response.json();
  // Sync response: { success, generationId, imageUrls: [...], creditsUsed, remainingCredits }
  // Async poll response: { data: { outputImageUrls: [...] } }
  const imageUrl = data.imageUrls?.[0] || data.data?.outputImageUrls?.[0] || data.data?.imageUrls?.[0];
  if (!imageUrl) throw new Error(`NanoBanana returned no image URL. Response: ${JSON.stringify(data).slice(0, 200)}`);

  // Fetch image from Cloudflare R2 and convert to base64 for Supabase storage
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Failed to fetch generated image: ${imgResp.status}`);
  const imgBuf = await imgResp.arrayBuffer();
  const imgBytes = new Uint8Array(imgBuf);
  let binary = "";
  for (let i = 0; i < imgBytes.length; i += 0x8000)
    binary += String.fromCharCode(...imgBytes.subarray(i, i + 0x8000));
  const base64 = btoa(binary);
  const mimeType = (imgResp.headers.get("content-type") || "image/png").split(";")[0];
  return { base64, mimeType };
}

// ── Google Gemini Direct ─────────────────────────────────────────────────────
async function callGeminiDirect(
  apiKey: string, prompt: string, referenceImages: string[] = [],
): Promise<{ base64: string; mimeType: string }> {
  const parts: any[] = [];
  for (const img of referenceImages) {
    const match = img.match(/^data:([^;]+);base64,(.+)$/);
    if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
  }
  parts.push({ text: prompt });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 400)}`);
  }
  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data);
  if (!imagePart?.inline_data) throw new Error("No image returned from Gemini API");
  return { base64: imagePart.inline_data.data, mimeType: imagePart.inline_data.mime_type };
}

// ── Lovable Gateway ──────────────────────────────────────────────────────────
async function callLovableGateway(
  apiKey: string, prompt: string, referenceImages: string[] = [],
): Promise<{ base64: string; mimeType: string }> {
  const contentParts: any[] = [];
  for (const img of referenceImages) contentParts.push({ type: "image_url", image_url: { url: img } });
  contentParts.push({ type: "text", text: prompt });
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: contentParts }],
      modalities: ["image", "text"],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`AI Gateway ${response.status}: ${errText.slice(0, 400)}`);
  }
  const data = await response.json();
  const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageResult) throw new Error("No image returned from AI gateway");
  const match = imageResult.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Unexpected image format from AI gateway");
  return { base64: match[2], mimeType: match[1] };
}

// ── Unified caller ──────────────────────────────────────────────────────────
async function generateImage(
  apiKey: string, prompt: string, referenceImages: string[] = [],
): Promise<{ base64: string; mimeType: string }> {
  if (apiKey.startsWith("nb_"))    return callNanoBanana(apiKey, prompt, referenceImages);
  if (apiKey.startsWith("AIzaSy")) return callGeminiDirect(apiKey, prompt, referenceImages);
  return callLovableGateway(apiKey, prompt, referenceImages);
}

async function normalizeReferenceImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const r = await fetch(trimmed);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const b64 = btoa(binary);
    const safeType = ct.split(";")[0].toLowerCase().match(/^image\/(png|jpeg|webp|gif)$/) ? ct.split(";")[0].toLowerCase() : "image/png";
    return `data:${safeType};base64,${b64}`;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();

  try {
    const body = await req.json();

    if (body.action === "health") {
      const apiKey = resolveApiKey();
      return new Response(JSON.stringify({
        status: "ok", agent: AGENT_ID, version: AGENT_VERSION,
        key_source: apiKey === FALLBACK_NB_KEY ? "hardcoded_fallback" : "env_var",
        key_type: apiKey.startsWith("nb_") ? "nano_banana" : apiKey.startsWith("AIzaSy") ? "google_direct" : "lovable_gateway",
        model: NB_MODEL,
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const requestedLane = body.lane as string | undefined;
    if (requestedLane && !PERMITTED_LANES.has(requestedLane)) {
      return new Response(JSON.stringify({
        error: `Lane violation: [${AGENT_ID}] only serves [${[...PERMITTED_LANES].join(", ")}]. Requested: ${requestedLane}`,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = resolveApiKey();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const briefRaw = body["ξb"] || body.prompt || "";
    const prompt = String(briefRaw).trim();
    const clientContext = String(body["θc"] || "").trim();
    const platform = String(body["μp"] || "tiktok").trim();

    if (!prompt) {
      return new Response(JSON.stringify(
        knpEnvelope({ error: "Image prompt required" }, Date.now() - start, 0)
      ), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawRefs: string[] = body.referenceImages || [];
    const inspirationRaw: string = body.inspirationImageUrl || "";
    const normalizedRefs = (await Promise.all(rawRefs.map(u => normalizeReferenceImage(u)))).filter(Boolean) as string[];
    const inspirationNorm = await normalizeReferenceImage(inspirationRaw);
    if (inspirationNorm && !normalizedRefs.includes(inspirationNorm)) normalizedRefs.unshift(inspirationNorm);

    const directWidth = body.width as number | undefined;
    const directHeight = body.height as number | undefined;
    const isKnpDispatch = requestedLane === "image";

    if (isKnpDispatch || (directWidth && directHeight)) {
      const contextStr = clientContext ? ` Context: ${clientContext}.` : "";
      const aspectPrompt = (directWidth && directHeight)
        ? `Generate a high-quality marketing image with a ${directWidth}x${directHeight} aspect ratio.${contextStr} ${normalizedRefs.length ? "Use the attached reference images to incorporate the product/subject. " : ""}${prompt}`
        : `Generate a high-quality marketing campaign image for ${platform}.${contextStr} ${normalizedRefs.length ? "Use the attached reference images to incorporate the product/subject. " : ""}${prompt}`;

      const { base64, mimeType } = await generateImage(apiKey, aspectPrompt, normalizedRefs);
      const publicUrl = await uploadToStorage(supabase, base64, mimeType);
      const imageUrl = await shortenUrl(publicUrl);
      return new Response(JSON.stringify(knpEnvelope(imageUrl, Date.now() - start)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const platforms: string[] = body.platforms || Object.keys(PLATFORM_SIZES);
    const sigmaOImages: Record<string, string> = {};
    let totalImages = 0;
    const errors: string[] = [];

    for (const plt of platforms) {
      const size = PLATFORM_SIZES[plt];
      if (!size) { errors.push(`Unknown platform: ${plt}`); continue; }
      try {
        const platformPrompt = `Generate a high-quality ${size.label} marketing image (${size.width}x${size.height} aspect ratio). ${normalizedRefs.length ? "Use the attached reference images. " : ""}${prompt}`;
        const { base64, mimeType } = await generateImage(apiKey, platformPrompt, normalizedRefs);
        const publicUrl = await uploadToStorage(supabase, base64, mimeType);
        const imageUrl = await shortenUrl(publicUrl);
        totalImages++;
        sigmaOImages[plt] = imageUrl;
      } catch (err: any) {
        errors.push(`${plt}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify(
      { ...knpEnvelope(sigmaOImages, Date.now() - start), totalImages, ...(errors.length ? { errors } : {}) }
    ), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("generate-image error:", error);
    return new Response(JSON.stringify(
      knpEnvelope({ error: (error as Error).message || "Image generation failed" }, Date.now() - start, 0)
    ), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
