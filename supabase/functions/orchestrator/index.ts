// ============================================================
// KLYC ORCHESTRATOR — Central Intelligence Hub
// The ONLY entity that communicates with users.
// All subminds are black boxes dispatched via KNP payloads.
// Normalizer membrane wraps all inbound/outbound communication.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---- KNP Field Keys ----
const KNP = {
  // Input keys
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw", πf: "πf", σo: "σo",
  // Output keys
  ρr: "ρr", φd: "φd", ηn: "ηn", ωs: "ωs", δi: "δi", εe: "εe", αa: "αa", χy: "χy", ψv: "ψv",
} as const;

// ---- KNP Format Constants ----
const KNP_VERSION = "Ψ3";
const KNP_FIELD_SEPARATOR = "∷";
const KNP_VALUE_JOINER = "⊕";
const KNP_NULL_MARKER = "∅";

const INPUT_FIELD_MAP: Record<string, string> = {
  campaignBrief: KNP.ξb, targetAudience: KNP.ζq, productInfo: KNP.μp,
  competitiveContext: KNP.θc, brandVoice: KNP.λv, keywords: KNP.κw,
  platforms: KNP.πf, objective: KNP.σo,
};

const OUTPUT_KEY_MAP: Record<string, string> = {
  research: KNP.ρr, product: KNP.φd, narrative: KNP.ηn, social: KNP.ωs,
  image: KNP.δi, editor: KNP.εe, approval: KNP.αa, analytics: KNP.χy,
};

// ---- Normalizer Membrane ----
// Wraps all user↔system communication. Inbound = compress. Outbound = decompress.

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return "Ψ" + Math.abs(h).toString(36);
}

function compressValue(val: unknown): string {
  if (val === null || val === undefined) return KNP_NULL_MARKER;
  const s = typeof val === "string" ? val : JSON.stringify(val);
  return s.trim().slice(0, 400);
}

interface KNPPacket {
  version: string;
  checksum: string;
  timestamp: number;
  segments: Record<string, string>;
  session_id?: string;
}

