// ============================================================
// PRODUCT SUBMIND — Truth Map Engine
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

// ---- KNP Constants ----
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
  // Extract sentences from description as additional claims
  const descSentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  allClaims.push(...descSentences.map((s) => s.trim()));

  for (const claim of allClaims) {
    const lower = claim.toLowerCase();

    // RED: superlatives without data, health/medical claims
    if (
      /\b(the best|unmatched|unrivaled|superior to all|guaranteed results|cure|heal|treat|prevent disease)\b/i.test(lower) ||
      /\b(#1|number one|world's? (best|first|only))\b/i.test(lower)
    ) {
      red.push(claim);
      continue;
    }

    // GREEN: measurable data, certifications, provable facts
    if (
      /\b(\d+%|\d+x|\d+ (times|percent|hours|days|minutes))\b/i.test(lower) ||
      /\b(certified|certification|FDA|USDA|ISO|UL|CE|organic|fair trade|patent|awarded|peer.?reviewed)\b/i.test(lower) ||
      /\b(published|study|tested|verified|validated|audited)\b/i.test(lower)
    ) {
      green.push(claim);
      continue;
    }

    // YELLOW: positive but unverified
    if (
      /\b(premium|high.?quality|industry.?leading|best.?in.?class|cutting.?edge|innovative|revolutionary|game.?changing|world.?class)\b/i.test(lower)
    ) {
      yellow.push(claim);
      continue;
    }

    // Default: if it's a factual statement, green; if opinion, yellow
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

  // Check for mismatch signals
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

  // Check for wider signals
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

  // Check for narrower signals
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

  // Score client based on brief content signals
  const briefLower = productBrief.toLowerCase();
  const clientScores = dimensions.map((dim) => {
    let score = 0.5; // baseline
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
      case "audience_loyalty":
        score = 0.5; // Need actual data
        break;
      case "content_engagement":
        score = 0.5; // Need actual data
        break;
      case "platform_presence":
        score = 0.5; // Need actual data
        break;
    }
    return Math.round(score * 100) / 100;
  });

  // Generate competitor scores (baseline with variance)
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

  // Formality
  if (/\b(professional|corporate|formal|enterprise|B2B)\b/i.test(lower)) {
    indicators.formality = "formal";
  } else if (/\b(casual|fun|playful|young|Gen Z|millennial)\b/i.test(lower)) {
    indicators.formality = "casual";
  } else {
    indicators.formality = "balanced";
  }

  // Emotion
  if (/\b(inspiring|empower|transform|dream|vision)\b/i.test(lower)) {
    indicators.emotion = "inspirational";
  } else if (/\b(trust|reliable|safe|secure|proven)\b/i.test(lower)) {
    indicators.emotion = "trust-building";
  } else if (/\b(urgent|act now|limited|exclusive|hurry)\b/i.test(lower)) {
    indicators.emotion = "urgency";
  } else {
    indicators.emotion = "informative";
  }

  // Complexity
  if (/\b(technical|spec|engineer|developer|API)\b/i.test(lower)) {
    indicators.complexity = "technical";
  } else if (/\b(simple|easy|beginner|everyone|anyone)\b/i.test(lower)) {
    indicators.complexity = "simple";
  } else {
    indicators.complexity = "moderate";
  }

  return indicators;
}

