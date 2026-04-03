// ============================================================
// KLYC NARRATIVE SUBMIND — Story Framework Architect v2.1
// Builds narrative structures, emotional arcs, brand voice.
// Does NOT write copy — that's Creative's job.
// All output returns to the Orchestrator via KNP.
//
// Decision Tree: Story Dimension → Emotional Calibration →
//   NarrativeRank Scoring → Cross-Platform Orchestration
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── KNP Constants ──
const KNP_VERSION = "Ψ3";
const KNP_NULL = "∅";

const K = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv",
  Π: "Π", Ν: "Ν", σo: "σo", Γ: "Γ",
} as const;

function knpChecksum(seg: Record<string, string>): string {
  let h = 0;
  const s = Object.entries(seg).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "Ψ" + Math.abs(h).toString(36);
}

function compress(v: unknown): string {
  if (v === null || v === undefined) return KNP_NULL;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.trim().slice(0, 400);
}

// ── Story Dimension Weights (WP-48) ──
interface DimensionWeights {
  story: number;
  meaning: number;
  ritual: number;
  transmedia: number;
}

function calcDimensionWeights(brief: string, audience: string): DimensionWeights {
  const b = (brief + " " + audience).toLowerCase();
  const w: DimensionWeights = { story: 0.35, meaning: 0.25, ritual: 0.20, transmedia: 0.20 };

  // Purpose/mission-driven brands boost STORY + MEANING
  if (/sustainab|purpose|mission|social.?impact|eco|ethical|fair.?trade/i.test(b)) {
    w.story = 0.40; w.meaning = 0.35; w.ritual = 0.10; w.transmedia = 0.15;
  }
  // Community brands boost RITUAL
  if (/communit|tribe|belong|movement|gen.?z|fandom/i.test(b)) {
    w.ritual = 0.30; w.story = 0.30; w.meaning = 0.20; w.transmedia = 0.20;
  }
  // Multi-platform boost TRANSMEDIA
  if (/multi.?platform|cross.?channel|omni|transmedia/i.test(b)) {
    w.transmedia = 0.30; w.story = 0.30; w.meaning = 0.20; w.ritual = 0.20;
  }

  // Normalize
  const sum = w.story + w.meaning + w.ritual + w.transmedia;
  w.story /= sum; w.meaning /= sum; w.ritual /= sum; w.transmedia /= sum;
  return w;
}

// ── Emotional Calibration (WP-16, WP-17, WP-51) ──
type CampaignGoal = "awareness" | "trust" | "action" | "community";
interface EmotionalArc {
  goal: CampaignGoal;
  primary_emotions: string[];
  hook_emotion: string;
  body_emotion: string;
  resolution_emotion: string;
  share_rate_boost: string;
  avoid: string[];
}

function detectGoal(brief: string): CampaignGoal {
  const b = brief.toLowerCase();
  if (/launch|announc|reveal|introduc|new|awareness/i.test(b)) return "awareness";
  if (/trust|credib|reliab|authent|organic|sustain/i.test(b)) return "trust";
  if (/buy|shop|convert|sale|discount|limit|urgen/i.test(b)) return "action";
  if (/communit|join|movement|tribe|belong/i.test(b)) return "community";
  return "awareness";
}

function buildEmotionalArc(goal: CampaignGoal): EmotionalArc {
  const arcs: Record<CampaignGoal, EmotionalArc> = {
    awareness: {
      goal: "awareness",
      primary_emotions: ["awe", "surprise"],
      hook_emotion: "surprise",
      body_emotion: "awe",
      resolution_emotion: "happiness",
      share_rate_boost: "+30%",
      avoid: ["sadness"],
    },
    trust: {
      goal: "trust",
      primary_emotions: ["empathy", "warmth"],
      hook_emotion: "curiosity",
      body_emotion: "empathy",
      resolution_emotion: "warmth",
      share_rate_boost: "+15%",
      avoid: ["fear", "anger"],
    },
    action: {
      goal: "action",
      primary_emotions: ["high-arousal", "practical"],
      hook_emotion: "urgency",
      body_emotion: "high-arousal",
      resolution_emotion: "satisfaction",
      share_rate_boost: "+20%",
      avoid: ["sadness", "low-arousal"],
    },
    community: {
      goal: "community",
      primary_emotions: ["identity_signaling", "belonging"],
      hook_emotion: "recognition",
      body_emotion: "identity_signaling",
      resolution_emotion: "belonging",
      share_rate_boost: "+25%",
      avoid: ["exclusion", "shame"],
    },
  };
  return arcs[goal];
}

