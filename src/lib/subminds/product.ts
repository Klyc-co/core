/**
 * KLYC Product Submind — Moat Analysis & Positioning Engine
 * MODEL: claude-haiku-4-5 | Temp: 0.3 | Max: 2000
 *
 * Lightweight inline module invoked by the Orchestrator.
 * Identifies competitive advantages via Morningstar 5-Source Moat (WP-43),
 * competitive intensity via Porter's 5 Forces (WP-47),
 * and generates Creative guardrails (Γ).
 *
 * INPUT KNP: ξb (brief), ζq (audience), μp (product), ρr (research context)
 * OUTPUT KNP: Π (positioning), Γ (guardrails), σo (USPs/differentiators)
 */

// ── Types ──

export interface ProductInput {
  brief: string;
  audience?: string;
  product?: string;
  researchContext?: Record<string, unknown>;
  clientBrain?: Record<string, unknown>;
}

export interface MoatScore {
  switchingCosts: number;
  intangibleAssets: number;
  networkEffects: number;
  costAdvantage: number;
  efficientScale: number;
  composite: number;
  rating: "WIDE" | "NARROW" | "NONE";
}

export interface Guardrail {
  claim: string;
  evidence: string;
  risk_level: "safe" | "caution" | "blocked";
}

export interface ProductOutput {
  version: string;
  submind: "product";
  status: "success" | "error";
  moat: MoatScore;
  positioning: string;
  messagingAngle: string;
  differentiators: string[];
  painPointMap: Record<string, string>;
  guardrails: Guardrail[];
  genZAdaptation: Record<string, unknown> | null;
  competitiveIntensity: number;
  competitivePosture: string;
  confidence: number;
  durationMs: number;
  error?: string;
}

// ── Constants ──

const MOAT_WEIGHTS = {
  switchingCosts: 0.20,
  intangibleAssets: 0.25,
  networkEffects: 0.20,
  costAdvantage: 0.15,
  efficientScale: 0.20,
} as const;

const KNP_VERSION = "Ψ3";

// ── Moat Scoring ──

function computeMoat(scores: Omit<MoatScore, "composite" | "rating">): MoatScore {
  const composite =
    scores.switchingCosts * MOAT_WEIGHTS.switchingCosts +
    scores.intangibleAssets * MOAT_WEIGHTS.intangibleAssets +
    scores.networkEffects * MOAT_WEIGHTS.networkEffects +
    scores.costAdvantage * MOAT_WEIGHTS.costAdvantage +
    scores.efficientScale * MOAT_WEIGHTS.efficientScale;

  const rating: MoatScore["rating"] =
    composite >= 4.0 ? "WIDE" : composite >= 2.5 ? "NARROW" : "NONE";

  return { ...scores, composite: Math.round(composite * 100) / 100, rating };
}

function moatToMessaging(rating: MoatScore["rating"]): string {
  switch (rating) {
    case "WIDE": return "Category leader — emphasize dominance and proven results";
    case "NARROW": return "Growing advantage — emphasize momentum and trajectory";
    case "NONE": return "Innovation/speed — emphasize agility and fresh thinking";
  }
}

function competitivePosture(intensity: number): string {
  if (intensity >= 4.0) return "aggressive";
  if (intensity >= 2.5) return "balanced";
  return "brand-building";
}

// ── Gen Z Adaptation (WP-52-55) ──

function genZCheck(audience: string, platforms: string[]): Record<string, unknown> | null {
  const isGenZ = /gen[\s_-]?z|18[\s-]?24|teen|young\s*adult/i.test(audience);
  if (!isGenZ) return null;

  const hasTikTok = platforms.some(p => /tiktok/i.test(p));
  return {
    primary_discovery: hasTikTok ? "TikTok (41% use social as primary search)" : "Social-first discovery",
    content_strategy: "UGC 10x more effective than polished ads",
    hook_model: { trigger: "scroll-stop visual", action: "engage", variable_reward: "surprise/delight", investment: "follow/save/share" },
    format_priority: hasTikTok ? ["short-form video", "duets", "stories"] : ["reels", "stories", "carousels"],
  };
}

// ── AI-Powered Analysis ──

