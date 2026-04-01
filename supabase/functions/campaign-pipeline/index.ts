import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ──

type SubmindFocus =
  | "normalizer" | "research" | "product" | "narrative" | "social"
  | "image" | "editor" | "approval" | "analytics";

interface SubmindProfile {
  focus: SubmindFocus;
  description: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  requiresLLM: boolean;
}

// ── KNP Field Keys ──

const KNP = {
  // Input keys
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw", πf: "πf", σo: "σo",
  // Output keys
  ρr: "ρr", φd: "φd", ηn: "ηn", ωs: "ωs", δi: "δi", εe: "εe", αa: "αa", χy: "χy", ψv: "ψv",
} as const;

const INPUT_FIELD_MAP: Record<string, string> = {
  campaignBrief: KNP.ξb, targetAudience: KNP.ζq, productInfo: KNP.μp,
  competitiveContext: KNP.θc, brandVoice: KNP.λv, keywords: KNP.κw,
  platforms: KNP.πf, objective: KNP.σo,
};

const OUTPUT_KEY_MAP: Record<string, string> = {
  research: KNP.ρr, product: KNP.φd, narrative: KNP.ηn, social: KNP.ωs,
  image: KNP.δi, editor: KNP.εe, approval: KNP.αa, analytics: KNP.χy,
};

// ── Submind Field Access ──

const SUBMIND_FIELDS: Record<SubmindFocus, string[]> = {
  normalizer: Object.values(INPUT_FIELD_MAP),
  research:   [KNP.ξb, KNP.ζq, KNP.θc, KNP.κw],
  product:    [KNP.μp, KNP.θc, KNP.λv, KNP.ρr],
  narrative:  [KNP.ξb, KNP.λv, KNP.ζq, KNP.φd],
  social:     [KNP.πf, KNP.ζq, KNP.λv, KNP.ηn],
  image:      [KNP.λv, KNP.ηn, KNP.ωs],
  editor:     [KNP.λv, KNP.ωs, KNP.δi, KNP.σo],
  approval:   [KNP.ξb, KNP.εe, KNP.λv],
  analytics:  [KNP.ζq, KNP.πf, KNP.ωs, KNP.αa],
};

// ── KNP Packet ──

interface KNPPacket {
  version: string;
  checksum: string;
  timestamp: number;
  segments: Record<string, string>;
}

function compressValue(val: unknown): string {
  if (!val) return "";
  const s = typeof val === "string" ? val : JSON.stringify(val);
  return s.trim().slice(0, 400);
}

function computeChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => k+v).join("|");
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return "Ψ" + Math.abs(h).toString(36);
}

function buildKNPPacket(input: Record<string, any>): KNPPacket {
  const segments: Record<string, string> = {};
  for (const [field, key] of Object.entries(INPUT_FIELD_MAP)) {
    const v = input[field];
    if (v !== undefined && v !== null && v !== "") {
      segments[key] = compressValue(v);
    }
  }
  return { version: "Ψ3", checksum: computeChecksum(segments), timestamp: Date.now(), segments };
}

function extractFieldsForSubmind(packet: KNPPacket, focus: SubmindFocus): Record<string, string> {
  const keys = SUBMIND_FIELDS[focus] || [];
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (packet.segments[k]) out[k] = packet.segments[k];
  }
  return out;
}

function injectSubmindOutput(packet: KNPPacket, focus: SubmindFocus, data: any): void {
  const key = OUTPUT_KEY_MAP[focus];
  if (!key) return;
  const compressed = compressValue(data).slice(0, 250);
  packet.segments[key] = compressed;
  packet.checksum = computeChecksum(packet.segments);
}

// ── Submind Profiles ──

