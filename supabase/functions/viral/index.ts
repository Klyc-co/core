// ============================================================
// KLYC VIRAL SUBMIND — Scoring Engine
// Evaluates content for viral potential with diagnostic feedback.
// Called many times per session — optimized for speed/consistency.
// Only speaks KNP. Never outputs directly to users.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---- KNP Constants ----
const KNP_NULL = "∅";
const KNP_JOINER = "⊕";
const KNP_SEP = "∷";

// ---- Default Scoring Weights ----
const DEFAULT_WEIGHTS = {
  hook: 0.30,
  emotion: 0.25,
  share: 0.25,
  platform: 0.10,
  audience: 0.10,
};

// ---- Threshold Mapping ----
function thresholdStatus(score: number): "AMPLIFY" | "MONITOR" | "PAUSE" | "ARCHIVE" {
  if (score >= 0.75) return "AMPLIFY";
  if (score >= 0.50) return "MONITOR";
  if (score >= 0.25) return "PAUSE";
  return "ARCHIVE";
}

// ---- Types ----

interface ContentVariant {
  headline: string;
  hook: string;
  body: string;
  cta: string;
  platform: string;
  model_type: string;
  voice_type: string;
  strategy_angle?: string;
}

interface ScoredVariant {
  variant_index: number;
  headline: string;
  platform: string;
  strategy_angle: string;
  hook_score: number;
  emotion_score: number;
  share_score: number;
  platform_score: number;
  audience_score: number;
  viral_score: number;
  threshold_status: string;
  diagnostics: string[];
  card_level: number;
  // Gaming card Level 1 data
  card_data: {
    hook: number;
    emotion: number;
    share: number;
    platform: number;
    audience: number;
    composite: number;
    status: string;
  };
}

interface CampaignCard {
  card_level: number;
  reach: number;
  engagement: number;
  conversion: number;
  consistency: number;
  learning_value: number;
  composite: number;
}

// ---- Helpers ----

function parseKnpField(val: unknown): string {
  if (val === null || val === undefined) return KNP_NULL;
  const s = String(val).trim();
  return s === "" ? KNP_NULL : s;
}

function isNull(val: string): boolean {
  return val === KNP_NULL || val === "" || val === "null" || val === "undefined";
}

// ---- Parse Variants from Various Formats ----

function parseVariants(body: Record<string, unknown>): ContentVariant[] {
  // Try structured variants first
  if (Array.isArray(body.variants_structured)) {
    return body.variants_structured as ContentVariant[];
  }

  // Try σo as KNP-encoded string
  const sigmaO = String(body["σo"] || body.σo || "");
  if (sigmaO && sigmaO !== KNP_NULL) {
    // Format: headline∷val⊕hook∷val⊕...|||headline∷val⊕...
    const variantStrs = sigmaO.split("|||");
    return variantStrs.map((vs) => {
      const fields: Record<string, string> = {};
      for (const pair of vs.split(KNP_JOINER)) {
        const [key, ...rest] = pair.split(KNP_SEP);
        if (key) fields[key.trim()] = rest.join(KNP_SEP).trim();
      }
      return {
        headline: fields.headline || "",
        hook: fields.hook || "",
        body: fields.body || "",
        cta: fields.cta || "",
        platform: fields.platform || "instagram",
        model_type: fields.model || "STORY",
        voice_type: fields.voice || "CONVERSATIONAL",
        strategy_angle: fields.angle || "unknown",
      };
    });
  }

  return [];
}

// ---- Load Adaptive Weights from Client Brain ----