function extractFieldsFromText(text: string): Record<string, unknown> {
  const fields: Record<string, unknown> = { campaignBrief: text };
  const lower = text.toLowerCase();

  // Audience
  const audMatch = text.match(/(?:target(?:ing)?|audience|for)\s+(.+?)(?:\.|,|$)/i);
  if (audMatch) fields.targetAudience = audMatch[1].trim();

  // Platforms
  const platforms: string[] = [];
  for (const p of ["instagram", "linkedin", "twitter", "tiktok", "youtube", "facebook", "threads", "pinterest"]) {
    if (lower.includes(p)) platforms.push(p);
  }
  if (platforms.length > 0) fields.platforms = platforms;

  // Objective
  for (const obj of ["awareness", "engagement", "conversion", "traffic", "leads", "sales", "brand", "growth"]) {
    if (lower.includes(obj)) { fields.objective = obj; break; }
  }

  // Keywords (quoted)
  const keywords = [...text.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  if (keywords.length > 0) fields.keywords = keywords;

  return fields;
}

/** Compress raw user text → KNP packet */
function normalizerCompress(userInput: string, sessionId: string): KNPPacket {
  const fields = extractFieldsFromText(userInput);
  const segments: Record<string, string> = {};
  for (const [field, key] of Object.entries(INPUT_FIELD_MAP)) {
    const v = fields[field];
    if (v !== undefined && v !== null && v !== "") {
      segments[key] = compressValue(v);
    }
  }
  return {
    version: KNP_VERSION,
    checksum: knpChecksum(segments),
    timestamp: Date.now(),
    segments,
    session_id: sessionId,
  };
}

/** Decompress KNP packet → human-readable text */
function normalizerDecompress(response: string): string {
  // If the response is not a KNP payload (already human-readable), return as-is
  // The orchestrator assembles human-readable text, so this is mostly a passthrough
  // that strips any residual KNP markers
  return response;
}

/** Validate a KNP packet checksum */
function normalizerValidate(packet: KNPPacket): boolean {
  return packet.checksum === knpChecksum(packet.segments);
}

/** Log normalizer errors to Supabase */
async function logNormalizerError(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string | null,
  payloadFragment: string,
  errorType: string
) {
  try {
    await supabase.from("normalizer_errors").insert({
      user_id: userId,
      session_id: sessionId,
      payload_fragment: payloadFragment.slice(0, 200),
      error_type: errorType,
    });
  } catch (e) {
    console.warn("Failed to log normalizer error:", e);
  }
}

// ---- Types ----

type OrchestratorMode = "guided" | "solo";

type SubmindName =
  | "research"
  | "analytics"
  | "creative"
  | "viral"
  | "product"
  | "platform"
  | "timing"
  | "image"
  | "approval"
  | "learningEngine";

interface OrchestratorRequest {
  action: "chat" | "health";
  session_id?: string;
  client_id?: string;
  message?: string;
  knp_payload?: Record<string, unknown>;
  solo_grant?: { enabled: boolean; scope?: string };
}

interface ConversationEntry {
  role: "user" | "orchestrator" | "system";
  content: string;
  timestamp: string;
}

interface SubmindDispatch {
  submind: SubmindName;
  status: "pending" | "in_flight" | "complete" | "error";
  knp_sent?: string;
  knp_received?: string;
  dispatched_at: string;
}

// ---- Intent Detection ----

type DetectedIntent =
  | "campaign_creation"
  | "analytics_query"
  | "solo_mode_grant"
  | "asset_upload"
  | "competitor_check"
  | "content_edit"
  | "scheduling"
  | "approval_request"
  | "general_chat"
  | "unknown";

function detectIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();

  // INTENT: Solo mode grant -> log, set mode, proceed autonomously
  if (
    lower.includes("solo mode") ||
    lower.includes("do it yourself") ||
    lower.includes("make the next campaign yourself") ||
    lower.includes("handle it") ||
    lower.includes("go ahead and decide")
  ) {
    return "solo_mode_grant";
  }

  // INTENT: Campaign creation -> Research + Product + Creative -> Viral loop
  if (
    lower.includes("campaign") ||
    lower.includes("launch") ||
    lower.includes("create content") ||
    lower.includes("new post") ||
    lower.includes("marketing plan")
  ) {
    return "campaign_creation";
  }

  // INTENT: Analytics query -> Research -> Analytics
  if (
    lower.includes("analytics") ||
    lower.includes("performance") ||
    lower.includes("metrics") ||
    lower.includes("how did") ||
    lower.includes("engagement rate") ||
    lower.includes("report")
  ) {
    return "analytics_query";
  }

  // INTENT: Asset upload -> Image
  if (
    lower.includes("upload") ||
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("asset") ||
    lower.includes("visual")
  ) {
    return "asset_upload";
  }

  // INTENT: Competitor check -> Research -> Learning Engine
  if (
    lower.includes("competitor") ||
    lower.includes("competition") ||
    lower.includes("rival") ||
    lower.includes("compare")
  ) {
    return "competitor_check";
  }

  // INTENT: Content editing -> Creative + Platform
  if (
    lower.includes("edit") ||
    lower.includes("rewrite") ||
    lower.includes("revise") ||
    lower.includes("improve")
  ) {
    return "content_edit";
  }

  // INTENT: Scheduling -> Timing + Platform
  if (
    lower.includes("schedule") ||
    lower.includes("when to post") ||
    lower.includes("best time") ||
    lower.includes("calendar")
  ) {
    return "scheduling";
  }

  // INTENT: Approval -> Approval submind
  if (
    lower.includes("approve") ||
    lower.includes("approval") ||
    lower.includes("review") ||
    lower.includes("sign off")
  ) {
    return "approval_request";
  }

  // INTENT: General conversation
  if (
    lower.includes("hello") ||
    lower.includes("hi") ||
    lower.includes("help") ||
    lower.includes("what can you")
  ) {
    return "general_chat";
  }

  return "unknown";
}

// ---- Intent → Submind Routing Map ----

