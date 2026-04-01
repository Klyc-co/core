import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──

type SubmindFocus =
  | "normalizer"
  | "research"
  | "product"
  | "narrative"
  | "social"
  | "image"
  | "editor"
  | "approval"
  | "analytics";

interface SubmindProfile {
  focus: SubmindFocus;
  description: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  outputFormat: string;
  maxTokens: number;
  requiresLLM: boolean;
}

// ── Submind Profiles ──

const SUBMIND_PROFILES: Record<SubmindFocus, SubmindProfile> = {
  normalizer: {
    focus: "normalizer",
    description: "Pure TS field validator — no LLM call required",
    model: "none",
    temperature: 0,
    systemPrompt: "",
    outputFormat: "json",
    maxTokens: 0,
    requiresLLM: false,
  },
  research: {
    focus: "research",
    description: "Market signals & audience insight analysis",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
    systemPrompt:
      "You are a senior market research analyst. Analyze the campaign context and return structured market signals, audience insights, competitive landscape, and opportunity areas. Be data-driven and specific.",
    outputFormat: "json",
    maxTokens: 2000,
    requiresLLM: true,
  },
  product: {
    focus: "product",
    description: "Positioning & differentiator extraction",
    model: "claude-sonnet-4-20250514",
    temperature: 0.6,
    systemPrompt:
      "You are a product positioning strategist. Extract key differentiators, value propositions, competitive advantages, and positioning statements from the provided context. Output structured positioning data.",
    outputFormat: "json",
    maxTokens: 2000,
    requiresLLM: true,
  },
  narrative: {
    focus: "narrative",
    description: "7 storytelling type generation",
    model: "claude-sonnet-4-20250514",
    temperature: 0.8,
    systemPrompt:
      "You are a master storyteller and brand narrative architect. Generate campaign narratives using these 7 storytelling types: (1) Origin Story, (2) Problem-Solution, (3) Social Proof, (4) Future Vision, (5) Behind-the-Scenes, (6) Customer Journey, (7) Contrast/Before-After. Each narrative must be tailored to the brand voice and campaign objectives.",
    outputFormat: "json",
    maxTokens: 3000,
    requiresLLM: true,
  },
  social: {
    focus: "social",
    description: "Platform-specific post generation",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
    systemPrompt:
      "You are a social media content strategist. Generate platform-optimized posts with appropriate tone, length, hashtags, and CTAs for each target platform. Respect character limits and platform best practices.",
    outputFormat: "json",
    maxTokens: 2500,
    requiresLLM: true,
  },
  image: {
    focus: "image",
    description: "Visual prompt generation for AI image creation",
    model: "claude-haiku-4-5-20251001",
    temperature: 0.6,
    systemPrompt:
      "You are a visual creative director. Generate detailed, production-ready image prompts for AI image generation tools. Include composition, style, color palette, mood, and brand alignment details.",
    outputFormat: "json",
    maxTokens: 1500,
    requiresLLM: true,
  },
  editor: {
    focus: "editor",
    description: "Quality assurance & content refinement",
    model: "claude-sonnet-4-20250514",
    temperature: 0.4,
    systemPrompt:
      "You are a senior content editor and QA specialist. Review the generated content for grammar, brand voice consistency, factual accuracy, platform compliance, and overall quality. Flag issues and provide corrected versions.",
    outputFormat: "json",
    maxTokens: 2000,
    requiresLLM: true,
  },
  approval: {
    focus: "approval",
    description: "Compliance & brand safety checks",
    model: "claude-haiku-4-5-20251001",
    temperature: 0.3,
    systemPrompt:
      "You are a compliance and brand safety reviewer. Check content for regulatory compliance, brand guideline adherence, potential PR risks, and legal issues. Return a pass/fail verdict with specific findings.",
    outputFormat: "json",
    maxTokens: 1500,
    requiresLLM: true,
  },
  analytics: {
    focus: "analytics",
    description: "Viral scoring & performance prediction (VS = 0.25*E + 0.25*V + 0.20*N + 0.15*D + 0.10*CS + 0.05*EE)",
    model: "claude-sonnet-4-20250514",
    temperature: 0.5,
    systemPrompt:
      "You are a campaign analytics and performance prediction specialist. Score each piece of content using this viral scoring formula: VS = 0.25*Engagement + 0.25*Virality + 0.20*Novelty + 0.15*Demand + 0.10*ContentStrength + 0.05*EmotionalEnergy. Return numeric scores (0-100) for each factor and the weighted total.",
    outputFormat: "json",
    maxTokens: 1500,
    requiresLLM: true,
  },
};

const NORMALIZER_FIELDS = [
  "campaignBrief",
  "targetAudience",
  "productInfo",
  "competitiveContext",
  "brandVoice",
  "keywords",
  "platforms",
  "objective",
] as const;

// ── Claude API ──

async function callClaude(
  profile: SubmindProfile,
  userPrompt: string
): Promise<{ success: boolean; data: any; error?: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return {
      success: false,
      data: null,
      error: "ANTHROPIC_API_KEY not configured — submind skipped",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: profile.model,
        max_tokens: profile.maxTokens,
        temperature: profile.temperature,
        system: profile.systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Claude API error (${profile.focus}):`, res.status, errText);
      return { success: false, data: null, error: `Claude ${res.status}: ${errText.slice(0, 200)}` };
    }

    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";

    // Try to parse JSON from the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
      return { success: true, data: parsed };
    } catch {
      return { success: true, data: { raw: text } };
    }
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Claude call failed (${profile.focus}):`, msg);
    return { success: false, data: null, error: msg.includes("abort") ? "Timeout (30s)" : msg };
  }
}