const SUBMIND_PROFILES: Record<SubmindFocus, SubmindProfile> = {
  normalizer: {
    focus: "normalizer", description: "KNP compression & field validation", model: "none",
    temperature: 0, systemPrompt: "", maxTokens: 0, requiresLLM: false,
  },
  research: {
    focus: "research", description: "Market signals & audience insight analysis",
    model: "claude-sonnet-4-20250514", temperature: 0.7,
    systemPrompt: "You are a senior market research analyst. Analyze the campaign context and return structured market signals, audience insights, competitive landscape, and opportunity areas. Be data-driven and specific.",
    maxTokens: 2000, requiresLLM: true,
  },
  product: {
    focus: "product", description: "Positioning & differentiator extraction",
    model: "claude-sonnet-4-20250514", temperature: 0.6,
    systemPrompt: "You are a product positioning strategist. Extract key differentiators, value propositions, competitive advantages, and positioning statements from the provided context. Output structured positioning data.",
    maxTokens: 2000, requiresLLM: true,
  },
  narrative: {
    focus: "narrative", description: "7 storytelling type generation",
    model: "claude-sonnet-4-20250514", temperature: 0.8,
    systemPrompt: "You are a master storyteller and brand narrative architect. Generate campaign narratives using these 7 storytelling types: (1) Origin Story, (2) Problem-Solution, (3) Social Proof, (4) Future Vision, (5) Behind-the-Scenes, (6) Customer Journey, (7) Contrast/Before-After. Each narrative must be tailored to the brand voice and campaign objectives.",
    maxTokens: 3000, requiresLLM: true,
  },
  social: {
    focus: "social", description: "Platform-specific post generation",
    model: "claude-sonnet-4-20250514", temperature: 0.7,
    systemPrompt: "You are a social media content strategist. Generate platform-optimized posts with appropriate tone, length, hashtags, and CTAs for each target platform. Respect character limits and platform best practices.",
    maxTokens: 2500, requiresLLM: true,
  },
  image: {
    focus: "image", description: "Visual prompt generation for AI image creation",
    model: "claude-haiku-4-5-20251001", temperature: 0.6,
    systemPrompt: "You are a visual creative director. Generate detailed, production-ready image prompts for AI image generation tools. Include composition, style, color palette, mood, and brand alignment details.",
    maxTokens: 1500, requiresLLM: true,
  },
  editor: {
    focus: "editor", description: "Quality assurance & content refinement",
    model: "claude-sonnet-4-20250514", temperature: 0.4,
    systemPrompt: "You are a senior content editor and QA specialist. Review the generated content for grammar, brand voice consistency, factual accuracy, platform compliance, and overall quality. Flag issues and provide corrected versions.",
    maxTokens: 2000, requiresLLM: true,
  },
  approval: {
    focus: "approval", description: "Compliance & brand safety checks",
    model: "claude-haiku-4-5-20251001", temperature: 0.3,
    systemPrompt: "You are a compliance and brand safety reviewer. Check content for regulatory compliance, brand guideline adherence, potential PR risks, and legal issues. Return a pass/fail verdict with specific findings.",
    maxTokens: 1500, requiresLLM: true,
  },
  analytics: {
    focus: "analytics",
    description: "Viral scoring & performance prediction (VS = 0.25*E + 0.25*V + 0.20*N + 0.15*D + 0.10*CS + 0.05*EE)",
    model: "claude-sonnet-4-20250514", temperature: 0.5,
    systemPrompt: "You are a campaign analytics and performance prediction specialist. Score each piece of content using this viral scoring formula: VS = 0.25*Engagement + 0.25*Virality + 0.20*Novelty + 0.15*Demand + 0.10*ContentStrength + 0.05*EmotionalEnergy. Return numeric scores (0-100) for each factor and the weighted total.",
    maxTokens: 1500, requiresLLM: true,
  },
};

const NORMALIZER_FIELDS = Object.keys(INPUT_FIELD_MAP);

// ── Claude API ──

async function callClaude(
  profile: SubmindProfile,
  userPrompt: string
): Promise<{ success: boolean; data: any; error?: string; tokens?: { input: number; output: number } }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { success: false, data: null, error: "ANTHROPIC_API_KEY not configured" };
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
      return { success: false, data: null, error: `Claude ${res.status}: ${errText.slice(0, 200)}` };
    }

    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";
    const tokens = json.usage ? { input: json.usage.input_tokens, output: json.usage.output_tokens } : undefined;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
      return { success: true, data: parsed, tokens };
    } catch {
      return { success: true, data: { raw: text }, tokens };
    }
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg.includes("abort") ? "Timeout (30s)" : msg };
  }
}