function getSubmindPipeline(
  intent: DetectedIntent
): { subminds: SubmindName[]; parallel: boolean } {
  switch (intent) {
    // INTENT: Campaign creation -> Research + Product + Creative -> Viral loop
    case "campaign_creation":
      return {
        subminds: [
          "research",
          "product",
          "creative",
          "viral",
          "platform",
          "timing",
          "image",
        ],
        parallel: false, // sequential — each feeds the next
      };

    // INTENT: Analytics query -> Research -> Analytics
    case "analytics_query":
      return {
        subminds: ["research", "analytics"],
        parallel: false,
      };

    // INTENT: Competitor check -> Research -> Learning Engine
    case "competitor_check":
      return {
        subminds: ["research", "learningEngine"],
        parallel: false,
      };

    // INTENT: Asset upload -> Image
    case "asset_upload":
      return { subminds: ["image"], parallel: false };

    // INTENT: Content editing -> Creative + Platform
    case "content_edit":
      return {
        subminds: ["creative", "platform"],
        parallel: true,
      };

    // INTENT: Scheduling -> Timing + Platform
    case "scheduling":
      return {
        subminds: ["timing", "platform"],
        parallel: true,
      };

    // INTENT: Approval -> Approval submind
    case "approval_request":
      return { subminds: ["approval"], parallel: false };

    // INTENT: Solo mode grant -> handled separately
    case "solo_mode_grant":
      return { subminds: [], parallel: false };

    // INTENT: General chat -> no subminds needed
    case "general_chat":
    case "unknown":
    default:
      return { subminds: [], parallel: false };
  }
}

// ============================================================
// STUB SUBMIND DISPATCHERS
// Each returns a mock KNP response. Replace with actual
// edge function invocations in subsequent builds.
// ============================================================

// Research submind — dispatched via edge function
async function dispatchResearch(knpPayload: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const parsed = typeof knpPayload === "string" ? JSON.parse(knpPayload) : knpPayload;
    const { data, error } = await supabase.functions.invoke("research", {
      body: parsed,
    });

    if (error) {
      console.error("Research dispatch error:", error);
      return JSON.stringify({
        version: "Ψ3", submind: "research", status: "error",
        [KNP.ρr]: "Research submind returned an error: " + error.message,
        elapsed_ms: 0,
      });
    }

    return JSON.stringify(data);
  } catch (e) {
    console.error("Research invocation failed:", e);
    return JSON.stringify({
      version: "Ψ3", submind: "research", status: "error",
      [KNP.ρr]: "Research dispatch failed: " + (e instanceof Error ? e.message : "unknown"),
      elapsed_ms: 0,
    });
  }
}

// Analytics submind — dispatched via edge function
async function dispatchAnalytics(knpPayload: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const parsed = typeof knpPayload === "string" ? JSON.parse(knpPayload) : knpPayload;
    const { data, error } = await supabase.functions.invoke("analytics", {
      body: parsed,
    });

    if (error) {
      console.error("Analytics dispatch error:", error);
      return JSON.stringify({
        version: "Ψ3", submind: "analytics", status: "error",
        [KNP.χy]: "Analytics submind returned an error: " + error.message,
        elapsed_ms: 0,
      });
    }

    return JSON.stringify(data);
  } catch (e) {
    console.error("Analytics invocation failed:", e);
    return JSON.stringify({
      version: "Ψ3", submind: "analytics", status: "error",
      [KNP.χy]: "Analytics dispatch failed: " + (e instanceof Error ? e.message : "unknown"),
      elapsed_ms: 0,
    });
  }
}

// Creative submind — dispatched via edge function
async function dispatchCreative(knpPayload: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const parsed = typeof knpPayload === "string" ? JSON.parse(knpPayload) : knpPayload;
    const { data, error } = await supabase.functions.invoke("creative", {
      body: parsed,
    });

    if (error) {
      console.error("Creative dispatch error:", error);
      return JSON.stringify({
        version: "Ψ3", submind: "creative", status: "error",
        [KNP.ηn]: "Creative submind returned an error: " + error.message,
        elapsed_ms: 0,
      });
    }

    // Check if Creative flagged INTERVIEW_NEEDED
    if (data?.zq === "INTERVIEW_NEEDED∅") {
      // Return with interview flag — Orchestrator handles the prompt
      return JSON.stringify({
        ...data,
        _interview_needed: true,
        _information_gaps: data.information_gaps || [],
      });
    }

    return JSON.stringify(data);
  } catch (e) {
    console.error("Creative invocation failed:", e);
    return JSON.stringify({
      version: "Ψ3", submind: "creative", status: "error",
      [KNP.ηn]: "Creative dispatch failed: " + (e instanceof Error ? e.message : "unknown"),
      elapsed_ms: 0,
    });
  }
}

