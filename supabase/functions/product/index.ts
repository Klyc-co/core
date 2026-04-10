// ============================================================
// PRODUCT — Truth Map Engine
// Analyzes products, classifies claims, maps features to pain
// points, provides guardrails to Creative. Only speaks KNP.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---- Protocol Constants ----
const KNP_VERSION = "Ψ3";
const KNP_FIELD_SEPARATOR = "∷";
const KNP_VALUE_JOINER = "⊕";
const KNP_NULL_MARKER = "∅";

const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv",
  κw: "κw", πf: "πf", σo: "σo", φd: "φd",
} as const;

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("|");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return "Ψ" + Math.abs(h).toString(36);
}

function knpEncode(segments: Record<string, string>): string {
  return JSON.stringify({
    version: KNP_VERSION,
    checksum: knpChecksum(segments),
    timestamp: Date.now(),
    segments,
  });
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

// ---- Claim Classification ----
interface ClaimClassification {
  green: string[];
  yellow: string[];
  red: string[];
}

function classifyClaims(features: string[], description: string): ClaimClassification {
  const green: string[] = [];
  const yellow: string[] = [];
  const red: string[] = [];

  const allClaims = [...features];
  const descSentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  allClaims.push(...descSentences.map((s) => s.trim()));

  for (const claim of allClaims) {
    const lower = claim.toLowerCase();

    if (
      /\b(the best|unmatched|unrivaled|superior to all|guaranteed results|cure|heal|treat|prevent disease)\b/i.test(lower) ||
      /\b(#1|number one|world's? (best|first|only))\b/i.test(lower)
    ) {
      red.push(claim);
      continue;
    }

    if (
      /\b(\d+%|\d+x|\d+ (times|percent|hours|days|minutes))\b/i.test(lower) ||
      /\b(certified|certification|FDA|USDA|ISO|UL|CE|organic|fair trade|patent|awarded|peer.?reviewed)\b/i.test(lower) ||
      /\b(published|study|tested|verified|validated|audited)\b/i.test(lower)
    ) {
      green.push(claim);
      continue;
    }

    if (
      /\b(premium|high.?quality|industry.?leading|best.?in.?class|cutting.?edge|innovative|revolutionary|game.?changing|world.?class)\b/i.test(lower)
    ) {
      yellow.push(claim);
      continue;
    }

    if (/\b(is|has|includes|features|provides|offers|contains|supports)\b/i.test(lower)) {
      green.push(claim);
    } else {
      yellow.push(claim);
    }
  }

  return { green, yellow, red };
}

// ---- Audience Outcome Classification ----
type AudienceOutcome = "SIMILAR" | "WIDER" | "NARROWER" | "WRONG";

function classifyAudienceOutcome(
  clientAudience: string | null,
  researchFindings: string | null
): { outcome: AudienceOutcome; explanation: string } {
  if (!clientAudience || !researchFindings) {
    return { outcome: "SIMILAR", explanation: "Insufficient data for audience comparison — defaulting to SIMILAR" };
  }

  const clientLower = clientAudience.toLowerCase();
  const researchLower = researchFindings.toLowerCase();

  const mismatchSignals = [
    "actually", "contrary", "different from", "not aligned",
    "mismatch", "wrong assumption", "data shows otherwise",
  ];
  if (mismatchSignals.some((s) => researchLower.includes(s))) {
    return {
      outcome: "WRONG",
      explanation: "Research data contradicts stated audience — correction needed",
    };
  }

  const widerSignals = [
    "untapped", "additional segment", "broader", "expand",
    "new market", "underserved", "opportunity",
  ];
  if (widerSignals.some((s) => researchLower.includes(s))) {
    return {
      outcome: "WIDER",
      explanation: "Product could reach segments competitors miss — dual messaging recommended",
    };
  }

  const narrowerSignals = [
    "niche", "specific", "specialized", "focused",
    "subset", "micro", "targeted",
  ];
  if (narrowerSignals.some((s) => researchLower.includes(s) || clientLower.includes(s))) {
    return {
      outcome: "NARROWER",
      explanation: "Product serves a niche within competitor's broader audience — hyper-targeted messaging",
    };
  }

  return {
    outcome: "SIMILAR",
    explanation: "Client and competitors target overlapping audiences — emphasize differentiation",
  };
}

// ---- Competitive Moat Scoring ----
interface MoatData {
  dimensions: string[];
  client_scores: number[];
  competitor_data: Array<{
    name: string;
    scores: number[];
  }>;
}

function buildMoatData(
  productBrief: string,
  competitors: string[],
  researchFindings: string | null
): MoatData {
  const dimensions = [
    "price_competitiveness",
    "quality_perception",
    "innovation_signals",
    "brand_trust",
    "audience_loyalty",
    "content_engagement",
    "platform_presence",
  ];

  const briefLower = productBrief.toLowerCase();
  const clientScores = dimensions.map((dim) => {
    let score = 0.5;
    switch (dim) {
      case "price_competitiveness":
        if (/\b(affordable|cheap|value|budget|low.?cost)\b/.test(briefLower)) score = 0.8;
        if (/\b(premium|luxury|high.?end|exclusive)\b/.test(briefLower)) score = 0.4;
        break;
      case "quality_perception":
        if (/\b(premium|quality|certified|award|handcraft)\b/.test(briefLower)) score = 0.8;
        break;
      case "innovation_signals":
        if (/\b(patent|first|innovative|breakthrough|proprietary|AI|tech)\b/.test(briefLower)) score = 0.8;
        break;
      case "brand_trust":
        if (/\b(years|established|trusted|reputation|heritage)\b/.test(briefLower)) score = 0.7;
        break;
    }
    return Math.round(score * 100) / 100;
  });

  const competitorData = competitors.slice(0, 5).map((name) => ({
    name,
    scores: dimensions.map(() => Math.round((0.3 + Math.random() * 0.5) * 100) / 100),
  }));

  return { dimensions, client_scores: clientScores, competitor_data: competitorData };
}

// ---- Voice Indicators ----
function extractVoiceIndicators(brief: string): Record<string, string> {
  const lower = brief.toLowerCase();
  const indicators: Record<string, string> = {};

  if (/\b(professional|corporate|formal|enterprise|B2B)\b/i.test(lower)) {
    indicators.formality = "formal";
  } else if (/\b(casual|fun|playful|young|Gen Z|millennial)\b/i.test(lower)) {
    indicators.formality = "casual";
  } else {
    indicators.formality = "balanced";
  }

  if (/\b(inspiring|empower|transform|dream|vision)\b/i.test(lower)) {
    indicators.emotion = "inspirational";
  } else if (/\b(trust|reliable|safe|secure|proven)\b/i.test(lower)) {
    indicators.emotion = "trust-building";
  } else if (/\b(urgent|act now|limited|exclusive|hurry)\b/i.test(lower)) {
    indicators.emotion = "urgency";
  } else {
    indicators.emotion = "informative";
  }

  if (/\b(technical|spec|engineer|developer|API)\b/i.test(lower)) {
    indicators.complexity = "technical";
  } else if (/\b(simple|easy|beginner|everyone|anyone)\b/i.test(lower)) {
    indicators.complexity = "simple";
  } else {
    indicators.complexity = "moderate";
  }

  return indicators;
}

// ---- AI Analysis via Anthropic ----
async function analyzeWithAI(
  brief: string,
  competitors: string[],
  researchFindings: string | null
): Promise<{
  product_name: string;
  category: string;
  features: string[];
  differentiators: string[];
  certifications: string[];
  tokensIn: number | null;
  tokensOut: number | null;
}> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { ...extractBasicInfo(brief), tokensIn: null, tokensOut: null };
  }

  const systemPrompt = `You are a product analyst. Given a product brief, extract structured information. NEVER reference internal system names, protocols, or technical identifiers in any output.
Return ONLY valid JSON with these fields:
- product_name: string
- category: string (e.g. "SaaS", "Consumer Electronics", "Food & Beverage")
- features: string[] (key features/capabilities)
- differentiators: string[] (what makes this unique vs competitors)
- certifications: string[] (any mentioned certifications, awards, compliance)

Be precise and factual. Do not invent information not in the brief.`;

  const userPrompt = `Product Brief: ${brief}
${competitors.length > 0 ? `Known Competitors: ${competitors.join(", ")}` : ""}
${researchFindings ? `Research Context: ${researchFindings}` : ""}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error("AI analysis failed:", response.status);
      return { ...extractBasicInfo(brief), tokensIn: null, tokensOut: null };
    }

    const data = await response.json();
    const tokensIn = data.usage?.input_tokens ?? null;
    const tokensOut = data.usage?.output_tokens ?? null;
    const content = data.content?.[0]?.text;
    if (!content) return { ...extractBasicInfo(brief), tokensIn, tokensOut };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ...extractBasicInfo(brief), tokensIn, tokensOut };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      product_name: parsed.product_name || "Unknown Product",
      category: parsed.category || "General",
      features: parsed.features || [],
      differentiators: parsed.differentiators || [],
      certifications: parsed.certifications || [],
      tokensIn,
      tokensOut,
    };
  } catch (e) {
    console.error("AI analysis error:", e);
    return { ...extractBasicInfo(brief), tokensIn: null, tokensOut: null };
  }
}

function extractBasicInfo(brief: string): {
  product_name: string;
  category: string;
  features: string[];
  differentiators: string[];
  certifications: string[];
} {
  const words = brief.split(/\s+/);
  const name = words.slice(0, 3).join(" ");
  const features = brief
    .split(/[.,;]/)
    .filter((s) => s.trim().length > 5)
    .slice(0, 5)
    .map((s) => s.trim());

  return {
    product_name: name,
    category: "General",
    features,
    differentiators: [],
    certifications: [],
  };
}

// ---- Main Handler ----

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload = await req.json();

    const segments = payload.segments || payload;
    const brief = segments[KNP.ξb] || segments.ξb || "";
    const pdfRef = segments[KNP.ζq] || segments.ζq || KNP_NULL_MARKER;
    const clientId = segments[KNP.θc] || segments.θc || null;
    const competitorsRaw = segments[KNP.κw] || segments.κw || KNP_NULL_MARKER;
    const researchFindings = segments[KNP.πf] || segments.πf || KNP_NULL_MARKER;

    const competitors =
      competitorsRaw !== KNP_NULL_MARKER
        ? competitorsRaw.split(KNP_VALUE_JOINER).filter(Boolean)
        : [];

    const research = researchFindings !== KNP_NULL_MARKER ? researchFindings : null;

    const aiAnalysis = await analyzeWithAI(brief, competitors, research);
    const { tokensIn, tokensOut, ...aiAnalysisData } = aiAnalysis;
    const claims = classifyClaims(aiAnalysisData.features, brief);
    const voiceIndicators = extractVoiceIndicators(brief);
    const audienceResult = classifyAudienceOutcome(brief, research);

    let moatData: MoatData | null = null;
    let moatReady = false;
    if (competitors.length > 0 || research) {
      moatData = buildMoatData(brief, competitors, research);
      moatReady = true;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    if (userId && clientId) {
      const { error: upsertError } = await supabase
        .from("product_profiles")
        .upsert(
          {
            user_id: userId,
            client_id: clientId,
            product_name: aiAnalysisData.product_name,
            category: aiAnalysisData.category,
            key_features: aiAnalysisData.features,
            green_claims: claims.green,
            yellow_claims: claims.yellow,
            red_claims: claims.red,
            voice_indicators: voiceIndicators,
            differentiators: aiAnalysisData.differentiators,
            certifications: aiAnalysisData.certifications,
            audience_outcome: audienceResult.outcome,
            moat_data: moatData || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id" }
        );

      if (upsertError) {
        console.warn("Product profile upsert warning:", upsertError.message);
      }
    }

    const truthMapEncoded = [
      `product_name${KNP_FIELD_SEPARATOR}${aiAnalysisData.product_name}`,
      `category${KNP_FIELD_SEPARATOR}${aiAnalysisData.category}`,
      `features${KNP_FIELD_SEPARATOR}${aiAnalysisData.features.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `green_claims${KNP_FIELD_SEPARATOR}${claims.green.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `yellow_claims${KNP_FIELD_SEPARATOR}${claims.yellow.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `red_claims${KNP_FIELD_SEPARATOR}${claims.red.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `voice${KNP_FIELD_SEPARATOR}${JSON.stringify(voiceIndicators)}`,
      `differentiators${KNP_FIELD_SEPARATOR}${aiAnalysisData.differentiators.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `certifications${KNP_FIELD_SEPARATOR}${aiAnalysisData.certifications.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
    ].join("|");

    const responseSegments: Record<string, string> = {
      [KNP.σo]: truthMapEncoded,
      [KNP.λv]: audienceResult.outcome + KNP_VALUE_JOINER + audienceResult.explanation,
    };

    if (moatReady) {
      responseSegments[`${KNP.θc}${KNP_FIELD_SEPARATOR}MOAT_READY`] = KNP_NULL_MARKER;
    }

    if (audienceResult.outcome === "WRONG") {
      responseSegments[`${KNP.ζq}${KNP_FIELD_SEPARATOR}AUDIENCE_CORRECTION`] = KNP_NULL_MARKER;
    }

    const elapsed = Date.now() - startTime;
    await logHealth("product", true, elapsed, tokensIn, tokensOut);

    const response = {
      version: KNP_VERSION,
      submind: "product",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      truth_map: {
        product_name: aiAnalysisData.product_name,
        category: aiAnalysisData.category,
        price_point: null,
        key_features: aiAnalysisData.features,
        green_claims: claims.green,
        yellow_claims: claims.yellow,
        red_claims: claims.red,
        voice_indicators: voiceIndicators,
        differentiators: aiAnalysisData.differentiators,
        certifications: aiAnalysisData.certifications,
      },
      audience_outcome: audienceResult.outcome,
      audience_explanation: audienceResult.explanation,
      moat_ready: moatReady,
      moat_data: moatData,
      elapsed_ms: elapsed,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    await logHealth("product", false, elapsed, null, null);
    console.error("Product error:", e);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: KNP_NULL_MARKER,
      [KNP.λv]: "SIMILAR",
    };
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "product",
        status: "error",
        checksum: knpChecksum(errorSegments),
        ...errorSegments,
        error: e instanceof Error ? e.message : "Unknown error",
        elapsed_ms: elapsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