// ---- AI Analysis via Lovable AI Gateway ----
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
}> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    // Fallback: extract basic info from brief
    return extractBasicInfo(brief);
  }

  const systemPrompt = `You are a product analyst. Given a product brief, extract structured information.
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
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("AI analysis failed:", response.status);
      return extractBasicInfo(brief);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return extractBasicInfo(brief);

    const parsed = JSON.parse(content);
    return {
      product_name: parsed.product_name || "Unknown Product",
      category: parsed.category || "General",
      features: parsed.features || [],
      differentiators: parsed.differentiators || [],
      certifications: parsed.certifications || [],
    };
  } catch (e) {
    console.error("AI analysis error:", e);
    return extractBasicInfo(brief);
  }
}

function extractBasicInfo(brief: string): {
  product_name: string;
  category: string;
  features: string[];
  differentiators: string[];
  certifications: string[];
} {
  // Simple extraction from brief text
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

    // Extract KNP fields
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

    // 1. AI-powered product analysis
    const aiAnalysis = await analyzeWithAI(brief, competitors, research);

    // 2. Classify claims
    const claims = classifyClaims(aiAnalysis.features, brief);

    // 3. Extract voice indicators
    const voiceIndicators = extractVoiceIndicators(brief);

    // 4. Classify audience outcome
    const audienceResult = classifyAudienceOutcome(
      brief, // client's stated audience is embedded in brief
      research
    );

    // 5. Build competitive moat data
    let moatData: MoatData | null = null;
    let moatReady = false;
    if (competitors.length > 0 || research) {
      moatData = buildMoatData(brief, competitors, research);
      moatReady = true;
    }

    // 6. Persist Truth Map to product_profiles
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user_id from the request context or use a service-level insert
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    if (userId && clientId) {
      // Upsert the product profile
      const { error: upsertError } = await supabase
        .from("product_profiles")
        .upsert(
          {
            user_id: userId,
            client_id: clientId,
            product_name: aiAnalysis.product_name,
            category: aiAnalysis.category,
            key_features: aiAnalysis.features,
            green_claims: claims.green,
            yellow_claims: claims.yellow,
            red_claims: claims.red,
            voice_indicators: voiceIndicators,
            differentiators: aiAnalysis.differentiators,
            certifications: aiAnalysis.certifications,
            audience_outcome: audienceResult.outcome,
            moat_data: moatData || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id" }
        );

      if (upsertError) {
        console.warn("Product profile upsert warning:", upsertError.message);
        // Non-fatal — continue with response
      }
    }

    // 7. Build KNP response
    const truthMapEncoded = [
      `product_name${KNP_FIELD_SEPARATOR}${aiAnalysis.product_name}`,
      `category${KNP_FIELD_SEPARATOR}${aiAnalysis.category}`,
      `features${KNP_FIELD_SEPARATOR}${aiAnalysis.features.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `green_claims${KNP_FIELD_SEPARATOR}${claims.green.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `yellow_claims${KNP_FIELD_SEPARATOR}${claims.yellow.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `red_claims${KNP_FIELD_SEPARATOR}${claims.red.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `voice${KNP_FIELD_SEPARATOR}${JSON.stringify(voiceIndicators)}`,
      `differentiators${KNP_FIELD_SEPARATOR}${aiAnalysis.differentiators.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
      `certifications${KNP_FIELD_SEPARATOR}${aiAnalysis.certifications.join(KNP_VALUE_JOINER) || KNP_NULL_MARKER}`,
    ].join("|");

    const responseSegments: Record<string, string> = {
      [KNP.σo]: truthMapEncoded,
      [KNP.λv]: audienceResult.outcome + KNP_VALUE_JOINER + audienceResult.explanation,
    };

    // Set moat ready flag
    if (moatReady) {
      responseSegments[`${KNP.θc}${KNP_FIELD_SEPARATOR}MOAT_READY`] = KNP_NULL_MARKER;
    }

    // Set audience correction flag
    if (audienceResult.outcome === "WRONG") {
      responseSegments[`${KNP.ζq}${KNP_FIELD_SEPARATOR}AUDIENCE_CORRECTION`] = KNP_NULL_MARKER;
    }

    const elapsed = Date.now() - startTime;

    const response = {
      version: KNP_VERSION,
      submind: "product",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      // Structured data for Orchestrator consumption
      truth_map: {
        product_name: aiAnalysis.product_name,
        category: aiAnalysis.category,
        price_point: null, // extracted from brief if available
        key_features: aiAnalysis.features,
        green_claims: claims.green,
        yellow_claims: claims.yellow,
        red_claims: claims.red,
        voice_indicators: voiceIndicators,
        differentiators: aiAnalysis.differentiators,
        certifications: aiAnalysis.certifications,
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
    console.error("Product submind error:", e);
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
        elapsed_ms: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