// Viral submind — dispatched via edge function
async function dispatchViral(knpPayload: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const parsed = typeof knpPayload === "string" ? JSON.parse(knpPayload) : knpPayload;
    const { data, error } = await supabase.functions.invoke("viral", {
      body: parsed,
    });

    if (error) {
      console.error("Viral dispatch error:", error);
      return JSON.stringify({
        version: "Ψ3", submind: "viral", status: "error",
        [KNP.ψv]: "0",
        error: "Viral submind returned an error: " + error.message,
        elapsed_ms: 0,
      });
    }

    return JSON.stringify(data);
  } catch (e) {
    console.error("Viral invocation failed:", e);
    return JSON.stringify({
      version: "Ψ3", submind: "viral", status: "error",
      [KNP.ψv]: "0",
      error: "Viral dispatch failed: " + (e instanceof Error ? e.message : "unknown"),
      elapsed_ms: 0,
    });
  }
}

// STUB: Replace with actual Product edge function call
async function dispatchProduct(knpPayload: string): Promise<string> {
  await delay(45);
  return JSON.stringify({
    version: "Ψ3",
    submind: "product",
    status: "complete",
    [KNP.φd]:
      "PRODUCT_STUB: Product positioning analyzed. USP extracted. Competitor gaps identified.",
    elapsed_ms: 45,
  });
}

// STUB: Replace with actual Platform edge function call
async function dispatchPlatform(knpPayload: string): Promise<string> {
  await delay(35);
  return JSON.stringify({
    version: "Ψ3",
    submind: "platform",
    status: "complete",
    [KNP.ωs]:
      "PLATFORM_STUB: Recommended: Instagram (primary), LinkedIn (secondary). Format: carousel + story.",
    elapsed_ms: 35,
  });
}

// STUB: Replace with actual Timing edge function call
async function dispatchTiming(knpPayload: string): Promise<string> {
  await delay(25);
  return JSON.stringify({
    version: "Ψ3",
    submind: "timing",
    status: "complete",
    data: "TIMING_STUB: Optimal post times: Tue 10am, Thu 2pm, Sat 9am. Frequency: 3x/week.",
    elapsed_ms: 25,
  });
}

// STUB: Replace with actual Image edge function call
async function dispatchImage(knpPayload: string): Promise<string> {
  await delay(55);
  return JSON.stringify({
    version: "Ψ3",
    submind: "image",
    status: "complete",
    [KNP.δi]:
      "IMAGE_STUB: 3 visual concepts generated. Brand-aligned color palette applied.",
    elapsed_ms: 55,
  });
}

// STUB: Replace with actual Approval edge function call
async function dispatchApproval(knpPayload: string): Promise<string> {
  await delay(20);
  return JSON.stringify({
    version: "Ψ3",
    submind: "approval",
    status: "complete",
    [KNP.αa]:
      "APPROVAL_STUB: Content reviewed. Brand compliance: pass. Tone check: pass.",
    elapsed_ms: 20,
  });
}

// STUB: Replace with actual Learning Engine edge function call
async function dispatchLearningEngine(knpPayload: string): Promise<string> {
  await delay(40);
  return JSON.stringify({
    version: "Ψ3",
    submind: "learningEngine",
    status: "complete",
    data: "LEARNING_STUB: 3 patterns discovered. Strategy adjustments recommended.",
    elapsed_ms: 40,
  });
}

const SUBMIND_DISPATCH: Record<
  SubmindName,
  (knp: string) => Promise<string>
> = {
  research: dispatchResearch,
  analytics: dispatchAnalytics,
  creative: dispatchCreative,
  viral: dispatchViral,
  product: dispatchProduct,
  platform: dispatchPlatform,
  timing: dispatchTiming,
  image: dispatchImage,
  approval: dispatchApproval,
  learningEngine: dispatchLearningEngine,
};

// ---- Helpers ----

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createSupabaseClient(authHeader: string | null) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    }
  );
}

// ---- Session Management ----

async function getOrCreateSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string | undefined,
  userId: string,
  clientId: string
): Promise<{ id: string; mode: OrchestratorMode; history: ConversationEntry[] }> {
  if (sessionId) {
    const { data } = await supabase
      .from("orchestrator_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (data) {
      return {
        id: data.id,
        mode: data.mode as OrchestratorMode,
        history: (data.conversation_history as ConversationEntry[]) || [],
      };
    }
  }

  // Create new session
  const { data, error } = await supabase
    .from("orchestrator_sessions")
    .insert({
      user_id: userId,
      client_id: clientId,
      mode: "guided",
      conversation_history: [],
      active_submind_dispatches: [],
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);

  return { id: data.id, mode: "guided", history: [] };
}

async function updateSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  updates: Record<string, unknown>
) {
  await supabase
    .from("orchestrator_sessions")
    .update(updates)
    .eq("id", sessionId);
}

