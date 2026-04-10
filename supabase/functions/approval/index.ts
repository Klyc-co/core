import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KNP_NULL = "∅";

function parseKnp(val: unknown): string {
  if (val === null || val === undefined) return KNP_NULL;
  const s = String(val).trim();
  return s === "" ? KNP_NULL : s;
}

function isNull(v: string): boolean {
  return v === KNP_NULL || v === "" || v === "null" || v === "undefined";
}

function parseJsonField(v: string): any {
  if (isNull(v)) return null;
  try { return JSON.parse(v); } catch { return null; }
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

// Gate thresholds
const GATE_THRESHOLDS = {
  factual_accuracy: { pass: 0.8, hard_fail: 0.5, weight: 0.30 },
  brand_alignment: { pass: 0.8, hard_fail: 0.5, weight: 0.25 },
  audience_fit: { pass: 0.7, hard_fail: 0.5, weight: 0.20 },
  quality_standards: { pass: 0.8, hard_fail: 0.5, weight: 0.25 },
};

const COMPOSITE_PASS = 0.80;
const INDIVIDUAL_MIN = 0.70;
const MAX_ITERATIONS = 3;

interface GateScore {
  score: number;
  passed: boolean;
  hard_fail: boolean;
  notes: string[];
}

interface ApprovalResult {
  decision: "approved" | "revision_requested" | "rejected";
  composite_score: number;
  criteria_scores: {
    factual_accuracy: GateScore;
    brand_alignment: GateScore;
    audience_fit: GateScore;
    quality_standards: GateScore;
  };
  revision_notes: string;
  conflicts: string[];
  iteration: number;
  reviewer: "ai";
}

async function logDecision(result: ApprovalResult, clientId: string, campaignId: string) {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("approval_history").insert({
      client_id: isNull(clientId) ? null : clientId,
      campaign_id: isNull(campaignId) ? null : campaignId,
      decision: result.decision,
      review_criteria: result.criteria_scores,
      revision_notes: result.revision_notes,
      iteration_number: result.iteration,
      reviewer: "ai",
      submitted_at: new Date().toISOString(),
      decided_at: new Date().toISOString(),
      what_was_proposed: JSON.stringify({ composite: result.composite_score, conflicts: result.conflicts }),
      user_id: "00000000-0000-0000-0000-000000000000",
    });
  } catch (e) {
    console.warn("Failed to log approval decision:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();

    const creativeRaw = parseKnp(body.θc ?? body["θc"]);
    const narrativeRaw = parseKnp(body.Ν ?? body["Ν"]);
    const positioningRaw = parseKnp(body.Π ?? body["Π"]);
    const guardrailsRaw = parseKnp(body.Γ ?? body["Γ"]);
    const researchRaw = parseKnp(body.ρr ?? body["ρr"]);
    const imageRaw = parseKnp(body.ωi ?? body["ωi"]);
    const clientId = parseKnp(body.client_id ?? body.θc_client);
    const campaignId = parseKnp(body.campaign_id);
    const iterationNum = typeof body.iteration === "number" ? body.iteration : 1;

    const creative = parseJsonField(creativeRaw) || body.creative || null;
    const narrative = parseJsonField(narrativeRaw) || body.narrative || null;
    const positioning = parseJsonField(positioningRaw) || body.positioning || null;
    const guardrails = parseJsonField(guardrailsRaw) || body.guardrails || [];
    const research = parseJsonField(researchRaw) || body.research || null;
    const imageReview = parseJsonField(imageRaw) || body.image_review || null;
    const brief = body.brief || body.ξb || "";
    const audience = body.audience || body.zq || "";
    const voice = body.voice || body.λv || "";

    if (!creative) {
      return new Response(
        JSON.stringify({ version: "Ψ3", submind: "approval", status: "error", σo: KNP_NULL, error: "Creative input required for approval" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (iterationNum > MAX_ITERATIONS) {
      const rejected: ApprovalResult = {
        decision: "rejected",
        composite_score: 0,
        criteria_scores: {
          factual_accuracy: { score: 0, passed: false, hard_fail: true, notes: ["Max revision cycles exceeded"] },
          brand_alignment: { score: 0, passed: false, hard_fail: true, notes: ["Max revision cycles exceeded"] },
          audience_fit: { score: 0, passed: false, hard_fail: true, notes: ["Max revision cycles exceeded"] },
          quality_standards: { score: 0, passed: false, hard_fail: true, notes: ["Max revision cycles exceeded"] },
        },
        revision_notes: "Maximum 3 revision cycles exceeded. Escalating to human review.",
        conflicts: [],
        iteration: iterationNum,
        reviewer: "ai",
      };
      await logDecision(rejected, clientId, campaignId);
      const elapsed = Date.now() - startTime;
      await logHealth("approval", false, elapsed, null, null);
      return new Response(
        JSON.stringify({ version: "Ψ3", submind: "approval", status: "complete", ...rejected, elapsed_ms: elapsed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const systemPrompt = `You are a brand compliance and content quality reviewer. You evaluate marketing content against factual accuracy, brand alignment, audience fit, and quality standards. You can NEVER be bypassed. NEVER reference internal system names, protocols, or technical identifiers in any output.

## FOUR PERMANENT GATES — Score each 0.0 to 1.0:

1. FACTUAL ACCURACY (threshold: ≥0.8, hard fail: <0.5)
   - Cross-check ALL claims against research findings and guardrails
   - Flag any unsupported, exaggerated, or misleading claims
   - Guardrails: ${JSON.stringify(guardrails)}
   ${research ? `Research context: ${JSON.stringify(research).slice(0, 500)}` : "No research context provided"}

2. BRAND ALIGNMENT (threshold: ≥0.8, hard fail: <0.5)
   - Does messaging match the brand voice and positioning?
   - Brand voice: ${voice || "Not specified"}
   ${positioning ? `Positioning: ${JSON.stringify(positioning).slice(0, 500)}` : ""}

3. AUDIENCE FIT (threshold: ≥0.7, hard fail: <0.5)
   - Does content match the target audience?
   - Platform-appropriate tone and format?
   - Target audience: ${audience || "Not specified"}
   - Brief: ${brief}

4. QUALITY STANDARDS (threshold: ≥0.8, hard fail: <0.5)
   - Grammar, clarity, professionalism
   - Visual brand consistency (if applicable)
   ${imageReview ? `Image review scores: ${JSON.stringify(imageReview).slice(0, 300)}` : ""}
   ${narrative ? `NarrativeRank target: ≥3.5. Narrative: ${JSON.stringify(narrative).slice(0, 300)}` : ""}

## CONFLICT DETECTION
If the creative pushes in one direction but positioning/guardrails push another, flag it.

## OUTPUT FORMAT — Return ONLY this JSON:
{
  "factual_accuracy": { "score": 0.0, "notes": ["specific issues"] },
  "brand_alignment": { "score": 0.0, "notes": ["specific issues"] },
  "audience_fit": { "score": 0.0, "notes": ["specific issues"] },
  "quality_standards": { "score": 0.0, "notes": ["specific issues"] },
  "conflicts": ["any disagreements detected"],
  "overall_notes": "summary of key findings"
}

Be strict. This gate exists to prevent bad content from reaching the public.`;

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
        messages: [{ role: "user", content: `Review this creative content for approval (iteration ${iterationNum}):\n${JSON.stringify(creative)}` }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) throw new Error("RATE_LIMITED");
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const tokensIn = aiResult.usage?.input_tokens ?? null;
    const tokensOut = aiResult.usage?.output_tokens ?? null;
    const raw = aiResult.content?.[0]?.text || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON");

    const aiScores = JSON.parse(jsonMatch[0]);

    const gates: Record<string, GateScore> = {};
    for (const [gate, config] of Object.entries(GATE_THRESHOLDS)) {
      const aiGate = aiScores[gate] || { score: 0.5, notes: [] };
      const score = typeof aiGate.score === "number" ? Math.min(1, Math.max(0, aiGate.score)) : 0.5;
      gates[gate] = {
        score,
        passed: score >= config.pass,
        hard_fail: score < config.hard_fail,
        notes: Array.isArray(aiGate.notes) ? aiGate.notes : [],
      };
    }

    const composite = Object.entries(GATE_THRESHOLDS).reduce(
      (sum, [gate, config]) => sum + (gates[gate]?.score || 0) * config.weight, 0
    );

    const hasHardFail = Object.values(gates).some(g => g.hard_fail);
    const allAboveMin = Object.values(gates).every(g => g.score >= INDIVIDUAL_MIN);
    const conflicts: string[] = Array.isArray(aiScores.conflicts) ? aiScores.conflicts : [];

    let decision: "approved" | "revision_requested" | "rejected";
    let revisionNotes = "";

    if (hasHardFail) {
      decision = "rejected";
      const failedGates = Object.entries(gates).filter(([, g]) => g.hard_fail).map(([k]) => k);
      revisionNotes = `HARD FAIL on: ${failedGates.join(", ")}. ${aiScores.overall_notes || ""}`;
    } else if (composite >= COMPOSITE_PASS && allAboveMin) {
      decision = "approved";
      revisionNotes = aiScores.overall_notes || "All gates passed.";
    } else {
      decision = "revision_requested";
      const weakGates = Object.entries(gates)
        .filter(([, g]) => !g.passed)
        .map(([k, g]) => `${k}: ${g.score.toFixed(2)} (needs ≥${GATE_THRESHOLDS[k as keyof typeof GATE_THRESHOLDS].pass}) — ${g.notes.join("; ")}`)
        .join("\n");
      revisionNotes = `Revision needed:\n${weakGates}\n${aiScores.overall_notes || ""}`;
    }

    if (conflicts.length) {
      revisionNotes += `\n\nCONFLICTS DETECTED:\n${conflicts.join("\n")}`;
    }

    const result: ApprovalResult = {
      decision,
      composite_score: Math.round(composite * 100) / 100,
      criteria_scores: {
        factual_accuracy: gates.factual_accuracy,
        brand_alignment: gates.brand_alignment,
        audience_fit: gates.audience_fit,
        quality_standards: gates.quality_standards,
      },
      revision_notes: revisionNotes.trim(),
      conflicts,
      iteration: iterationNum,
      reviewer: "ai",
    };

    await logDecision(result, clientId, campaignId);

    const elapsed = Date.now() - startTime;
    await logHealth("approval", true, elapsed, tokensIn, tokensOut);

    return new Response(
      JSON.stringify({
        version: "Ψ3",
        submind: "approval",
        status: "complete",
        σo: JSON.stringify(result),
        ...result,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    const status = errMsg === "RATE_LIMITED" ? 429 : errMsg === "PAYMENT_REQUIRED" ? 402 : 500;
    const elapsed = Date.now() - startTime;
    await logHealth("approval", false, elapsed, null, null);
    return new Response(
      JSON.stringify({ version: "Ψ3", submind: "approval", status: "error", σo: KNP_NULL, error: errMsg, elapsed_ms: elapsed }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