async function loadAdaptiveWeights(clientId: string): Promise<typeof DEFAULT_WEIGHTS> {
  if (!clientId || clientId === KNP_NULL) return { ...DEFAULT_WEIGHTS };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data } = await supabase
      .from("client_brain")
      .select("data")
      .eq("client_id", clientId)
      .eq("document_type", "strategy_profile")
      .single();

    if (data?.data) {
      const d = data.data as Record<string, unknown>;
      const customWeights = d.viral_weights as Record<string, number> | undefined;
      if (customWeights) {
        return {
          hook: customWeights.hook ?? DEFAULT_WEIGHTS.hook,
          emotion: customWeights.emotion ?? DEFAULT_WEIGHTS.emotion,
          share: customWeights.share ?? DEFAULT_WEIGHTS.share,
          platform: customWeights.platform ?? DEFAULT_WEIGHTS.platform,
          audience: customWeights.audience ?? DEFAULT_WEIGHTS.audience,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load adaptive weights:", e);
  }

  return { ...DEFAULT_WEIGHTS };
}

// ---- AI-Powered Scoring ----

async function scoreVariants(
  variants: ContentVariant[],
  brief: string,
  platforms: string,
  weights: typeof DEFAULT_WEIGHTS
): Promise<ScoredVariant[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `You are a viral content scoring engine. Score each content variant on 5 dimensions (0.0-1.0):

DIMENSIONS:
- hook (30%): First 3 seconds / first line — "can't look away" factor. Does it stop the scroll?
- emotion (25%): Which emotional trigger is activated? (surprise, awe, humor, anger, inspiration, belonging)
- share (25%): Identity payoff — "what does sharing this say about ME?" Would someone share to look smart/funny/caring?
- platform (10%): Match with native content patterns for ${platforms}. Does it feel native to the platform?
- audience (10%): Hit on specific audience triggers from the brief context.

For EACH variant, provide:
1. Scores for all 5 dimensions (0.0-1.0, be honest and critical — most content scores 0.3-0.7)
2. 2-4 diagnostic strings that are SPECIFIC (reference the exact element), ACTIONABLE (say what to try), and DATA-REFERENCED

Respond ONLY with a JSON array. Each object: { "hook_score": 0.0, "emotion_score": 0.0, "share_score": 0.0, "platform_score": 0.0, "audience_score": 0.0, "diagnostics": ["..."] }`;

  const variantDescriptions = variants.map((v, i) =>
    `Variant ${i + 1} [${v.platform}/${v.strategy_angle || "unknown"}]:\nHeadline: ${v.headline}\nHook: ${v.hook}\nBody: ${v.body?.slice(0, 200)}\nCTA: ${v.cta}`
  ).join("\n\n---\n\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Brief: ${brief}\n\n${variantDescriptions}` },
      ],
      temperature: 0.15,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI scoring error:", response.status, errText);
    throw new Error(`AI scoring failed: ${response.status}`);
  }

  const aiResult = await response.json();
  const raw = aiResult.choices?.[0]?.message?.content || "[]";

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON array for scoring");

  const scores = JSON.parse(jsonMatch[0]) as Array<{
    hook_score: number;
    emotion_score: number;
    share_score: number;
    platform_score: number;
    audience_score: number;
    diagnostics: string[];
  }>;

  return variants.map((v, i) => {
    const s = scores[i] || { hook_score: 0.3, emotion_score: 0.3, share_score: 0.3, platform_score: 0.3, audience_score: 0.3, diagnostics: ["No scoring data available"] };
    const viralScore =
      (s.hook_score * weights.hook) +
      (s.emotion_score * weights.emotion) +
      (s.share_score * weights.share) +
      (s.platform_score * weights.platform) +
      (s.audience_score * weights.audience);

    const rounded = Math.round(viralScore * 1000) / 1000;
    const status = thresholdStatus(rounded);

    return {
      variant_index: i,
      headline: v.headline,
      platform: v.platform,
      strategy_angle: v.strategy_angle || "unknown",
      hook_score: s.hook_score,
      emotion_score: s.emotion_score,
      share_score: s.share_score,
      platform_score: s.platform_score,
      audience_score: s.audience_score,
      viral_score: rounded,
      threshold_status: status,
      diagnostics: s.diagnostics || [],
      card_level: 1,
      card_data: {
        hook: s.hook_score,
        emotion: s.emotion_score,
        share: s.share_score,
        platform: s.platform_score,
        audience: s.audience_score,
        composite: rounded,
        status,
      },
    };
  });
}

// ---- Campaign Card (Level 2) ----

function buildCampaignCard(scored: ScoredVariant[]): CampaignCard {
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const scores = scored.map(s => s.viral_score);
  const hooks = scored.map(s => s.hook_score);
  const emotions = scored.map(s => s.emotion_score);
  const shares = scored.map(s => s.share_score);

  // Consistency = 1 - standard deviation of scores (higher = more consistent)
  const mean = avg(scores);
  const variance = avg(scores.map(s => (s - mean) ** 2));
  const consistency = Math.max(0, 1 - Math.sqrt(variance) * 2);

  return {
    card_level: 2,
    reach: avg(hooks),
    engagement: avg(emotions),
    conversion: avg(shares),
    consistency: Math.round(consistency * 1000) / 1000,
    learning_value: scored.filter(s => s.threshold_status === "AMPLIFY" || s.threshold_status === "MONITOR").length / Math.max(scored.length, 1),
    composite: Math.round(mean * 1000) / 1000,
  };
}

// ---- Checkpoint Trajectory Assessment ----

