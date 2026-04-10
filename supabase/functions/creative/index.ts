import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KNP_NULL = "∅";
const KNP_JOINER = "⊕";
const KNP_SEP = "∷";

// Platform constraints
const PLATFORM_LIMITS: Record<string, { maxChars: number; hashtagCount: number; format: string }> = {
  tiktok: { maxChars: 2200, hashtagCount: 5, format: "Hook in first 1-3s, casual tone, trending audio refs" },
  instagram: { maxChars: 2200, hashtagCount: 5, format: "Visual-first, caption format, emoji OK" },
  linkedin: { maxChars: 3000, hashtagCount: 3, format: "Professional, data-driven hooks, longer form" },
  twitter: { maxChars: 280, hashtagCount: 2, format: "Punchy, thread-friendly, under 280 chars" },
  facebook: { maxChars: 2000, hashtagCount: 3, format: "Conversational, community-oriented" },
};

interface Guardrail {
  claim: string;
  evidence: string;
  risk: "safe" | "caution" | "blocked";
}

interface CreativeVariant {
  headline: string;
  body: string;
  cta: string;
  hook: string;
  hashtags: string[];
  reasoning: string;
  risk_level: "safe" | "moderate" | "bold";
  preliminary_vs_estimate: number;
  platform: string;
}

interface CreativeInput {
  brief: string;
  audience: string;
  voice: string;
  narrative: Record<string, unknown> | null;
  platforms: string[];
  guardrails: Guardrail[];
  keywords: string[];
  positioning: Record<string, unknown> | null;
  client_id: string | null;
}

function parseKnp(val: unknown): string {
  if (val === null || val === undefined) return KNP_NULL;
  const s = String(val).trim();
  return s === "" ? KNP_NULL : s;
}

function isNull(v: string): boolean {
  return v === KNP_NULL || v === "" || v === "null" || v === "undefined";
}

function splitJoined(v: string): string[] {
  if (isNull(v)) return [];
  return v.split(KNP_JOINER).map(s => s.trim()).filter(Boolean);
}

function parseJsonField(v: string): Record<string, unknown> | null {
  if (isNull(v)) return null;
  try { return JSON.parse(v); } catch { return null; }
}

function buildGuardrailInstructions(guardrails: Guardrail[]): string {
  if (!guardrails.length) return "No specific guardrails.";
  const blocked = guardrails.filter(g => g.risk === "blocked");
  const caution = guardrails.filter(g => g.risk === "caution");
  const safe = guardrails.filter(g => g.risk === "safe");
  let out = "";
  if (blocked.length) out += `BLOCKED CLAIMS (DO NOT USE): ${blocked.map(g => g.claim).join(", ")}\n`;
  if (caution.length) out += `CAUTION CLAIMS (use carefully, flag in reasoning): ${caution.map(g => `"${g.claim}" — ${g.evidence}`).join("; ")}\n`;
  if (safe.length) out += `SAFE CLAIMS (approved): ${safe.map(g => `"${g.claim}"`).join(", ")}\n`;
  return out;
}

async function logHealth(
  submindId: string,
  success: boolean,
  latencyMs: number,
  tokensIn: number | null = null,
  tokensOut: number | null = null,
): Promise<void> {
  try {
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await _sb.from("submind_health_snapshots").insert({
      submind_id: submindId,
      invocation_count: 1,
      success_count: success ? 1 : 0,
      error_count: success ? 0 : 1,
      avg_latency_ms: latencyMs,
      avg_tokens_in: tokensIn,
      avg_tokens_out: tokensOut,
      window_start: new Date().toISOString(),
    });
  } catch (_) { /* non-blocking */ }
}

async function generateCreativeVariants(input: CreativeInput): Promise<CreativeVariant[]> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const platformSpecs = input.platforms
    .map(p => {
      const spec = PLATFORM_LIMITS[p] || PLATFORM_LIMITS.instagram;
      return `- ${p}: max ${spec.maxChars} chars, ${spec.hashtagCount} hashtags, style: ${spec.format}`;
    })
    .join("\n");

  const systemPrompt = `You are a creative copywriter and campaign content strategist. You generate campaign copy variants. NEVER reference internal system names, protocols, or technical identifiers in any output.

TASK: Generate exactly 3 creative variants at different risk levels.

VARIANT LEVELS:
- Variant A (safe): Combinatorial — remix proven patterns. Low risk, reliable.
- Variant B (moderate): Exploratory — novel angle on known format. Medium risk.
- Variant C (bold): Transformational — unexpected, pattern-breaking approach. High risk/reward.

BRAND VOICE: ${input.voice || "conversational, authentic"}
AUDIENCE: ${input.audience}
${input.narrative ? `NARRATIVE FRAMEWORK: ${JSON.stringify(input.narrative)}` : ""}
${input.positioning ? `POSITIONING: ${JSON.stringify(input.positioning)}` : ""}

GUARDRAILS:
${buildGuardrailInstructions(input.guardrails)}

PLATFORM SPECS:
${platformSpecs}
Primary platform: ${input.platforms[0] || "instagram"}

${input.keywords.length ? `KEYWORDS to incorporate: ${input.keywords.join(", ")}` : ""}

Return ONLY a JSON array of exactly 3 objects:
[
  {
    "headline": "...",
    "body": "... (respect platform char limit)",
    "cta": "...",
    "hook": "... (first 3 seconds / first line)",
    "hashtags": ["...", "..."],
    "reasoning": "Why this approach works for this audience/platform",
    "risk_level": "safe|moderate|bold",
    "preliminary_vs_estimate": 0.0-1.0,
    "platform": "${input.platforms[0] || "instagram"}"
  }
]
Distribute across platforms: ${input.platforms.join(", ")}. Each variant on a different platform if possible.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Brief: ${input.brief}` },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic API error:", response.status, errText);
    if (response.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const aiResult = await response.json();
  const raw = aiResult.content?.[0]?.text || "[]";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON array");

  const parsed = JSON.parse(jsonMatch[0]) as CreativeVariant[];
  return parsed.slice(0, 3).map((v, i) => ({
    headline: v.headline || "",
    body: v.body || "",
    cta: v.cta || "",
    hook: v.hook || "",
    hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
    reasoning: v.reasoning || "",
    risk_level: (["safe", "moderate", "bold"] as const)[i] || "safe",
    preliminary_vs_estimate: typeof v.preliminary_vs_estimate === "number" ? v.preliminary_vs_estimate : 0.5,
    platform: v.platform || input.platforms[i % input.platforms.length] || "instagram",
  }));
}