async function callProductAI(
  input: ProductInput,
  apiKey: string,
): Promise<{
  moatScores: Omit<MoatScore, "composite" | "rating">;
  porterScore: number;
  differentiators: string[];
  painPointMap: Record<string, string>;
  positioning: string;
  guardrails: Guardrail[];
}> {
  const prompt = `Analyze this product for competitive positioning.

Product: ${input.product || "Not specified"}
Brief: ${input.brief}
Audience: ${input.audience || "General"}
Research context: ${input.researchContext ? JSON.stringify(input.researchContext).slice(0, 800) : "None"}
Client intel: ${input.clientBrain ? JSON.stringify(input.clientBrain).slice(0, 500) : "None"}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "moat": {
    "switchingCosts": <1-5>,
    "intangibleAssets": <1-5>,
    "networkEffects": <1-5>,
    "costAdvantage": <1-5>,
    "efficientScale": <1-5>
  },
  "porterScore": <1.0-5.0>,
  "differentiators": ["<3-5 items>"],
  "painPointMap": {"<pain>": "<capability>"},
  "positioning": "<1-2 sentence positioning statement>",
  "guardrails": [
    {"claim": "<claim text>", "evidence": "<evidence or source>", "risk_level": "safe|caution|blocked"}
  ]
}`;

  const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const res = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: "You are a product strategist specializing in competitive moat analysis (Morningstar 5-Source framework) and Porter's 5 Forces. Return ONLY valid JSON. No markdown fences. Be specific, avoid generic marketing language.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI gateway error ${res.status}: ${await res.text().catch(() => "unknown")}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    moatScores: parsed.moat,
    porterScore: parsed.porterScore,
    differentiators: parsed.differentiators || [],
    painPointMap: parsed.painPointMap || {},
    positioning: parsed.positioning || "",
    guardrails: (parsed.guardrails || []).map((g: any) => ({
      claim: g.claim || "",
      evidence: g.evidence || "",
      risk_level: ["safe", "caution", "blocked"].includes(g.risk_level) ? g.risk_level : "caution",
    })),
  };
}

// ── Fallback (no API key) ──

function fallbackAnalysis(input: ProductInput): ProductOutput {
  const moat = computeMoat({
    switchingCosts: 2, intangibleAssets: 3, networkEffects: 2, costAdvantage: 2, efficientScale: 2,
  });

  return {
    version: KNP_VERSION,
    submind: "product",
    status: "success",
    moat,
    positioning: `${input.product || "This product"} delivers unique value to ${input.audience || "its audience"} through differentiated positioning.`,
    messagingAngle: moatToMessaging(moat.rating),
    differentiators: ["Unique value proposition", "Audience-specific positioning", "Market-aware messaging"],
    painPointMap: { "Unmet need": "Core product capability" },
    guardrails: [{ claim: "Market leader", evidence: "Requires validation", risk_level: "caution" }],
    genZAdaptation: genZCheck(input.audience || "", []),
    competitiveIntensity: 3.0,
    competitivePosture: "balanced",
    confidence: 0.4,
    durationMs: 0,
  };
}

// ── Main Entry Point ──

export async function runProductSubmind(
  input: ProductInput,
  apiKey?: string,
): Promise<ProductOutput> {
  const start = Date.now();

  if (!apiKey) {
    const fb = fallbackAnalysis(input);
    fb.durationMs = Date.now() - start;
    return fb;
  }

  try {
    const ai = await callProductAI(input, apiKey);
    const moat = computeMoat(ai.moatScores);
    const platforms = (input.brief.match(/tiktok|instagram|linkedin|twitter|x\b|facebook|youtube/gi) || []);

    return {
      version: KNP_VERSION,
      submind: "product",
      status: "success",
      moat,
      positioning: ai.positioning,
      messagingAngle: moatToMessaging(moat.rating),
      differentiators: ai.differentiators,
      painPointMap: ai.painPointMap,
      guardrails: ai.guardrails,
      genZAdaptation: genZCheck(input.audience || "", platforms),
      competitiveIntensity: ai.porterScore,
      competitivePosture: competitivePosture(ai.porterScore),
      confidence: moat.composite >= 3.0 ? 0.85 : moat.composite >= 2.0 ? 0.7 : 0.55,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    console.error("Product submind error:", error);
    const fb = fallbackAnalysis(input);
    fb.durationMs = Date.now() - start;
    fb.confidence = 0.3;
    fb.error = error instanceof Error ? error.message : String(error);
    return fb;
  }
}
