// ============================================================
// KLYC LEARNING ENGINE — Autonomous Intelligence Node
// Four functions: Campaign Learning, AZR Learning, Competitor
// Monitoring, Proactive Intelligence. Only speaks KNP.
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
const KNP_NULL = "∅";
const KNP_JOINER = "⊕";
const KNP_SEP = "∷";

const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw", πf: "πf", σo: "σo",
  ρr: "ρr", φd: "φd", ηn: "ηn", ωs: "ωs", δi: "δi", εe: "εe", αa: "αa", χy: "χy", ψv: "ψv",
} as const;

type TriggerType = "checkpoint" | "campaign_launch" | "cron" | "health";

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return "Ψ" + Math.abs(h).toString(36);
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ---- AI Client ----

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  opts: { model?: string; temperature?: number } = {}
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return "AI unavailable — API key missing.";

  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model || "google/gemini-2.5-flash",
        temperature: opts.temperature ?? 0.3,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI call failed:", response.status);
      return "AI analysis returned an error.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No output generated.";
  } catch (e) {
    console.error("AI call exception:", e);
    return "AI analysis exception.";
  }
}

// ============================================================
// FUNCTION A — Campaign Learning (post-checkpoint)
// ============================================================

async function campaignLearning(payload: Record<string, unknown>): Promise<Record<string, string>> {
  const supabase = getSupabase();
  const clientId = String(payload.client_id || payload[KNP.θc] || "");
  const campaignId = String(payload.campaign_id || "");
  const actualScore = Number(payload.actual_score || 0);
  const predictedScore = Number(payload.predicted_score || 0);
  const delta = actualScore - predictedScore;
  const checkpointLabel = String(payload.checkpoint_label || "unknown");

  // Extract campaign variables
  const platform = String(payload.platform || KNP_NULL);
  const messagingAngle = String(payload.messaging_angle || KNP_NULL);
  const voiceType = String(payload.voice_type || KNP_NULL);
  const industry = String(payload.industry || KNP_NULL);
  const audienceSegment = String(payload.audience_segment || KNP_NULL);
  const timingPattern = String(payload.timing_pattern || KNP_NULL);

  // 1. Compute learning signal
  const significance = Math.abs(delta) > 0.15 ? "significant" : "normal";
  const direction = delta > 0 ? "outperformance" : delta < 0 ? "underperformance" : "match";

  // 2. AI analysis: what variables explain the gap?
  const aiAnalysis = await callAI(
    `You are the KLYC Learning Engine. Analyze why a campaign's actual score differs from predicted. Be analytical and specific.
Output JSON: { "key_factors": ["..."], "correlation_updates": [{"variable": "...", "adjustment": 0.0}], "pattern_flag": "none|outperformer|underperformer" }`,
    `Delta: ${delta.toFixed(3)} (actual=${actualScore}, predicted=${predictedScore})
Checkpoint: ${checkpointLabel}
Platform: ${platform}, Angle: ${messagingAngle}, Voice: ${voiceType}
Industry: ${industry}, Audience: ${audienceSegment}, Timing: ${timingPattern}
Significance: ${significance}, Direction: ${direction}`,
    { temperature: 0.3 }
  );

  // 3. Update knowledge graph
  try {
    // Upsert into knowledge_graph
    const { data: existing } = await supabase
      .from("knowledge_graph")
      .select("id, sample_size, predicted_score, actual_score, delta, confidence")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .eq("messaging_angle", messagingAngle)
      .maybeSingle();

    if (existing) {
      const newSampleSize = (existing.sample_size || 0) + 1;
      const weight = 1 / newSampleSize;
      const newPredicted = (existing.predicted_score || 0) * (1 - weight) + predictedScore * weight;
      const newActual = (existing.actual_score || 0) * (1 - weight) + actualScore * weight;
      const newConfidence = Math.min(1, 0.3 + newSampleSize * 0.1);

      await supabase.from("knowledge_graph").update({
        predicted_score: newPredicted,
        actual_score: newActual,
        delta: newActual - newPredicted,
        confidence: newConfidence,
        sample_size: newSampleSize,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("knowledge_graph").insert({
        client_id: clientId || null,
        industry,
        audience_segment: audienceSegment,
        platform,
        messaging_angle: messagingAngle,
        voice_type: voiceType,
        timing_pattern: timingPattern,
        predicted_score: predictedScore,
        actual_score: actualScore,
        delta,
        confidence: 0.3,
        sample_size: 1,
      });
    }
  } catch (e) {
    console.warn("Knowledge graph update failed:", e);
  }

  // 4. Write DELTA to client_brain.strategy_profile
  if (clientId && Math.abs(delta) > 0.05) {
    try {
      const { data: brainDoc } = await supabase
        .from("client_brain")
        .select("data")
        .eq("client_id", clientId)
        .eq("document_type", "strategy_profile")
        .maybeSingle();

      const currentData = (brainDoc?.data || {}) as Record<string, unknown>;
      const learningDeltas = (currentData.learning_deltas || []) as Array<Record<string, unknown>>;

      // Cap deltas at ±20%
      const cappedDelta = Math.max(-0.2, Math.min(0.2, delta));
      learningDeltas.push({
        checkpoint: checkpointLabel,
        campaign_id: campaignId,
        delta: cappedDelta,
        platform,
        messaging_angle: messagingAngle,
        timestamp: new Date().toISOString(),
      });

      // Keep last 50 deltas
      const trimmedDeltas = learningDeltas.slice(-50);

      await supabase.from("client_brain").update({
        data: { ...currentData, learning_deltas: trimmedDeltas },
      }).eq("client_id", clientId).eq("document_type", "strategy_profile");
    } catch (e) {
      console.warn("Strategy profile delta write failed:", e);
    }
  }

  // 5. Flag significant patterns
  if (Math.abs(delta) > 0.15) {
    try {
      await supabase.from("strategy_insights").insert({
        client_id: clientId || null,
        insight_type: delta > 0 ? "outperformer_pattern" : "underperformer_pattern",
        insight_text: `${direction} detected (Δ${delta.toFixed(3)}) for ${platform}/${messagingAngle}/${voiceType}`,
        supporting_data: { delta, actual: actualScore, predicted: predictedScore, checkpoint: checkpointLabel, ai_analysis: aiAnalysis.slice(0, 500) },
        confidence: Math.min(1, 0.5 + Math.abs(delta)),
      });
    } catch (e) {
      console.warn("Insight insert failed:", e);
    }
  }

  return {
    [KNP.σo]: `LEARNING_COMPLETE${KNP_SEP}delta=${delta.toFixed(3)}${KNP_SEP}significance=${significance}`,
    [KNP.λv]: aiAnalysis.slice(0, 250),
    [KNP.πf]: `${significance}${KNP_JOINER}${direction}`,
  };
}

// ============================================================
// FUNCTION B — AZR Looped Learning (background)
// ============================================================

async function azrLearning(clientId?: string): Promise<Record<string, string>> {
  const supabase = getSupabase();

  // INDUCTION: Synthesize rules from all historical data
  const { data: kgData } = await supabase
    .from("knowledge_graph")
    .select("*")
    .order("sample_size", { ascending: false })
    .limit(50);

  if (!kgData || kgData.length < 3) {
    return {
      [KNP.σo]: `AZR_SKIP${KNP_SEP}insufficient_data`,
      [KNP.πf]: "0",
    };
  }

  // Filter for learnable hypotheses (moderate uncertainty)
  const learnableEntries = kgData.filter((entry: Record<string, unknown>) => {
    const conf = Number(entry.confidence || 0);
    return conf > 0.2 && conf < 0.95; // Sweet spot for learning
  });

  if (learnableEntries.length === 0) {
    return {
      [KNP.σo]: `AZR_SKIP${KNP_SEP}no_learnable_hypotheses`,
      [KNP.πf]: "0",
    };
  }

  // AI-powered INDUCTION
  const kgSummary = learnableEntries.slice(0, 20).map((e: Record<string, unknown>) =>
    `${e.platform}/${e.messaging_angle}/${e.voice_type}: Δ${Number(e.delta || 0).toFixed(3)}, conf=${Number(e.confidence || 0).toFixed(2)}, n=${e.sample_size}`
  ).join("\n");

  const inductionResult = await callAI(
    `You are the KLYC Learning Engine in INDUCTION mode. Synthesize generalizable rules from campaign performance data.
Output JSON: { "rules": [{"rule": "...", "confidence": 0.0, "platforms": ["..."], "evidence_count": 0}], "hypotheses": [{"hypothesis": "...", "uncertainty": 0.0}] }`,
    `Knowledge graph entries:\n${kgSummary}`,
    { temperature: 0.6 }
  );

  // Store insights
  try {
    const jsonMatch = inductionResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const rules = parsed.rules || [];
      for (const rule of rules.slice(0, 5)) {
        await supabase.from("strategy_insights").insert({
          client_id: clientId || null,
          insight_type: "azr_induction",
          insight_text: rule.rule,
          supporting_data: { confidence: rule.confidence, platforms: rule.platforms, evidence_count: rule.evidence_count },
          confidence: rule.confidence || 0.5,
        });
      }
    }
  } catch (e) {
    console.warn("AZR insight storage failed:", e);
  }

  return {
    [KNP.σo]: `AZR_COMPLETE${KNP_SEP}rules_synthesized`,
    [KNP.λv]: inductionResult.slice(0, 250),
    [KNP.πf]: String(learnableEntries.length),
  };
}

// ============================================================
// FUNCTION C — Competitor Monitoring (cron)
// ============================================================

async function competitorMonitoring(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  let processed = 0;

  // Fetch unprocessed competitor observations (last 15 minutes for cron)
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: observations } = await supabase
    .from("competitor_observations")
    .select("*")
    .gte("created_at", fifteenMinAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!observations || observations.length === 0) {
    return {
      [KNP.σo]: `COMPETITOR_MONITOR${KNP_SEP}no_new_observations`,
      [KNP.πf]: "0",
    };
  }

  for (const obs of observations) {
    const clientId = obs.client_id;

    // Load client profile for relevance scoring
    let clientProfile: Record<string, unknown> | null = null;
    if (clientId) {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("business_name, industry, target_audience, marketing_goals")
        .eq("id", clientId)
        .maybeSingle();
      clientProfile = profile;
    }

    // ABDUCTION: Infer strategy from observed action
    const abductionResult = await callAI(
      `You are the KLYC Learning Engine in ABDUCTION mode. Given a competitor's observed action, infer their underlying strategy shift.
Output JSON: { "inferred_strategy": "...", "confidence": 0.0, "recommendation": "...", "subjects_to_elevate": ["..."], "urgency": "low|medium|high" }`,
      `Competitor: ${obs.competitor_name}
Action: ${obs.observed_action}
Platform: ${obs.platform}
Engagement delta: ${obs.engagement_delta}
Client industry: ${clientProfile?.industry || "unknown"}
Client audience: ${clientProfile?.target_audience || "unknown"}`,
      { temperature: 0.5 }
    );

    // Parse and store alert
    try {
      const jsonMatch = abductionResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Calculate relevance score
        let relevance = 0.3; // base
        if (clientProfile?.industry && obs.platform) relevance += 0.2; // platform overlap
        if (clientProfile?.target_audience) relevance += 0.2; // audience data exists
        if (Math.abs(obs.engagement_delta || 0) > 0.1) relevance += 0.15; // significant change
        relevance = Math.min(1, relevance);

        await supabase.from("competitor_alerts").insert({
          client_id: clientId,
          competitor_name: obs.competitor_name,
          observed_action: obs.observed_action,
          inferred_strategy: parsed.inferred_strategy || "Unknown strategy shift",
          client_relevance_score: relevance,
          confidence: parsed.confidence || 0.5,
          recommendation: parsed.recommendation || "Monitor closely",
          subjects_to_elevate: parsed.subjects_to_elevate || [],
          urgency: parsed.urgency || "low",
        });
        processed++;
      }
    } catch (e) {
      console.warn("Competitor alert insert failed:", e);
    }
  }

  return {
    [KNP.σo]: `COMPETITOR_MONITOR${KNP_SEP}processed=${processed}`,
    [KNP.πf]: String(processed),
  };
}

