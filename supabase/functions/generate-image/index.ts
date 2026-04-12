import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Lane Lock ─────────────────────────────────────────────────────────────────
const AGENT_ID = "image";
const AGENT_VERSION = "v21";
const PERMITTED_LANES = new Set(["image"]);
const GEMINI_IMAGE_MODEL = "google/gemini-2.5-flash-image";
const STORAGE_BUCKET = "generated-images";
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── KNP σo envelope builder ───────────────────────────────────────────────────
// All returns from this submind MUST be wrapped in a KNP σo envelope.
// The caller (klyc-orchestrator / normalizer) is responsible for unpacking σo
// back to full JSON for the C-lane client.
function knpEnvelope(sigmaO: unknown, elapsedMs: number, confidence = 0.95): Record<string, unknown> {
  return {
    "σo": sigmaO,           // Compressed output — image URL(s) only
    "δi": AGENT_ID,         // Identity stamp
    "κw": confidence,       // Confidence weight
    "τt": new Date().toISOString(), // Timestamp
    "ρs": `generate-image∷${AGENT_VERSION}`, // Source
    "knp": "Ψ3",
    "elapsed_ms": elapsedMs,
  };
}

// ── Platform sizes ────────────────────────────────────────────────────────────
const PLATFORM_SIZES: Record<string, { width: number; height: number; label: string }> = {
  linkedin:  { width: 1200, height: 627,  label: "LinkedIn Feed" },
  twitter:   { width: 1200, height: 675,  label: "X/Twitter Post" },
  instagram: { width: 1080, height: 1080, label: "Instagram Square" },
  facebook:  { width: 1200, height: 630,  label: "Facebook Feed" },
  tiktok:    { width: 1080, height: 1920, label: "TikTok Cover" },
  youtube:   { width: 1280, height: 720,  label: "YouTube Thumbnail" },
  story:     { width: 1080, height: 1920, label: "Story (IG/FB)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  const ext = mimeType.split("/")[1] || "png";
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
  } catch {
    return longUrl;
  }
}

async function callGemini(
  geminiKey: string, prompt: string, referenceImages: string[] = [],
): Promise<{ base64: string; mimeType: string }> {
  const parts: any[] = [];
  for (const img of referenceImages) {
    const mimeMatch = img.match(/^data:([^;]+)/);
    const mime = mimeMatch?.[1] || "image/png";
    const b64 = img.split(",")[1];
    if (b64) parts.push({ inlineData: { mimeType: mime, data: b64 } });
  }
  parts.push({ text: prompt });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`Gemini ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const imageData = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;
  if (!imageData) throw new Error("No image returned from Gemini");
  return { base64: imageData.data, mimeType: imageData.mimeType || "image/png" };
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

    // ── Health ────────────────────────────────────────────────────────────────
    if (body.action === "health") {
      return new Response(JSON.stringify({
        status: "ok", agent: AGENT_ID, version: AGENT_VERSION,
        "δi": AGENT_ID, lane: "image", model: GEMINI_IMAGE_MODEL,
        permitted_lanes: [...PERMITTED_LANES],
        platforms: Object.keys(PLATFORM_SIZES),
        knp_envelope: "σo wrapped — all returns compressed",
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── List models ───────────────────────────────────────────────────────────
    if (body.action === "list-models") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const data = await r.json();
      const imageModels = (data.models || []).filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent") &&
        (m.name?.toLowerCase().includes("image") || m.displayName?.toLowerCase().includes("image"))
      );
      return new Response(JSON.stringify({ image_models: imageModels, total: imageModels.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Lane lock ─────────────────────────────────────────────────────────────
    const requestedLane = body.lane as string | undefined;
    if (requestedLane && !PERMITTED_LANES.has(requestedLane)) {
      return new Response(JSON.stringify({
        error: `Lane violation: [${AGENT_ID}] only serves [${[...PERMITTED_LANES].join(", ")}]. Requested: ${requestedLane}`,
        "δi": AGENT_ID, lane_requested: requestedLane, permitted_lanes: [...PERMITTED_LANES],
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Resolve prompt ────────────────────────────────────────────────────────
    // Accepts KNP envelope (ξb = brief, θc = context, μp = platform)
    const briefRaw = body["ξb"] || body.prompt || "";
    const prompt = String(briefRaw).trim();
    const clientContext = String(body["θc"] || "").trim();
    const platform = String(body["μp"] || "tiktok").trim();

    if (!prompt) {
      return new Response(JSON.stringify(
        knpEnvelope({ error: "Image prompt required (ξb or prompt field)" }, Date.now() - start, 0)
      ), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Reference images
    const rawRefs: string[] = body.referenceImages || [];
    const inspirationRaw: string = body.inspirationImageUrl || "";
    const normalizedRefs = (await Promise.all(rawRefs.map(u => normalizeReferenceImage(u)))).filter(Boolean) as string[];
    const inspirationNorm = await normalizeReferenceImage(inspirationRaw);
    if (inspirationNorm && !normalizedRefs.includes(inspirationNorm)) normalizedRefs.unshift(inspirationNorm);

    // ── Single image mode (KNP lane dispatch OR directWidth/Height) ───────────
    const directWidth = body.width as number | undefined;
    const directHeight = body.height as number | undefined;
    const isKnpDispatch = requestedLane === "image";

    if (isKnpDispatch || (directWidth && directHeight)) {
      const contextStr = clientContext ? ` Context: ${clientContext}.` : "";
      const aspectPrompt = (directWidth && directHeight)
        ? `Generate a high-quality marketing image with a ${directWidth}x${directHeight} aspect ratio.${contextStr} ${normalizedRefs.length ? "Use the attached reference images to incorporate the product/subject. " : ""}${prompt}`
        : `Generate a high-quality marketing campaign image for ${platform}.${contextStr} ${normalizedRefs.length ? "Use the attached reference images to incorporate the product/subject. " : ""}${prompt}`;

      const { base64, mimeType } = await callGemini(geminiKey, aspectPrompt, normalizedRefs);
      const publicUrl = await uploadToStorage(supabase, base64, mimeType);
      const imageUrl = await shortenUrl(publicUrl);

      // ── KNP σo compressed return ──────────────────────────────────────────
      // σo contains only the essential output: the image URL.
      // Caller (orchestrator/normalizer) unpacks σo and expands to full client JSON.
      return new Response(JSON.stringify(
        knpEnvelope(imageUrl, Date.now() - start)
      ), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Multi-platform mode ───────────────────────────────────────────────────
    const platforms: string[] = body.platforms || Object.keys(PLATFORM_SIZES);
    const sigmaOImages: Record<string, string> = {};
    let totalImages = 0;
    const errors: string[] = [];

    for (const plt of platforms) {
      const size = PLATFORM_SIZES[plt];
      if (!size) { errors.push(`Unknown platform: ${plt}`); continue; }
      try {
        const platformPrompt = `Generate a high-quality ${size.label} marketing image (${size.width}x${size.height} aspect ratio). ${normalizedRefs.length ? "Use the attached reference images. " : ""}${prompt}`;
        const { base64, mimeType } = await callGemini(geminiKey, platformPrompt, normalizedRefs);
        const publicUrl = await uploadToStorage(supabase, base64, mimeType);
        const imageUrl = await shortenUrl(publicUrl);
        totalImages++;
        sigmaOImages[plt] = imageUrl; // σo: platform → URL only
      } catch (err: any) {
        errors.push(`${plt}: ${err.message}`);
      }
    }

    // ── KNP σo compressed return (multi-platform) ─────────────────────────────
    // σo = { platform: imageUrl } — minimal. Caller expands with size/label/model metadata.
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