// ---- Solo Mode Logging ----

async function logSoloDecision(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  userId: string,
  decisionPoint: string,
  submindCalled: string | null,
  knpSent: unknown,
  knpReceived: unknown,
  reasoning: string
) {
  await supabase.from("solo_mode_logs").insert({
    session_id: sessionId,
    user_id: userId,
    decision_point: decisionPoint,
    submind_called: submindCalled,
    knp_payload_sent: knpSent,
    knp_response_received: knpReceived,
    reasoning,
  });
}

// ---- Question Resolution ----

async function resolveFromClientBrain(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  field: string
): Promise<string | null> {
  const { data } = await supabase
    .from("client_brain")
    .select("data, document_type")
    .eq("client_id", clientId);

  if (!data || data.length === 0) return null;

  // Search through brain documents for relevant info
  for (const doc of data) {
    const docData = doc.data as Record<string, unknown>;
    if (docData && typeof docData === "object") {
      const val = docData[field];
      if (val) return typeof val === "string" ? val : JSON.stringify(val);
    }
  }
  return null;
}

function buildGuidedQuestion(context: string, options: string[]): string {
  const numbered = options
    .map((opt, i) => `(${i + 1}) ${opt}`)
    .join("\n");
  return `${context}\n\n${numbered}\n(${options.length + 1}) Something else: ___`;
}

// ---- Pipeline Execution ----