// ============================================================
// FUNCTION D — Proactive Intelligence (cron)
// ============================================================

async function proactiveIntelligence(): Promise<Record<string, string>> {
  const supabase = getSupabase();

  // Gather knowledge graph patterns
  const { data: kgPatterns } = await supabase
    .from("knowledge_graph")
    .select("*")
    .gte("sample_size", 3)
    .order("delta", { ascending: false })
    .limit(20);

  // Gather recent competitor alerts
  const { data: recentAlerts } = await supabase
    .from("competitor_alerts")
    .select("*")
    .order("surfaced_at", { ascending: false })
    .limit(10);

  if ((!kgPatterns || kgPatterns.length === 0) && (!recentAlerts || recentAlerts.length === 0)) {
    return {
      [KNP.σo]: `PROACTIVE${KNP_SEP}insufficient_data`,
      [KNP.πf]: "0",
    };
  }

  const patternSummary = (kgPatterns || []).slice(0, 10).map((p: Record<string, unknown>) =>
    `${p.platform}/${p.messaging_angle}: Δ${Number(p.delta || 0).toFixed(3)}, n=${p.sample_size}`
  ).join("\n");

  const alertSummary = (recentAlerts || []).slice(0, 5).map((a: Record<string, unknown>) =>
    `${a.competitor_name}: ${a.inferred_strategy} (relevance=${a.client_relevance_score})`
  ).join("\n");

  const proactiveResult = await callAI(
    `You are the KLYC Proactive Intelligence Engine. Identify opportunities from performance patterns and competitor weaknesses.
Output JSON: { "opportunities": [{"type": "...", "description": "...", "confidence": 0.0, "action": "..."}] }`,
    `Performance patterns:\n${patternSummary}\n\nCompetitor intelligence:\n${alertSummary}`,
    { temperature: 0.6 }
  );

  // Store proactive insights
  let insightsStored = 0;
  try {
    const jsonMatch = proactiveResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      for (const opp of (parsed.opportunities || []).slice(0, 5)) {
        await supabase.from("strategy_insights").insert({
          client_id: null,
          insight_type: `proactive_${opp.type || "opportunity"}`,
          insight_text: opp.description || opp.action,
          supporting_data: { action: opp.action, source: "proactive_intelligence" },
          confidence: opp.confidence || 0.5,
        });
        insightsStored++;
      }
    }
  } catch (e) {
    console.warn("Proactive insight storage failed:", e);
  }

  return {
    [KNP.σo]: `PROACTIVE${KNP_SEP}insights=${insightsStored}`,
    [KNP.πf]: String(insightsStored),
  };
}