// ── Normalizer (pure TS) ──

function runNormalizer(input: Record<string, any>): {
  valid: boolean;
  present: string[];
  missing: string[];
  coverage: number;
} {
  const present: string[] = [];
  const missing: string[] = [];

  for (const field of NORMALIZER_FIELDS) {
    const val = input[field];
    if (val && ((typeof val === "string" && val.trim()) || (Array.isArray(val) && val.length > 0) || typeof val === "object")) {
      present.push(field);
    } else {
      missing.push(field);
    }
  }

  const coverage = Math.round((present.length / NORMALIZER_FIELDS.length) * 100);
  return { valid: missing.length === 0, present, missing, coverage };
}

// ── Pipeline runner ──

async function runPipeline(
  stages: SubmindFocus[],
  input: Record<string, any>
): Promise<{ stages: Array<{ focus: SubmindFocus; status: string; durationMs: number; data: any; error?: string }>; totalMs: number }> {
  const results: Array<{ focus: SubmindFocus; status: string; durationMs: number; data: any; error?: string }> = [];
  let context = { ...input };
  const pipelineStart = Date.now();

  for (const focus of stages) {
    const profile = SUBMIND_PROFILES[focus];
    const stageStart = Date.now();

    if (focus === "normalizer") {
      const normResult = runNormalizer(context);
      results.push({ focus, status: "complete", durationMs: Date.now() - stageStart, data: normResult });
      context = { ...context, _normalizer: normResult };
      continue;
    }

    if (!profile.requiresLLM) {
      results.push({ focus, status: "skipped", durationMs: 0, data: null });
      continue;
    }

    const prompt = buildPrompt(focus, context);
    const { success, data, error } = await callClaude(profile, prompt);

    results.push({
      focus,
      status: success ? "complete" : "error",
      durationMs: Date.now() - stageStart,
      data,
      error,
    });

    if (success && data) {
      context = { ...context, [`_${focus}`]: data };
    }
  }

  return { stages: results, totalMs: Date.now() - pipelineStart };
}

function buildPrompt(focus: SubmindFocus, context: Record<string, any>): string {
  const brief = context.campaignBrief || context.input_as_text || "No brief provided";
  const audience = context.targetAudience || context.target_audience || "Not specified";
  const product = context.productInfo || context.product_summary || "Not specified";
  const brand = context.brandVoice || context.compressed_customer_dna || "Not specified";
  const competitors = context.competitiveContext || context.competitor_summary || "Not specified";
  const platforms = context.platforms || [];
  const objective = context.objective || "General campaign";

  const base = `Campaign Brief: ${brief}\nTarget Audience: ${audience}\nProduct: ${product}\nBrand Voice: ${brand}\nCompetitors: ${competitors}\nPlatforms: ${Array.isArray(platforms) ? platforms.join(", ") : platforms}\nObjective: ${objective}`;

  const priorResults = Object.entries(context)
    .filter(([k]) => k.startsWith("_") && k !== "_normalizer")
    .map(([k, v]) => `\n\n--- Prior stage (${k.slice(1)}) output ---\n${JSON.stringify(v).slice(0, 800)}`)
    .join("");

  const normInfo = context._normalizer
    ? `\n\nNormalization: ${context._normalizer.coverage}% coverage, missing: ${context._normalizer.missing.join(", ") || "none"}`
    : "";

  return `${base}${normInfo}${priorResults}\n\nRespond with valid JSON only.`;
}

// ── Full pipeline order ──

const FULL_PIPELINE: SubmindFocus[] = [
  "normalizer",
  "research",
  "product",
  "narrative",
  "social",
  "image",
  "editor",
  "approval",
  "analytics",
];

// ── Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action: string = body.action || "create";

    // Health check
    if (action === "health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          subminds: Object.keys(SUBMIND_PROFILES).length,
          pipelineOrder: FULL_PIPELINE,
          hasAnthropicKey: Boolean(Deno.env.get("ANTHROPIC_API_KEY")),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single submind
    if (action === "single") {
      const focus = body.focus as SubmindFocus;
      if (!focus || !SUBMIND_PROFILES[focus]) {
        return new Response(
          JSON.stringify({ error: `Invalid focus. Valid: ${FULL_PIPELINE.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = await runPipeline([focus], body.input || {});
      return new Response(JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate (subset of stages)
    if (action === "simulate") {
      const stages: SubmindFocus[] = body.stages || ["normalizer", "research", "narrative"];
      const invalid = stages.filter((s: string) => !SUBMIND_PROFILES[s as SubmindFocus]);
      if (invalid.length) {
        return new Response(
          JSON.stringify({ error: `Invalid stages: ${invalid.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = await runPipeline(stages, body.input || {});
      return new Response(JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create (full pipeline)
    if (action === "create") {
      const result = await runPipeline(FULL_PIPELINE, body.input || {});
      const completedCount = result.stages.filter((s) => s.status === "complete").length;
      const errorCount = result.stages.filter((s) => s.status === "error").length;

      return new Response(
        JSON.stringify({
          success: errorCount === 0,
          partialSuccess: completedCount > 0 && errorCount > 0,
          summary: { total: result.stages.length, completed: completedCount, errors: errorCount, totalMs: result.totalMs },
          stages: result.stages,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action "${action}". Valid: create, simulate, single, health` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("campaign-pipeline error:", err);
    return new Response(
      JSON.stringify({ error: "Internal pipeline error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