async function executePipeline(
  supabase: ReturnType<typeof createClient>,
  session: { id: string; mode: OrchestratorMode; history: ConversationEntry[] },
  userId: string,
  clientId: string,
  intent: DetectedIntent,
  message: string,
  knpPayload: Record<string, unknown> | undefined
): Promise<string> {
  const pipeline = getSubmindPipeline(intent);

  // No subminds needed — direct response
  if (pipeline.subminds.length === 0) {
    if (intent === "general_chat") {
      return (
        "I'm KLYC, your AI marketing orchestrator. I can help you with:\n\n" +
        "• **Campaign creation** — full pipeline from research to publishing\n" +
        "• **Analytics** — performance metrics and insights\n" +
        "• **Competitor analysis** — market intelligence\n" +
        "• **Content editing** — refine and optimize posts\n" +
        "• **Scheduling** — optimal timing recommendations\n" +
        "• **Solo mode** — say 'handle it yourself' and I'll run autonomously\n\n" +
        "What would you like to work on?"
      );
    }
    return "I'm not sure what you're asking. Could you tell me more about what you'd like to create or analyze?";
  }

  // Build KNP payload from message if not provided
  const payload = knpPayload || {
    version: "Ψ3",
    [KNP.ξb]: message,
    [KNP.σo]: intent,
  };
  const payloadStr = JSON.stringify(payload);

  // Track dispatches
  const dispatches: SubmindDispatch[] = [];
  const results: Record<string, unknown> = {};

  if (pipeline.parallel) {
    // Parallel execution
    const promises = pipeline.subminds.map(async (submind) => {
      const dispatch: SubmindDispatch = {
        submind,
        status: "in_flight",
        knp_sent: payloadStr,
        dispatched_at: new Date().toISOString(),
      };
      dispatches.push(dispatch);

      if (session.mode === "solo") {
        await logSoloDecision(
          supabase, session.id, userId,
          `Dispatching ${submind} (parallel)`, submind,
          payload, null,
          `Intent ${intent} requires ${submind} — running in parallel batch`
        );
      }

      try {
        const result = await SUBMIND_DISPATCH[submind](payloadStr);
        dispatch.status = "complete";
        dispatch.knp_received = result;
        results[submind] = JSON.parse(result);
      } catch (e) {
        dispatch.status = "error";
        results[submind] = { error: (e as Error).message };
      }
    });

    await Promise.all(promises);
  } else {
    // Sequential execution — each feeds the next
    let accumulatedPayload = { ...payload };

    for (const submind of pipeline.subminds) {
      const currentPayloadStr = JSON.stringify(accumulatedPayload);
      const dispatch: SubmindDispatch = {
        submind,
        status: "in_flight",
        knp_sent: currentPayloadStr,
        dispatched_at: new Date().toISOString(),
      };
      dispatches.push(dispatch);

      if (session.mode === "solo") {
        await logSoloDecision(
          supabase, session.id, userId,
          `Dispatching ${submind} (sequential, step ${dispatches.length})`,
          submind, accumulatedPayload, null,
          `Sequential chain: ${submind} receives accumulated context from previous subminds`
        );
      }

      try {
        const result = await SUBMIND_DISPATCH[submind](currentPayloadStr);
        dispatch.status = "complete";
        dispatch.knp_received = result;

        const parsed = JSON.parse(result);
        results[submind] = parsed;

        // ── Creative ↔ Viral Loop ──
        // After Creative returns, route to Viral for scoring.
        // If Viral scores are low, re-dispatch Creative with feedback. Max 3 loops.
        if (submind === "creative" && parsed.status === "complete" && parsed.variants_structured) {
          // Check for interview needed flag
          if (parsed._interview_needed) {
            const gaps = parsed._information_gaps || [];
            const gapQuestions: Record<string, { context: string; options: string[] }> = {
              customer_emotional_trigger: {
                context: "To make this campaign hit, I need to understand your customer's emotional trigger. I'm guessing:",
                options: [
                  "They feel guilty about what they're currently using",
                  "They want to feel like a responsible/premium buyer",
                  "They're frustrated by the lack of transparency in the market",
                ],
              },
              brand_voice: {
                context: "I want to nail your brand voice. Which feels closest?",
                options: [
                  "We're the trusted expert — calm, authoritative, no fluff",
                  "We're the cool friend — casual, witty, relatable",
                  "We're the challenger — bold, direct, unapologetic",
                ],
              },
              success_metric: {
                context: "What does success look like for this campaign?",
                options: ["More sales/conversions", "Brand awareness and reach", "Email signups or leads"],
              },
              past_failures: {
                context: "Have any marketing approaches fallen flat before?",
                options: [
                  "Overly corporate tone that felt impersonal",
                  "Discount-heavy messaging that cheapened the brand",
                  "Trying to go viral with humor that missed the mark",
                ],
              },
            };

            const firstGap = gaps[0] || "customer_emotional_trigger";
            const q = gapQuestions[firstGap] || gapQuestions.customer_emotional_trigger;
            results[submind] = {
              ...parsed,
              _interview_question: buildGuidedQuestion(q.context, q.options),
            };
            // Skip remaining subminds — need user input
            break;
          }

          // Run Creative ↔ Viral loop (max 3 iterations)
          let creativeResult = parsed;
          let iteration = parsed.iteration_round || 1;
          const MAX_LOOPS = 3;

          while (iteration < MAX_LOOPS) {
            // Dispatch Viral with creative output
            const viralPayload = JSON.stringify({
              version: "Ψ3",
              σo: creativeResult.σo,
              variants_structured: creativeResult.variants_structured,
              θc: creativeResult.θc,
              [KNP.ξb]: accumulatedPayload[KNP.ξb],
            });

            const viralResult = await SUBMIND_DISPATCH.viral(viralPayload);
            const viralParsed = JSON.parse(viralResult);
            results["viral"] = viralParsed;

            // Check viral score — if good enough, break
            const viralScore = parseFloat(String(viralParsed[KNP.ψv] || viralParsed.viral_score || "0"));
            if (viralScore >= 0.7) break; // Good enough, no more iterations

            // Low score — re-dispatch Creative with viral feedback
            iteration++;
            const creativePayload = JSON.stringify({
              ...accumulatedPayload,
              λv: viralParsed.diagnostics || viralParsed[KNP.ψv] || JSON.stringify(viralParsed),
              πf: String(iteration),
            });

            const reResult = await SUBMIND_DISPATCH.creative(creativePayload);
            creativeResult = JSON.parse(reResult);
            results["creative"] = creativeResult;

            dispatches.push({
              submind: "creative",
              status: "complete",
              knp_sent: creativePayload,
              knp_received: reResult,
              dispatched_at: new Date().toISOString(),
            });
          }

          // Merge final creative output into accumulated payload
          for (const key of Object.values(KNP)) {
            if (creativeResult[key]) {
              (accumulatedPayload as Record<string, unknown>)[key] = creativeResult[key];
            }
          }
          // Skip viral in the main pipeline since we already ran it
          const viralIdx = pipeline.subminds.indexOf("viral");
          if (viralIdx > -1) {
            // Mark as handled so the loop skips it
            (accumulatedPayload as Record<string, unknown>)["_viral_handled"] = true;
          }
          continue;
        }

        // Skip viral if already handled by Creative ↔ Viral loop
        if (submind === "viral" && (accumulatedPayload as Record<string, unknown>)["_viral_handled"]) {
          dispatch.status = "complete";
          dispatch.knp_received = JSON.stringify(results["viral"] || {});
          continue;
        }

        // Inject submind output into accumulated payload for next stage
        for (const key of Object.values(KNP)) {
          if (parsed[key]) {
            (accumulatedPayload as Record<string, unknown>)[key] = parsed[key];
          }
        }
      } catch (e) {
        dispatch.status = "error";
        results[submind] = { error: (e as Error).message };
        // Continue pipeline even on error — other subminds may still work
      }
    }
  }

  // Update session with dispatch records
  await updateSession(supabase, session.id, {
    active_submind_dispatches: dispatches,
  });

  // Assemble user-facing response
  return assembleResponse(intent, results, session.mode);
}