// ============================================================
// FUNCTION B-DEDUCTION — Pre-campaign prediction
// ============================================================

async function deductionPreCampaign(payload: Record<string, unknown>): Promise<Record<string, string>> {
  const supabase = getSupabase();
  const clientId = String(payload.client_id || payload[KNP.θc] || "");
  const platform = String(payload.platform || payload[KNP.μp] || "");
  const messagingAngle = String(payload.messaging_angle || "");
  const brief = String(payload.brief || payload[KNP.ξb] || "");

  // Query knowledge graph for similar campaigns
  let query = supabase.from("knowledge_graph").select("*").limit(10);
  if (clientId) query = query.eq("client_id", clientId);
  if (platform && platform !== KNP_NULL) query = query.eq("platform", platform);

  const { data: similar } = await query;

  const historySummary = (similar || []).map((s: Record<string, unknown>) =>
    `${s.platform}/${s.messaging_angle}: avg_actual=${Number(s.actual_score || 0).toFixed(3)}, n=${s.sample_size}`
  ).join("\n");

  const deductionResult = await callAI(
    `You are the KLYC Learning Engine in DEDUCTION mode. Given historical data and a new campaign brief, predict the viral score.
Output JSON: { "predicted_score": 0.0, "confidence": 0.0, "reasoning": "..." }`,
    `Brief: ${brief.slice(0, 300)}
Platform: ${platform}
Angle: ${messagingAngle}
Historical data:\n${historySummary || "No prior data."}`,
    { model: "google/gemini-2.5-flash-lite", temperature: 0.3 }
  );

  let predictedScore = 0.5;
  try {
    const jsonMatch = deductionResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      predictedScore = parsed.predicted_score || 0.5;
    }
  } catch { /* use default */ }

  return {
    [KNP.σo]: `DEDUCTION_COMPLETE${KNP_SEP}predicted=${predictedScore.toFixed(3)}`,
    [KNP.πf]: String(predictedScore),
    [KNP.λv]: deductionResult.slice(0, 250),
  };
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
    const trigger = (body.trigger || body.action || "health") as TriggerType | string;

    // ---- Health Check ----
    if (trigger === "health") {
      return new Response(
        JSON.stringify({
          version: "2.0-knp",
          submind: "learning-engine",
          status: "operational",
          functions: ["campaign_learning", "azr_learning", "competitor_monitoring", "proactive_intelligence", "deduction"],
          knp_version: KNP_VERSION,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let responseSegments: Record<string, string>;

    switch (trigger) {
      case "checkpoint":
        responseSegments = await campaignLearning(body.payload || body);
        break;

      case "campaign_launch":
        responseSegments = await deductionPreCampaign(body.payload || body);
        break;

      case "cron": {
        // Run all background functions
        const [azrResult, compResult, proactiveResult] = await Promise.all([
          azrLearning(),
          competitorMonitoring(),
          proactiveIntelligence(),
        ]);

        responseSegments = {
          [KNP.σo]: [
            azrResult[KNP.σo],
            compResult[KNP.σo],
            proactiveResult[KNP.σo],
          ].join(KNP_JOINER),
          [KNP.πf]: `azr=${azrResult[KNP.πf]}${KNP_JOINER}comp=${compResult[KNP.πf]}${KNP_JOINER}proactive=${proactiveResult[KNP.πf]}`,
        };
        break;
      }

      default:
        responseSegments = {
          [KNP.σo]: `UNKNOWN_TRIGGER${KNP_SEP}${trigger}`,
          [KNP.πf]: "0",
        };
    }

    const elapsed = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "learning-engine",
        status: "complete",
        checksum: knpChecksum(responseSegments),
        timestamp: Date.now(),
        segments: responseSegments,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Learning engine error:", error);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: KNP_NULL,
      [KNP.πf]: "0",
    };
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "learning-engine",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        segments: errorSegments,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