// ── Normalizer (KNP) ──

function runNormalizer(input: Record<string, any>): {
  valid: boolean; present: string[]; missing: string[]; coverage: number;
  knpPacket: KNPPacket; compressionRatio: number;
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
  const knpPacket = buildKNPPacket(input);
  const rawSize = JSON.stringify(input).length;
  const compressedSize = JSON.stringify(knpPacket.segments).length;
  const compressionRatio = rawSize > 0 ? Math.round((1 - compressedSize / rawSize) * 100) : 0;

  return { valid: missing.length === 0, present, missing, coverage, knpPacket, compressionRatio };
}

// ── Build prompt from KNP fields ──

function buildKNPPrompt(focus: SubmindFocus, fields: Record<string, string>): string {
  const labels: Record<string, string> = {
    [KNP.ξb]: "Campaign Brief", [KNP.ζq]: "Target Audience", [KNP.μp]: "Product Info",
    [KNP.θc]: "Competitive Context", [KNP.λv]: "Brand Voice", [KNP.κw]: "Keywords",
    [KNP.πf]: "Platforms", [KNP.σo]: "Objective",
    [KNP.ρr]: "Research Output", [KNP.φd]: "Product Output", [KNP.ηn]: "Narrative Output",
    [KNP.ωs]: "Social Output", [KNP.δi]: "Image Output", [KNP.εe]: "Editor Output",
    [KNP.αa]: "Approval Output", [KNP.χy]: "Analytics Output",
  };
  const lines = Object.entries(fields).map(([k, v]) => `${labels[k] || k}: ${v}`);
  return lines.join("\n") + "\n\nRespond with valid JSON only.";
}

// ── Pipeline stages ──

const FULL_PIPELINE: SubmindFocus[] = [
  "normalizer", "research", "product", "narrative", "social", "image", "editor", "approval", "analytics",
];

interface StageResult {
  focus: SubmindFocus;
  status: string;
  durationMs: number;
  data: any;
  error?: string;
  tokens?: { input: number; output: number };
}

// ── Standard pipeline runner ──

async function runPipeline(
  stages: SubmindFocus[],
  input: Record<string, any>
): Promise<{ stages: StageResult[]; totalMs: number; totalTokens: { input: number; output: number }; knpCompression?: number }> {
  const results: StageResult[] = [];
  let packet: KNPPacket | null = null;
  let totalTokens = { input: 0, output: 0 };
  let compressionRatio = 0;
  const pipelineStart = Date.now();

  for (const focus of stages) {
    const profile = SUBMIND_PROFILES[focus];
    const stageStart = Date.now();

    if (focus === "normalizer") {
      const norm = runNormalizer(input);
      packet = norm.knpPacket;
      compressionRatio = norm.compressionRatio;
      results.push({ focus, status: "complete", durationMs: Date.now() - stageStart, data: { valid: norm.valid, present: norm.present, missing: norm.missing, coverage: norm.coverage, compressionRatio: norm.compressionRatio, knpVersion: packet.version } });
      continue;
    }

    if (!profile.requiresLLM) {
      results.push({ focus, status: "skipped", durationMs: 0, data: null });
      continue;
    }

    if (!packet) packet = buildKNPPacket(input);
    const fields = extractFieldsForSubmind(packet, focus);
    const prompt = buildKNPPrompt(focus, fields);
    const { success, data, error, tokens } = await callClaude(profile, prompt);

    if (tokens) { totalTokens.input += tokens.input; totalTokens.output += tokens.output; }

    results.push({ focus, status: success ? "complete" : "error", durationMs: Date.now() - stageStart, data, error, tokens });

    if (success && data) injectSubmindOutput(packet, focus, data);
  }

  return { stages: results, totalMs: Date.now() - pipelineStart, totalTokens, knpCompression: compressionRatio };
}

// ── SSE streaming pipeline ──