// ---- Response Assembly ----

function assembleResponse(
  intent: DetectedIntent,
  results: Record<string, unknown>,
  mode: OrchestratorMode
): string {
  const sections: string[] = [];

  if (mode === "solo") {
    sections.push("🤖 **Solo Mode** — I made all decisions autonomously. Here's what I did:\n");
  }

  // Extract readable content from each submind result
  for (const [submind, result] of Object.entries(results)) {
    if (!result || typeof result !== "object") continue;
    const r = result as Record<string, unknown>;

    if (r.error) {
      sections.push(`⚠️ **${submind}**: encountered an issue — ${r.error}`);
      continue;
    }

    // Pull the primary output field or data field
    const output =
      r[KNP.ρr] || r[KNP.χy] || r[KNP.ηn] || r[KNP.ψv] ||
      r[KNP.φd] || r[KNP.ωs] || r[KNP.δi] || r[KNP.εe] ||
      r[KNP.αa] || r.data || "Complete.";

    sections.push(`**${formatSubmindName(submind)}**: ${output}`);
  }

  if (sections.length === 0) {
    return "I processed your request but didn't get results from any subminds. Let me try a different approach — could you tell me more?";
  }

  // Add guided mode suggestion if applicable
  if (mode === "guided" && intent === "campaign_creation") {
    sections.push(
      "\n---\n" +
      buildGuidedQuestion(
        "Based on this analysis, I'd suggest one of these directions:",
        [
          "Instagram Reels with a humor hook targeting your core audience",
          "LinkedIn carousel with data-driven storytelling for B2B reach",
          "Multi-platform blitz — simultaneous launch across all channels",
        ]
      )
    );
  }

  if (mode === "solo") {
    sections.push("\n📋 *Full decision chain available in your solo mode logs.*");
  }

  return sections.join("\n\n");
}

function formatSubmindName(name: string): string {
  const names: Record<string, string> = {
    research: "🔍 Research",
    analytics: "📊 Analytics",
    creative: "✍️ Creative",
    viral: "🔥 Viral Score",
    product: "📦 Product",
    platform: "📱 Platform",
    timing: "⏰ Timing",
    image: "🎨 Image",
    approval: "✅ Approval",
    learningEngine: "🧠 Learning Engine",
  };
  return names[name] || name;
}