// ── NarrativeRank (14-item scale, WP-46) ──
interface NarrativeRankScores {
  contextual_cues: number;
  emotional_engagement: number;
  mental_cognition: number;
  immersive_experience: number;
  composite: number;
  threshold: "amplify" | "publish" | "revise";
}

// ── Transmedia Structure ──
interface TransmediaSlice {
  platform: string;
  narrative_role: string;
  format: string;
  arc_position: string;
}

function buildTransmediaDefaults(): TransmediaSlice[] {
  return [
    { platform: "tiktok", narrative_role: "hook_teaser", format: "15-30s video", arc_position: "surprise_hook" },
    { platform: "instagram", narrative_role: "visual_story", format: "carousel + reels", arc_position: "emotional_body" },
    { platform: "linkedin", narrative_role: "thought_leadership", format: "long-form article", arc_position: "meaning_depth" },
    { platform: "twitter", narrative_role: "conversation_spark", format: "thread", arc_position: "key_insight" },
    { platform: "youtube", narrative_role: "deep_dive", format: "3-8min video", arc_position: "full_arc" },
  ];
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    // Health check
    if (url.searchParams.get("health") === "true" || req.method === "GET") {
      return new Response(JSON.stringify({
        submind: "narrative",
        status: "online",
        version: "2.1",
        protocol: KNP_VERSION,
        capabilities: [
          "4D_story_framework",
          "emotional_calibration",
          "narrativerank_scoring",
          "transmedia_orchestration",
          "brand_voice_alignment",
        ],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const start = Date.now();

    // Extract KNP fields
    const brief = body[K.ξb] || body.brief || "";
    const audience = body[K.ζq] || body.audience || "";
    const product = body[K.μp] || body.product || "";
    const positioning = body[K.Π] || body.positioning || null;
    const brandVoice = body[K.λv] || body.brand_voice || "";

    if (!brief) {
      return new Response(JSON.stringify({
        submind: "narrative",
        status: "error",
        error: "Missing required field: ξb (brief)",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Step 1: Story Dimension Weights ──
    const dimensions = calcDimensionWeights(brief, audience);

    // ── Step 2: Emotional Calibration ──
    const goal = detectGoal(brief);
    const emotionalArc = buildEmotionalArc(goal);

    // ── Step 3: AI-powered narrative framework generation ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const moatContext = positioning
      ? `Moat rating: ${positioning.moat || "UNKNOWN"}. Messaging: ${positioning.messaging || "N/A"}.`
      : "No positioning data available.";

    const aiPrompt = `You are a narrative strategist for KLYC. Build a FRAMEWORK (not copy) for a marketing campaign.

BRIEF: ${brief}
AUDIENCE: ${audience}
PRODUCT: ${product}
POSITIONING: ${moatContext}
BRAND VOICE: ${brandVoice || "Not specified"}
CAMPAIGN GOAL: ${goal}
EMOTIONAL ARC: Hook=${emotionalArc.hook_emotion} → Body=${emotionalArc.body_emotion} → Resolution=${emotionalArc.resolution_emotion}
STORY DIMENSION WEIGHTS: Story=${dimensions.story.toFixed(2)}, Meaning=${dimensions.meaning.toFixed(2)}, Ritual=${dimensions.ritual.toFixed(2)}, Transmedia=${dimensions.transmedia.toFixed(2)}

Generate a narrative FRAMEWORK with these sections. Return valid JSON:
{
  "core_narrative": {
    "premise": "One sentence thesis",
    "conflict": "What tension drives the story",
    "resolution": "How the brand resolves it",
    "moral": "What the audience takes away"
  },
  "story_types": [
    {
      "type": "hidden_truth | threat_warning | framework_revelation | status_upgrade | contrarian_insight | future_prediction | tool_discovery",
      "core_claim": "1 sentence",
      "why_it_works": "1 sentence",
      "risk_level": "safe | caution | bold"
    }
  ],
  "emotional_beats": [
    { "beat": "hook | build | pivot | climax | resolution", "emotion": "string", "technique": "string" }
  ],
  "narrative_rank_targets": {
    "contextual_cues": 0.0-5.0,
    "emotional_engagement": 0.0-5.0,
    "mental_cognition": 0.0-5.0,
    "immersive_experience": 0.0-5.0
  },
  "transmedia_plan": [
    { "platform": "string", "narrative_slice": "string", "format": "string", "unique_angle": "string" }
  ],
  "guardrails": [
    { "claim": "string", "evidence_needed": "string", "risk": "safe | caution | blocked" }
  ]
}

Rules:
- Story types must include at least 2 from the 7 types listed
- Emotional beats must follow the arc: ${emotionalArc.hook_emotion} → ${emotionalArc.body_emotion} → ${emotionalArc.resolution_emotion}
- NarrativeRank targets must be ≥ 3.5 each for publication quality
- Be specific to "${brief}" — no generic templates`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a narrative strategist. Return valid JSON only. No markdown fences." },
          { role: "user", content: aiPrompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429 || aiResp.status === 402) {
        return new Response(JSON.stringify({
          submind: "narrative", status: "error",
          error: aiResp.status === 429 ? "Rate limited" : "Credits exhausted",
        }), { status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    let framework: any = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) framework = JSON.parse(jsonMatch[0]);
    } catch {
      framework = { raw: rawText, parseError: true };
    }

    // ── Step 4: Compute NarrativeRank ──
    const nrTargets = framework.narrative_rank_targets || {};
    const nrScores: NarrativeRankScores = {
      contextual_cues: nrTargets.contextual_cues ?? 3.5,
      emotional_engagement: nrTargets.emotional_engagement ?? 3.5,
      mental_cognition: nrTargets.mental_cognition ?? 3.5,
      immersive_experience: nrTargets.immersive_experience ?? 3.5,
      composite: 0,
      threshold: "revise",
    };
    nrScores.composite = (
      nrScores.contextual_cues + nrScores.emotional_engagement +
      nrScores.mental_cognition + nrScores.immersive_experience
    ) / 4;
    nrScores.threshold = nrScores.composite >= 4.0 ? "amplify"
      : nrScores.composite >= 3.5 ? "publish" : "revise";

    // ── Step 5: Build transmedia structure ──
    const transmedia = framework.transmedia_plan || buildTransmediaDefaults();

    // ── Step 6: Build KNP output ──
    const segments: Record<string, string> = {
      [K.Ν]: compress({
        core_narrative: framework.core_narrative,
        story_types: framework.story_types,
        emotional_beats: framework.emotional_beats,
        guardrails: framework.guardrails,
      }),
      [K.σo]: compress({
        story_dimensions: dimensions,
        emotional_arc: emotionalArc,
        narrative_rank: nrScores,
        transmedia,
        campaign_goal: goal,
      }),
    };

    const output = {
      submind: "narrative",
      status: "success",
      version: KNP_VERSION,
      packet: {
        version: KNP_VERSION,
        checksum: knpChecksum(segments),
        timestamp: Date.now(),
        segments,
      },
      data: {
        framework,
        dimensions,
        emotional_arc: emotionalArc,
        narrative_rank: nrScores,
        transmedia,
        goal,
      },
      _meta: {
        elapsed_ms: Date.now() - start,
        model: "google/gemini-2.5-flash",
        routing: [
          nrScores.threshold === "amplify" ? "ACTIVATE:viral" : null,
          "ACTIVATE:creative",
          "ACTIVATE:social",
        ].filter(Boolean),
      },
    };

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Narrative submind error:", error);
    return new Response(JSON.stringify({
      submind: "narrative",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