async function* runPipelineStreaming(
  stages: SubmindFocus[],
  input: Record<string, any>
): AsyncGenerator<{ event: string; data: any }> {
  let packet: KNPPacket | null = null;
  let totalTokens = { input: 0, output: 0 };
  let compressionRatio = 0;
  const pipelineStart = Date.now();

  for (const focus of stages) {
    const profile = SUBMIND_PROFILES[focus];
    yield { event: "stage_start", data: { focus, description: profile.description, timestamp: Date.now() } };
    const stageStart = Date.now();

    if (focus === "normalizer") {
      const norm = runNormalizer(input);
      packet = norm.knpPacket;
      compressionRatio = norm.compressionRatio;
      const stageData = { valid: norm.valid, present: norm.present, missing: norm.missing, coverage: norm.coverage, compressionRatio: norm.compressionRatio, knpVersion: packet.version };
      yield { event: "stage_complete", data: { focus, status: "complete", durationMs: Date.now() - stageStart, data: stageData } };
      continue;
    }

    if (!profile.requiresLLM) {
      yield { event: "stage_complete", data: { focus, status: "skipped", durationMs: 0, data: null } };
      continue;
    }

    if (!packet) packet = buildKNPPacket(input);
    const fields = extractFieldsForSubmind(packet, focus);
    const prompt = buildKNPPrompt(focus, fields);
    const { success, data, error, tokens } = await callClaude(profile, prompt);

    if (tokens) { totalTokens.input += tokens.input; totalTokens.output += tokens.output; }
    if (success && data) injectSubmindOutput(packet, focus, data);

    yield { event: "stage_complete", data: { focus, status: success ? "complete" : "error", durationMs: Date.now() - stageStart, data, error, tokens } };
  }

  yield { event: "pipeline_complete", data: { totalMs: Date.now() - pipelineStart, totalTokens, knpCompression: compressionRatio, stageCount: stages.length } };
}

// ── Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action: string = body.action || "create";

    // Health
    if (action === "health") {
      return new Response(
        JSON.stringify({
          status: "ok", version: "2.0-knp",
          subminds: Object.keys(SUBMIND_PROFILES).length,
          pipelineOrder: FULL_PIPELINE,
          features: ["knp_compression", "sse_streaming", "token_tracking", "submind_field_scoping"],
          hasAnthropicKey: Boolean(Deno.env.get("ANTHROPIC_API_KEY")),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single submind
    if (action === "single") {
      const focus = body.focus as SubmindFocus;
      if (!focus || !SUBMIND_PROFILES[focus]) {
        return new Response(JSON.stringify({ error: `Invalid focus. Valid: ${FULL_PIPELINE.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const result = await runPipeline([focus], body.input || {});
      return new Response(JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Simulate
    if (action === "simulate") {
      const stages: SubmindFocus[] = body.stages || ["normalizer", "research", "narrative"];
      const invalid = stages.filter((s: string) => !SUBMIND_PROFILES[s as SubmindFocus]);
      if (invalid.length) {
        return new Response(JSON.stringify({ error: `Invalid stages: ${invalid.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (body.stream) {
        return createSSEResponse(stages, body.input || {});
      }
      const result = await runPipeline(stages, body.input || {});
      return new Response(JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create (full pipeline)
    if (action === "create") {
      if (body.stream) {
        return createSSEResponse(FULL_PIPELINE, body.input || {});
      }
      const result = await runPipeline(FULL_PIPELINE, body.input || {});
      const completedCount = result.stages.filter((s) => s.status === "complete").length;
      const errorCount = result.stages.filter((s) => s.status === "error").length;
      return new Response(
        JSON.stringify({
          success: errorCount === 0,
          partialSuccess: completedCount > 0 && errorCount > 0,
          summary: { total: result.stages.length, completed: completedCount, errors: errorCount, totalMs: result.totalMs, totalTokens: result.totalTokens, knpCompression: result.knpCompression },
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

function createSSEResponse(stages: SubmindFocus[], input: Record<string, any>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const evt of runPipelineStreaming(stages, input)) {
          controller.enqueue(encoder.encode(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