// ============================================================
// SERVE
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: OrchestratorRequest = await req.json();

    // ---- Health Check ----
    if (body.action === "health") {
      return jsonRes({
        status: "operational",
        version: "1.0-orchestrator",
        subminds: Object.keys(SUBMIND_DISPATCH),
        modes: ["guided", "solo"],
        features: [
          "dynamic_intent_routing",
          "knp_payload_support",
          "session_persistence",
          "solo_mode_logging",
          "guided_3guess_format",
          "sequential_and_parallel_dispatch",
          "client_brain_resolution",
        ],
      });
    }

    // ---- Chat Action ----
    if (body.action !== "chat") {
      return jsonRes({ error: `Unknown action: ${body.action}` }, 400);
    }

    if (!body.message && !body.knp_payload) {
      return jsonRes({ error: "message or knp_payload required" }, 400);
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createSupabaseClient(authHeader);

    // Get user from JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const userId = user.id;
    const clientId = body.client_id || userId;
    const message = body.message || "";

    // Session
    const session = await getOrCreateSession(
      supabase, body.session_id, userId, clientId
    );

    // Handle solo mode grant
    if (body.solo_grant?.enabled) {
      session.mode = "solo";
      await updateSession(supabase, session.id, {
        mode: "solo",
        solo_permission_scope: body.solo_grant.scope || "full",
      });
      await logSoloDecision(
        supabase, session.id, userId,
        "Solo mode activated",
        null, null, null,
        `User granted solo permission. Scope: ${body.solo_grant.scope || "full"}`
      );
    }

    // Check intent for solo mode trigger from message
    const intent = detectIntent(message);
    if (intent === "solo_mode_grant" && session.mode !== "solo") {
      session.mode = "solo";
      await updateSession(supabase, session.id, {
        mode: "solo",
        solo_permission_scope: "full",
      });
      await logSoloDecision(
        supabase, session.id, userId,
        "Solo mode activated via message",
        null, null, null,
        `User said: "${message}". Interpreted as solo mode grant.`
      );

      // Append to history
      const history = [
        ...session.history,
        { role: "user" as const, content: message, timestamp: new Date().toISOString() },
        {
          role: "orchestrator" as const,
          content: "🤖 Solo Mode activated. I'll handle everything autonomously and log all decisions for your review. What should I work on?",
          timestamp: new Date().toISOString(),
        },
      ];
      await updateSession(supabase, session.id, { conversation_history: history });

      return jsonRes({
        session_id: session.id,
        mode: "solo",
        response: "🤖 **Solo Mode activated.** I'll handle everything autonomously and log all decisions for your review.\n\nWhat should I work on?",
        intent: "solo_mode_grant",
        subminds_dispatched: [],
      });
    }

    // ── NORMALIZER MEMBRANE: Compress inbound ──
    const knpPacket = body.knp_payload
      ? body.knp_payload as Record<string, unknown>
      : normalizerCompress(message, session.id);

    // Validate if it's a KNP packet
    if ('checksum' in knpPacket && 'segments' in knpPacket) {
      if (!normalizerValidate(knpPacket as KNPPacket)) {
        await logNormalizerError(supabase, userId, session.id, JSON.stringify(knpPacket).slice(0, 200), "checksum_mismatch");
        return jsonRes({
          session_id: session.id,
          mode: session.mode,
          response: "I had trouble processing that message. Could you try sending it again?",
          intent: "unknown",
          subminds_dispatched: [],
          normalizer_error: true,
        });
      }
    }

    // Enrich with client brain context
    const enrichedPayload = { ...knpPacket } as Record<string, unknown>;
    const brainVoice = await resolveFromClientBrain(supabase, clientId, "voice_profile");
    if (brainVoice) {
      enrichedPayload[KNP.λv] = brainVoice;
    }
    const brainStrategy = await resolveFromClientBrain(supabase, clientId, "strategy_profile");
    if (brainStrategy) {
      enrichedPayload[KNP.σo] = enrichedPayload[KNP.σo] || brainStrategy;
    }

    // Execute pipeline (subminds receive ONLY KNP — never raw human text)
    const rawResponse = await executePipeline(
      supabase,
      session,
      userId,
      clientId,
      intent,
      message,
      enrichedPayload
    );

    // ── NORMALIZER MEMBRANE: Decompress outbound ──
    const response = normalizerDecompress(rawResponse);

    // Update conversation history
    const updatedHistory: ConversationEntry[] = [
      ...session.history,
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "orchestrator", content: response, timestamp: new Date().toISOString() },
    ];
    await updateSession(supabase, session.id, {
      conversation_history: updatedHistory,
    });

    const pipeline = getSubmindPipeline(intent);

    return jsonRes({
      session_id: session.id,
      mode: session.mode,
      response,
      intent,
      subminds_dispatched: pipeline.subminds,
      pipeline_parallel: pipeline.parallel,
      knp_compressed: true,
    });
  } catch (err) {
    console.error("Orchestrator error:", err);
    return jsonRes(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