function encodeVariantsKnp(variants: CreativeVariant[]): string {
  return variants
    .map(v =>
      `headline${KNP_SEP}${v.headline}${KNP_JOINER}hook${KNP_SEP}${v.hook}${KNP_JOINER}body${KNP_SEP}${v.body.slice(0, 300)}${KNP_JOINER}cta${KNP_SEP}${v.cta}${KNP_JOINER}risk${KNP_SEP}${v.risk_level}${KNP_JOINER}vs${KNP_SEP}${v.preliminary_vs_estimate}${KNP_JOINER}platform${KNP_SEP}${v.platform}`
    )
    .join("|||");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();

    // Decode KNP input
    const brief = parseKnp(body.ξb ?? body["ξb"]);
    const audience = parseKnp(body.zq ?? body["zq"]);
    const voiceRaw = parseKnp(body.λv ?? body["λv"]);
    const positioningRaw = parseKnp(body.Π ?? body["Π"]);
    const narrativeRaw = parseKnp(body.Ν ?? body["Ν"]);
    const keywordsRaw = parseKnp(body.κw ?? body["κw"]);
    const platformsRaw = parseKnp(body.πf ?? body["πf"] ?? body.μp ?? body["μp"]);
    const guardrailsRaw = parseKnp(body.Γ ?? body["Γ"]);
    const clientId = parseKnp(body.θc_client ?? body.client_id);

    if (isNull(brief)) {
      return new Response(
        JSON.stringify({ version: "Ψ3", submind: "creative", status: "error", σo: KNP_NULL, error: "Brief (ξb) is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const platforms = splitJoined(platformsRaw);
    if (!platforms.length) platforms.push("instagram", "tiktok");

    let guardrails: Guardrail[] = [];
    if (!isNull(guardrailsRaw)) {
      try { guardrails = JSON.parse(guardrailsRaw); } catch { /* ignore */ }
    }

    // Load client brain context for voice if needed
    let brainVoice = "";
    if (!isNull(clientId) && isNull(voiceRaw)) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data } = await supabase.from("client_brain").select("brand_voice").eq("client_id", clientId).limit(1).single();
        if (data?.brand_voice) brainVoice = JSON.stringify(data.brand_voice);
      } catch { /* ignore */ }
    }

    const input: CreativeInput = {
      brief,
      audience: isNull(audience) ? "general audience" : audience,
      voice: isNull(voiceRaw) ? (brainVoice || "conversational, authentic") : voiceRaw,
      narrative: parseJsonField(narrativeRaw),
      platforms,
      guardrails,
      keywords: splitJoined(keywordsRaw),
      positioning: parseJsonField(positioningRaw),
      client_id: isNull(clientId) ? null : clientId,
    };

    const variants = await generateCreativeVariants(input);

    // Log to creative_log
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("creative_log").insert({
        client_id: input.client_id,
        iteration: 1,
        variants,
        model_type: "CREATIVE_V2",
        voice_type: input.voice.slice(0, 50),
      });
    } catch (e) {
      console.warn("Failed to log creative output:", e);
    }

    const elapsed = Date.now() - startTime;
    await logHealth("creative", true, elapsed, null, null);

    return new Response(
      JSON.stringify({
        version: "Ψ3",
        submind: "creative",
        status: "complete",
        θc: encodeVariantsKnp(variants),
        σo: JSON.stringify(variants),
        variant_count: variants.length,
        variants_structured: variants,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    const status = errMsg === "RATE_LIMITED" ? 429 : 500;
    const elapsed = Date.now() - startTime;
    await logHealth("creative", false, elapsed, null, null);
    return new Response(
      JSON.stringify({ version: "Ψ3", submind: "creative", status: "error", σo: KNP_NULL, error: errMsg, elapsed_ms: elapsed }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
