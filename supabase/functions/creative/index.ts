// ============================================================
// KLYC CREATIVE SUBMIND — Content Generation Engine
// Writes campaign copy, headlines, hooks, CTAs, messaging variants.
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

// ---- Strategy Angles ----
const STRATEGY_ANGLES = [
  "pain-led",       // Open with the problem the audience has
  "aspiration-led", // Open with the outcome/transformation
  "social-proof-led", // Open with validation/credibility
  "curiosity-led",  // Open with a hook that demands the click
  "contrast-led",   // Open with what this product is NOT
] as const;

// ---- Types ----

interface CreativeVariant {
  headline: string;
  hook: string;
  body: string;
  cta: string;
  platform: string;
  model_type: string;
  voice_type: string;
  strategy_angle: string;
}

interface CreativeInput {
  brief: string;
  model_type: string;   // PRECISION | STORY | DISRUPTOR
  voice_type: string;   // PROFESSIONAL | CONVERSATIONAL | BOLD
  platforms: string[];
  product_guardrails: string;
  viral_feedback: string | null;
  iteration_round: number;
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

function splitJoined(val: string): string[] {
  if (isNull(val)) return [];
  return val.split(KNP_JOINER).map((s) => s.trim()).filter(Boolean);
}

function encodeVariantsToKnp(variants: CreativeVariant[]): string {
  return variants
    .map(
      (v) =>
        `headline${KNP_SEP}${v.headline}${KNP_JOINER}hook${KNP_SEP}${v.hook}${KNP_JOINER}body${KNP_SEP}${v.body.slice(0, 300)}${KNP_JOINER}cta${KNP_SEP}${v.cta}${KNP_JOINER}platform${KNP_SEP}${v.platform}${KNP_JOINER}model${KNP_SEP}${v.model_type}${KNP_JOINER}voice${KNP_SEP}${v.voice_type}${KNP_JOINER}angle${KNP_SEP}${v.strategy_angle}`
    )
    .join("|||");
}

// ---- Information Gap Analysis ----

function analyzeInformationGaps(input: CreativeInput, brainData: Record<string, unknown> | null): string[] {
  const gaps: string[] = [];

  // Do I know what makes customers feel something?
  const hasAudience = brainData?.target_audience || brainData?.audience_data;
  if (!hasAudience && !input.brief.toLowerCase().includes("audience")) {
    gaps.push("customer_emotional_trigger");
  }

  // Do I know what the brand sounds like?
  const hasVoice = brainData?.voice_profile || brainData?.tone;
  if (!hasVoice && input.voice_type === "CONVERSATIONAL") {
    gaps.push("brand_voice");
  }

  // Do I know the success metric?
  const hasGoal = input.brief.toLowerCase().match(/sales|signups|sign.?up|foot traffic|awareness|leads|conversion/);
  if (!hasGoal && !brainData?.marketing_goals) {
    gaps.push("success_metric");
  }

  // Do I know what has failed?
  const hasHistory = brainData?.failed_approaches || brainData?.past_failures;
  if (!hasHistory) {
    gaps.push("past_failures");
  }

  return gaps;
}

// ---- Model Selection Logic ----

function resolveModelAndVoice(
  requestedModel: string,
  requestedVoice: string,
  brainStrategy: Record<string, unknown> | null
): { model: string; voice: string } {
  const validModels = ["PRECISION", "STORY", "DISRUPTOR"];
  const validVoices = ["PROFESSIONAL", "CONVERSATIONAL", "BOLD"];

  let model = validModels.includes(requestedModel) ? requestedModel : "";
  let voice = validVoices.includes(requestedVoice) ? requestedVoice : "";

  // If one missing, try brain strategy defaults
  if (!model && brainStrategy?.preferred_model) {
    const pm = String(brainStrategy.preferred_model).toUpperCase();
    if (validModels.includes(pm)) model = pm;
  }
  if (!voice && brainStrategy?.preferred_voice) {
    const pv = String(brainStrategy.preferred_voice).toUpperCase();
    if (validVoices.includes(pv)) voice = pv;
  }

  // Safest baseline
  if (!model) model = "STORY";
  if (!voice) voice = "CONVERSATIONAL";

  return { model, voice };
}

// ---- AI Generation ----

async function generateVariants(input: CreativeInput, brainContext: string): Promise<CreativeVariant[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const isIteration = input.iteration_round > 1 && input.viral_feedback;
  const temperature = isIteration ? 0.4 : 0.8;

  const anglesInstruction = isIteration
    ? `ITERATION ROUND ${input.iteration_round}/3. Viral feedback from previous round:\n${input.viral_feedback}\n\nAnalyze WHY scores were low. Switch to completely DIFFERENT strategy angles. Do NOT just rewrite with different words.`
    : `First generation. Use 4 different strategy angles from: ${STRATEGY_ANGLES.join(", ")}. Each variant MUST use a different angle.`;

  const systemPrompt = `You are the KLYC Creative Engine. You generate campaign content variants.

RULES:
- Generate exactly 4 content variants
- Each variant uses a DIFFERENT strategic angle
- Model type: ${input.model_type} — ${input.model_type === "PRECISION" ? "data-driven, metric-focused, specific claims" : input.model_type === "STORY" ? "narrative-driven, emotional arc, transformation story" : "pattern-interrupt, unexpected, provocative"}
- Voice type: ${input.voice_type} — ${input.voice_type === "PROFESSIONAL" ? "authoritative, polished, trust-building" : input.voice_type === "BOLD" ? "edgy, confident, unapologetic" : "warm, relatable, human"}
- Platform targets: ${input.platforms.join(", ")}
- Product guardrails: ${input.product_guardrails}
${brainContext ? `\nBrand context:\n${brainContext}` : ""}

${anglesInstruction}

Respond ONLY with valid JSON array of exactly 4 objects. Each object: { "headline": "", "hook": "", "body": "", "cta": "", "platform": "", "strategy_angle": "" }
Platform should be one of: ${input.platforms.join(", ")}. Distribute variants across platforms.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Brief: ${input.brief}` },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const aiResult = await response.json();
  const raw = aiResult.choices?.[0]?.message?.content || "[]";

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON array");

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    headline: string;
    hook: string;
    body: string;
    cta: string;
    platform: string;
    strategy_angle: string;
  }>;

  return parsed.slice(0, 4).map((v) => ({
    headline: v.headline || "",
    hook: v.hook || "",
    body: v.body || "",
    cta: v.cta || "",
    platform: v.platform || input.platforms[0] || "instagram",
    model_type: input.model_type,
    voice_type: input.voice_type,
    strategy_angle: v.strategy_angle || "unknown",
  }));
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
    const modelRaw = parseKnpField(body["θc"] || body.θc);
    const voiceRaw = parseKnpField(body["κw"] || body.κw);
    const platformsRaw = parseKnpField(body["μp"] || body.μp);
    const guardrails = parseKnpField(body["zq"] || body.zq);
    const viralFeedback = parseKnpField(body["λv"] || body.λv);
    const iterationRound = parseInt(String(body["πf"] || body.πf || "1"), 10) || 1;
    const clientId = parseKnpField(body["θc_client"] || body.client_id);

    // Brief is required
    if (isNull(brief)) {
      return new Response(
        JSON.stringify({
          version: "Ψ3",
          submind: "creative",
          status: "error",
          σo: KNP_NULL,
          [`zq${KNP_SEP}MISSING${KNP_NULL}`]: "Brief is required for content generation",
          elapsed_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Load Client Brain Context ----
    let brainData: Record<string, unknown> | null = null;
    let brainContext = "";
    let brainStrategy: Record<string, unknown> | null = null;

    if (!isNull(clientId)) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: brainDocs } = await supabase
          .from("client_brain")
          .select("data, document_type")
          .eq("client_id", clientId);

        if (brainDocs && brainDocs.length > 0) {
          brainData = {};
          for (const doc of brainDocs) {
            const d = doc.data as Record<string, unknown>;
            if (d) Object.assign(brainData, d);
            if (doc.document_type === "strategy_profile") {
              brainStrategy = d;
            }
          }
          brainContext = JSON.stringify(brainData).slice(0, 800);
        }
      } catch (e) {
        console.warn("Failed to load client brain:", e);
      }
    }

    // ---- Resolve Model + Voice ----
    const modelTypes = splitJoined(modelRaw);
    const voiceTypes = splitJoined(voiceRaw);
    const { model, voice } = resolveModelAndVoice(
      modelTypes[0] || "",
      voiceTypes[0] || "",
      brainStrategy
    );

    // ---- Resolve Platforms ----
    const platforms = splitJoined(platformsRaw);
    if (platforms.length === 0) platforms.push("instagram", "linkedin", "twitter");

    // ---- Information Gap Analysis ----
    const input: CreativeInput = {
      brief,
      model_type: model,
      voice_type: voice,
      platforms,
      product_guardrails: isNull(guardrails) ? "No guardrails specified" : guardrails,
      viral_feedback: isNull(viralFeedback) ? null : viralFeedback,
      iteration_round: iterationRound,
    };

    const gaps = analyzeInformationGaps(input, brainData);

    // If critical gaps exist on first round, flag for interview
    if (gaps.length >= 2 && iterationRound === 1) {
      return new Response(
        JSON.stringify({
          version: "Ψ3",
          submind: "creative",
          status: "complete",
          σo: KNP_NULL,
          [`zq`]: `INTERVIEW_NEEDED${KNP_NULL}`,
          information_gaps: gaps,
          θc: `${model}${KNP_JOINER}${voice}`,
          elapsed_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Generate Content Variants ----
    const variants = await generateVariants(input, brainContext);

    // ---- Encode Output as KNP ----
    const encodedVariants = encodeVariantsToKnp(variants);

    return new Response(
      JSON.stringify({
        version: "Ψ3",
        submind: "creative",
        status: "complete",
        σo: encodedVariants,
        θc: `${model}${KNP_JOINER}${voice}`,
        variant_count: variants.length,
        iteration_round: iterationRound,
        strategy_angles_used: variants.map((v) => v.strategy_angle),
        variants_structured: variants, // structured for Viral consumption
        elapsed_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Creative submind error:", e);
    return new Response(
      JSON.stringify({
        version: "Ψ3",
        submind: "creative",
        status: "error",
        σo: KNP_NULL,
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