function assessTrajectory(checkpointData: string): { trajectory: string; assessment: string } {
  try {
    const data = JSON.parse(checkpointData);
    if (Array.isArray(data) && data.length >= 2) {
      const latest = data[data.length - 1]?.score || 0;
      const previous = data[data.length - 2]?.score || 0;
      const delta = latest - previous;

      if (delta > 0.05) return { trajectory: "accelerating", assessment: "Engagement is growing — consider amplifying spend and distribution." };
      if (delta < -0.05) return { trajectory: "decelerating", assessment: "Engagement is dropping — consider pausing or pivoting messaging." };
      return { trajectory: "stable", assessment: "Performance is steady — monitor for another checkpoint before adjusting." };
    }
  } catch {
    // Not valid checkpoint data
  }
  return { trajectory: "unknown", assessment: "Insufficient checkpoint data for trajectory analysis." };
}

// ---- Log Scores ----

async function logViralScores(
  clientId: string,
  scored: ScoredVariant[],
  campaignCard: CampaignCard,
  iteration: number,
  loopStatus: string
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("viral_log").insert({
      client_id: clientId !== KNP_NULL ? clientId : null,
      iteration_round: iteration,
      loop_status: loopStatus,
      variant_scores: scored,
      campaign_card: campaignCard,
      top_score: Math.max(...scored.map(s => s.viral_score)),
      avg_score: scored.reduce((a, s) => a + s.viral_score, 0) / Math.max(scored.length, 1),
      variants_accepted: scored.filter(s => s.threshold_status === "AMPLIFY" || s.threshold_status === "MONITOR").length,
    });
  } catch (e) {
    console.warn("Failed to log viral scores:", e);
  }
}

// ============================================================
// SERVE
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();

    // ---- Decode KNP Input ----
    const brief = parseKnpField(body["ξb"] || body.ξb);
    const platformsRaw = parseKnpField(body["μp"] || body.μp);
    const clientId = parseKnpField(body["θc"] || body.θc || body.client_id);
    const checkpointData = parseKnpField(body["πf"] || body.πf);
    const iterationRound = parseInt(String(body.iteration_round || body["πf_round"] || "1"), 10) || 1;

    // ---- Parse Content Variants ----
    const variants = parseVariants(body);

    if (variants.length === 0) {
      return new Response(
        JSON.stringify({
          version: "Ψ3",
          submind: "viral",
          status: "error",
          λv: KNP_NULL,
          error: "No content variants provided for scoring",
          elapsed_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Load Adaptive Weights ----
    const weights = await loadAdaptiveWeights(clientId);

    // ---- Score Variants ----
    const scored = await scoreVariants(variants, brief, platformsRaw, weights);

    // ---- Build Campaign Card (Level 2) ----
    const campaignCard = buildCampaignCard(scored);

    // ---- Checkpoint Trajectory (if live monitoring) ----
    let trajectory = null;
    if (!isNull(checkpointData)) {
      trajectory = assessTrajectory(checkpointData);
    }

    // ---- Determine Loop Status ----
    const anyMeetsThreshold = scored.some(s => s.viral_score >= 0.50);
    const maxIteration = iterationRound >= 3;
    const loopStatus = (anyMeetsThreshold || maxIteration)
      ? `σo${KNP_SEP}LOOP_COMPLETE${KNP_NULL}`
      : `σo${KNP_SEP}LOOP_CONTINUE${KNP_NULL}`;

    // ---- Log Scores ----
    await logViralScores(clientId, scored, campaignCard, iterationRound, loopStatus);

    // ---- Encode Diagnostics for Creative Feedback ----
    const diagnosticsFeedback = scored
      .filter(s => s.viral_score < 0.50)
      .map(s => `[${s.strategy_angle}] score=${s.viral_score}: ${s.diagnostics.join("; ")}`)
      .join(" || ");

    // ---- Build Response ----
    return new Response(
      JSON.stringify({
        version: "Ψ3",
        submind: "viral",
        status: "complete",
        λv: scored,
        σo_loop: loopStatus,
        viral_score: Math.max(...scored.map(s => s.viral_score)),
        avg_score: Math.round((scored.reduce((a, s) => a + s.viral_score, 0) / scored.length) * 1000) / 1000,
        diagnostics: diagnosticsFeedback,
        campaign_card: campaignCard,
        trajectory,
        iteration_round: iterationRound,
        top_variants: scored.sort((a, b) => b.viral_score - a.viral_score).slice(0, 3),
        elapsed_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Viral submind error:", e);
    return new Response(
      JSON.stringify({
        version: "Ψ3",
        submind: "viral",
        status: "error",
        λv: KNP_NULL,
        error: e instanceof Error ? e.message : "Unknown error",
        elapsed_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
