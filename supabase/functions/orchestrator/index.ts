// ============================================================
// KLYC ORCHESTRATOR — Central Intelligence Hub v2
// The ONLY entity that communicates with users.
// All subminds are black boxes dispatched via KNP payloads.
// Normalizer membrane wraps all inbound/outbound communication.
// WEB TOPOLOGY — no fixed pipeline order.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── KNP Field Keys ──
const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw", πf: "πf", σo: "σo",
  ρr: "ρr", φd: "φd", ηn: "ηn", ωs: "ωs", δi: "δi", εe: "εe", αa: "αa", χy: "χy", ψv: "ψv",
} as const;

const KNP_VERSION = "Ψ3";

const INPUT_FIELD_MAP: Record<string, string> = {
  campaignBrief: KNP.ξb, targetAudience: KNP.ζq, productInfo: KNP.μp,
  competitiveContext: KNP.θc, brandVoice: KNP.λv, keywords: KNP.κw,
  platforms: KNP.πf, objective: KNP.σo,
};

// ── Types ──

type OrchestratorMode = "guided" | "solo";

type DetectedIntent =
  | "campaign_new"
  | "trend_analysis"
  | "performance_review"
  | "content_revision"
  | "learning_report"
  | "general_chat";

type SubmindName =
  | "research" | "product" | "narrative" | "creative"
  | "social" | "image" | "approval"
  | "viral" | "analytics" | "learning-engine";

interface OrchestratorRequest {
  action: "chat" | "health";
  session_id?: string;
  client_id?: string;
  message?: string;
  knp_payload?: Record<string, unknown>;
  solo_grant?: { enabled: boolean; scope?: string };
}

interface OrchestratorResponse {
  reply: string;
  intent: DetectedIntent;
  source: "orchestrator";
  next_questions: NextQuestion[];
  requires_approval: boolean;
  risk_level: "low" | "medium" | "high";
  session_id: string;
  subminds_invoked: string[];
  mode?: OrchestratorMode;
}

interface NextQuestion {
  field: string;
  question: string;
  type: "button" | "fill_in";
  nav_target?: string;
}

interface PhaseSpec {
  subminds: SubmindName[];
  parallel: boolean;
}

// ── Helpers ──

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRuntimeConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return { supabaseUrl, serviceRoleKey, anonKey };
}

function makeServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getRuntimeConfig();
  return createClient(supabaseUrl, serviceRoleKey);
}

function makeAuthClient(authHeader: string) {
  const { supabaseUrl, anonKey } = getRuntimeConfig();
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// ── Normalizer Membrane ──

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return "Ψ" + Math.abs(h).toString(36);
}

function compressValue(val: unknown): string {
  if (val === null || val === undefined) return "";
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

  const audMatch = text.match(/(?:target(?:ing)?|audience|for)\s+(.+?)(?:\.|,|$)/i);
  if (audMatch) fields.targetAudience = audMatch[1].trim();

  const platforms: string[] = [];
  for (const p of ["instagram", "linkedin", "twitter", "tiktok", "youtube", "facebook", "threads", "pinterest"]) {
    if (lower.includes(p)) platforms.push(p);
  }
  if (platforms.length > 0) fields.platforms = platforms;

  for (const obj of ["awareness", "engagement", "conversion", "traffic", "leads", "sales", "brand", "growth"]) {
    if (lower.includes(obj)) { fields.objective = obj; break; }
  }

  return fields;
}

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

// ── Intent Detection ──

function detectIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();

  // PERFORMANCE_REVIEW — check BEFORE campaign_new to avoid "campaign" false positive
  if (
    lower.includes("how did") || lower.includes("perform") ||
    lower.includes("analytics") || lower.includes("metrics") ||
    lower.includes("engagement rate") ||
    (lower.includes("report") && !lower.includes("create"))
  ) {
    return "performance_review";
  }

  // TREND_ANALYSIS
  if (
    lower.includes("trend") || lower.includes("what's trending") ||
    lower.includes("market signals") || lower.includes("industry trend") ||
    lower.includes("what's hot")
  ) {
    return "trend_analysis";
  }

  // CAMPAIGN_NEW
  if (
    lower.includes("create") || lower.includes("new campaign") ||
    lower.includes("launch") || lower.includes("build a campaign") ||
    lower.includes("marketing plan") || lower.includes("new post") ||
    (lower.includes("campaign") && (lower.includes("for") || lower.includes("about") || lower.includes("on")))
  ) {
    return "campaign_new";
  }

  // CONTENT_REVISION
  if (
    lower.includes("edit") || lower.includes("rewrite") ||
    lower.includes("revise") || lower.includes("improve") ||
    lower.includes("optimize") || lower.includes("refine")
  ) {
    return "content_revision";
  }

  // LEARNING_REPORT
  if (
    lower.includes("what did we learn") || lower.includes("retrospective") ||
    lower.includes("learnings") || lower.includes("takeaways") ||
    lower.includes("lessons")
  ) {
    return "learning_report";
  }

  // General chat — greetings, help, anything else
  return "general_chat";
}

// ── Intent → Phase Routing (Web Topology) ──

function getIntentPhases(intent: DetectedIntent): PhaseSpec[] {
  switch (intent) {
    case "campaign_new":
      return [
        { subminds: ["research", "product", "social"], parallel: true },   // Phase 1
        { subminds: ["narrative", "creative"], parallel: false },            // Phase 2 sequential
        { subminds: ["image", "social"], parallel: true },                  // Phase 3
        { subminds: ["approval"], parallel: false },                        // Phase 4 gate
      ];
    case "trend_analysis":
      return [
        { subminds: ["research", "social"], parallel: true },
        { subminds: ["approval"], parallel: false },
      ];
    case "performance_review":
      return [
        { subminds: ["research"], parallel: false },
        { subminds: ["approval"], parallel: false },
      ];
    case "content_revision":
      return [
        { subminds: ["creative"], parallel: false },
        { subminds: ["narrative", "image"], parallel: false },
        { subminds: ["approval"], parallel: false },
      ];
    case "learning_report":
      return [
        { subminds: ["research"], parallel: false },
        { subminds: ["narrative"], parallel: false },
        { subminds: ["approval"], parallel: false },
      ];
    case "general_chat":
    default:
      return [];
  }
}

// ── Submind Dispatch ──

const STUB_SUBMINDS = new Set<SubmindName>(["viral"]);
const INLINE_SUBMINDS = new Set<SubmindName>(["product"]);

// ── Product Submind (inline module — lightweight, Haiku-class) ──

async function runProductInline(
  knpPayload: Record<string, unknown>,
): Promise<{ success: boolean; data: unknown; error?: string; durationMs: number }> {
  const start = Date.now();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  const brief = (knpPayload[KNP.ξb] || knpPayload.brief || "") as string;
  const audience = (knpPayload[KNP.ζq] || knpPayload.audience || "") as string;
  const product = (knpPayload[KNP.μp] || knpPayload.product || "") as string;
  const researchRaw = knpPayload[KNP.ρr] || knpPayload.researchContext;
  const clientBrain = knpPayload.clientBrain as Record<string, unknown> | undefined;

  const MOAT_WEIGHTS = { switchingCosts: 0.20, intangibleAssets: 0.25, networkEffects: 0.20, costAdvantage: 0.15, efficientScale: 0.20 };

  type MoatRaw = { switchingCosts: number; intangibleAssets: number; networkEffects: number; costAdvantage: number; efficientScale: number };
  type MoatRating = "WIDE" | "NARROW" | "NONE";

  function scoreMoat(s: MoatRaw): { composite: number; rating: MoatRating } {
    const c = s.switchingCosts * MOAT_WEIGHTS.switchingCosts + s.intangibleAssets * MOAT_WEIGHTS.intangibleAssets +
      s.networkEffects * MOAT_WEIGHTS.networkEffects + s.costAdvantage * MOAT_WEIGHTS.costAdvantage +
      s.efficientScale * MOAT_WEIGHTS.efficientScale;
    const composite = Math.round(c * 100) / 100;
    return { composite, rating: composite >= 4.0 ? "WIDE" : composite >= 2.5 ? "NARROW" : "NONE" };
  }

  function moatMsg(r: MoatRating) {
    return r === "WIDE" ? "Category leader — emphasize dominance" : r === "NARROW" ? "Growing advantage — emphasize momentum" : "Innovation/speed — emphasize agility";
  }

  // Check for Gen Z adaptation (WP-52-55)
  const isGenZ = /gen[\s_-]?z|18[\s-]?24|teen|young\s*adult/i.test(audience);
  const platforms = (brief.match(/tiktok|instagram|linkedin|twitter|x\b|facebook|youtube/gi) || []);
  const genZ = isGenZ ? {
    primary_discovery: platforms.some(p => /tiktok/i.test(p)) ? "TikTok (41% use social as primary search)" : "Social-first",
    content_strategy: "UGC 10x more effective than polished ads",
    hook_model: "Trigger → Action → Variable Reward → Investment",
  } : null;

  if (!apiKey) {
    const m = scoreMoat({ switchingCosts: 2, intangibleAssets: 3, networkEffects: 2, costAdvantage: 2, efficientScale: 2 });
    return {
      success: true, durationMs: Date.now() - start,
      data: {
        version: KNP_VERSION, submind: "product", status: "success",
        moat: { ...m }, positioning: `${product || "Product"} positioned for ${audience || "target audience"}`,
        messagingAngle: moatMsg(m.rating), differentiators: ["Unique value proposition"],
        painPointMap: {}, guardrails: [{ claim: "Generic", evidence: "Needs validation", risk_level: "caution" }],
        genZAdaptation: genZ, competitiveIntensity: 3.0, competitivePosture: "balanced", confidence: 0.4,
      },
    };
  }

  try {
    const prompt = `Analyze this product for competitive positioning.
Product: ${product || "Not specified"}
Brief: ${brief}
Audience: ${audience || "General"}
Research: ${researchRaw ? JSON.stringify(researchRaw).slice(0, 800) : "None"}
Client: ${clientBrain ? JSON.stringify(clientBrain).slice(0, 500) : "None"}

Return ONLY valid JSON:
{"moat":{"switchingCosts":<1-5>,"intangibleAssets":<1-5>,"networkEffects":<1-5>,"costAdvantage":<1-5>,"efficientScale":<1-5>},"porterScore":<1.0-5.0>,"differentiators":["..."],"painPointMap":{"pain":"capability"},"positioning":"1-2 sentences","guardrails":[{"claim":"...","evidence":"...","risk_level":"safe|caution|blocked"}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Product strategist. Morningstar 5-Source Moat + Porter's 5 Forces. Return ONLY valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3, max_tokens: 2000,
      }),
    });

    if (!res.ok) throw new Error(`AI gateway ${res.status}`);
    const aiData = await res.json();
    const text = (aiData.choices?.[0]?.message?.content ?? "").replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);
    const moat = scoreMoat(parsed.moat);
    const porter = parsed.porterScore ?? 3.0;

    return {
      success: true, durationMs: Date.now() - start,
      data: {
        version: KNP_VERSION, submind: "product", status: "success",
        moat: { ...parsed.moat, ...moat },
        positioning: parsed.positioning || "",
        messagingAngle: moatMsg(moat.rating),
        differentiators: parsed.differentiators || [],
        painPointMap: parsed.painPointMap || {},
        guardrails: (parsed.guardrails || []).map((g: any) => ({
          claim: g.claim || "", evidence: g.evidence || "",
          risk_level: ["safe", "caution", "blocked"].includes(g.risk_level) ? g.risk_level : "caution",
        })),
        genZAdaptation: genZ,
        competitiveIntensity: porter,
        competitivePosture: porter >= 4.0 ? "aggressive" : porter >= 2.5 ? "balanced" : "brand-building",
        confidence: moat.composite >= 3.0 ? 0.85 : moat.composite >= 2.0 ? 0.7 : 0.55,
      },
    };
  } catch (e) {
    console.error("Product submind error:", e);
    const m = scoreMoat({ switchingCosts: 2, intangibleAssets: 3, networkEffects: 2, costAdvantage: 2, efficientScale: 2 });
    return {
      success: true, durationMs: Date.now() - start,
      data: {
        version: KNP_VERSION, submind: "product", status: "success",
        moat: { ...m }, positioning: `${product || "Product"} positioned for ${audience || "target audience"}`,
        messagingAngle: moatMsg(m.rating), differentiators: ["Value proposition"], painPointMap: {},
        guardrails: [{ claim: "Fallback", evidence: "AI unavailable", risk_level: "caution" }],
        genZAdaptation: genZ, competitiveIntensity: 3.0, competitivePosture: "balanced", confidence: 0.3,
        error: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

async function dispatchSubmind(
  submindName: SubmindName,
  knpPayload: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ success: boolean; data: unknown; error?: string; durationMs: number }> {
  const start = Date.now();

  // Inline product submind
  if (submindName === "product") {
    return runProductInline(knpPayload);
  }

  // v1.1 stub: Viral only (analytics + learning-engine are now live edge functions)
  if (submindName === "viral") {
    return {
      success: true,
      durationMs: Date.now() - start,
      data: {
        version: KNP_VERSION, submind: "viral", status: "stub",
        viral_score: 0.65,
        components: { engagement: 0.7, velocity: 0.6, novelty: 0.7, dwell: 0.6, community_spread: 0.5, emotional_energy: 0.7 },
        recommendation: "MONITOR",
        note: "Viral scoring is in preview. Full VS formula (0.25·E + 0.25·V + 0.20·N + 0.15·D + 0.10·CS + 0.05·EE) available in v1.1.",
        stub: true,
      },
    };
  }

  // Real submind dispatch via edge function invocation
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const url = `${supabaseUrl}/functions/v1/${submindName}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
      body: JSON.stringify(knpPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      return {
        success: false,
        durationMs: Date.now() - start,
        data: null,
        error: `${submindName} returned ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    return { success: true, durationMs: Date.now() - start, data };
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      durationMs: Date.now() - start,
      data: null,
      error: msg.includes("abort") ? `${submindName} timed out (60s)` : msg,
    };
  }
}

// ── Session Management ──

async function getOrCreateSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string | undefined,
  userId: string,
  clientId: string,
): Promise<{ id: string; mode: OrchestratorMode; context: Record<string, unknown>; subminds_called: string[] }> {
  if (sessionId) {
    const { data } = await supabase
      .from("orchestrator_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (data) {
      await supabase.from("orchestrator_sessions").update({ last_active: new Date().toISOString() }).eq("session_id", data.session_id);
      return {
        id: data.session_id,
        mode: (data.mode as OrchestratorMode) || "guided",
        context: (data.context as Record<string, unknown>) || {},
        subminds_called: (data.subminds_called as string[]) || [],
      };
    }
  }

  const { data, error } = await supabase
    .from("orchestrator_sessions")
    .insert({
      user_id: userId,
      client_id: clientId,
      mode: "guided",
      context: {},
      subminds_called: [],
      status: "active",
    })
    .select("session_id")
    .single();

  if (error) {
    console.error("Session create error:", error);
    return { id: crypto.randomUUID(), mode: "guided", context: {}, subminds_called: [] };
  }

  return { id: data.session_id, mode: "guided", context: {}, subminds_called: [] };
}

async function updateSessionContext(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  context: Record<string, unknown>,
  submindsCalled: string[],
  mode?: OrchestratorMode,
) {
  const updates: Record<string, unknown> = {
    last_active: new Date().toISOString(),
    context,
    subminds_called: submindsCalled,
  };
  if (mode) updates.mode = mode;
  await supabase.from("orchestrator_sessions").update(updates).eq("session_id", sessionId);
}

// ── Client Brain Resolution ──

async function resolveFromClientBrain(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("client_brain")
    .select("brand_voice, audience_segments, moat_profile, competitor_list, industry, market_sophistication")
    .eq("client_id", clientId)
    .single();

  return data || null;
}

// ── Solo Mode Logging ──

async function logSoloModeEntry(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  clientId: string,
  scope: string,
  decisionChain: unknown[],
  submindsInvoked: string[],
  outcome: unknown,
) {
  await supabase.from("solo_mode_logs").insert({
    session_id: sessionId,
    client_id: clientId,
    permission_granted_at: new Date().toISOString(),
    permission_scope: scope,
    decision_chain: decisionChain,
    subminds_invoked: submindsInvoked,
    outcome,
  }).then(({ error }) => {
    if (error) console.warn("Solo mode log insert failed:", error.message);
  });
}

// ── Response Assembly ──

function assembleReply(
  intent: DetectedIntent,
  results: Record<string, { success: boolean; data: unknown; error?: string }>,
  mode: OrchestratorMode,
): string {
  const sections: string[] = [];

  if (mode === "solo") {
    sections.push("🤖 **Solo Mode** — I made all decisions autonomously. Here's what I did:\n");
  }

  for (const [submind, result] of Object.entries(results)) {
    if (!result.success) {
      sections.push(`⚠️ **${formatSubmindName(submind)}**: encountered an issue — ${result.error || "unknown error"}`);
      continue;
    }

    const r = result.data as Record<string, unknown> | null;
    if (!r) continue;

    // For stubs, use the note field
    if (r.status === "stub") {
      sections.push(`ℹ️ **${formatSubmindName(submind)}**: ${r.note || "Stub response"}`);
      continue;
    }

    // Pull primary output
    const output =
      r[KNP.ρr] || r[KNP.χy] || r[KNP.ηn] || r[KNP.ψv] ||
      r[KNP.φd] || r[KNP.ωs] || r[KNP.δi] || r[KNP.εe] ||
      r[KNP.αa] || r.summary || r.data || r.result || "Complete.";

    const outputStr = typeof output === "string" ? output : JSON.stringify(output).slice(0, 500);
    sections.push(`**${formatSubmindName(submind)}**: ${outputStr}`);
  }

  if (sections.length === 0) {
    return "I processed your request but didn't receive results from the subminds. Could you provide more details so I can try again?";
  }

  if (mode === "solo") {
    sections.push("\n📋 *Full decision chain logged in solo mode audit trail.*");
  }

  return sections.join("\n\n");
}

function formatSubmindName(name: string): string {
  const names: Record<string, string> = {
    research: "🔍 Research", product: "📦 Product", narrative: "✍️ Narrative",
    creative: "🎨 Creative", social: "📱 Social", image: "🖼️ Image",
    approval: "✅ Approval", viral: "🔥 Viral Score", analytics: "📊 Analytics",
    "learning-engine": "🧠 Learning Engine",
  };
  return names[name] || name;
}

// ── Next Questions Builder ──

function buildNextQuestions(intent: DetectedIntent): NextQuestion[] {
  switch (intent) {
    case "campaign_new":
      return [
        { field: "s0", question: "Instagram Reels with a humor hook targeting your core audience", type: "button", nav_target: "/campaigns/new" },
        { field: "s1", question: "LinkedIn carousel with data-driven storytelling for B2B reach", type: "button", nav_target: "/campaigns/new" },
        { field: "s2", question: "Multi-platform blitz — simultaneous launch across all channels", type: "button", nav_target: "/campaigns/new" },
        { field: "s3", question: "Something else...", type: "fill_in" },
      ];
    case "trend_analysis":
      return [
        { field: "s0", question: "Show me trending topics in my industry this week", type: "button" },
        { field: "s1", question: "What are competitors doing differently right now?", type: "button", nav_target: "/competitor-analysis" },
        { field: "s2", question: "Identify emerging platforms gaining traction", type: "button" },
        { field: "s3", question: "Something else...", type: "fill_in" },
      ];
    case "performance_review":
      return [
        { field: "s0", question: "Show engagement trends for the last 30 days", type: "button", nav_target: "/analytics" },
        { field: "s1", question: "Compare performance across platforms", type: "button", nav_target: "/analytics" },
        { field: "s2", question: "Identify top-performing content themes", type: "button" },
        { field: "s3", question: "Something else...", type: "fill_in" },
      ];
    case "content_revision":
      return [
        { field: "s0", question: "Rewrite for a more conversational tone", type: "button" },
        { field: "s1", question: "Optimize for higher engagement on social", type: "button" },
        { field: "s2", question: "Create platform-specific variations", type: "button" },
        { field: "s3", question: "Something else...", type: "fill_in" },
      ];
    case "learning_report":
      return [
        { field: "s0", question: "What worked best in our last 5 campaigns?", type: "button" },
        { field: "s1", question: "Show me patterns in audience response", type: "button" },
        { field: "s2", question: "Generate a full retrospective report", type: "button" },
        { field: "s3", question: "Something else...", type: "fill_in" },
      ];
    case "general_chat":
    default:
      return [
        { field: "s0", question: "Create a new campaign", type: "button", nav_target: "/campaigns/new" },
        { field: "s1", question: "Show me analytics", type: "button", nav_target: "/analytics" },
        { field: "s2", question: "Check competitor activity", type: "button", nav_target: "/competitor-analysis" },
        { field: "s3", question: "Something else...", type: "fill_in" },
      ];
  }
}

// ── Pipeline Execution (Phase-based web topology) ──

async function executePhases(
  phases: PhaseSpec[],
  knpPayload: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string,
  mode: OrchestratorMode,
): Promise<{ results: Record<string, { success: boolean; data: unknown; error?: string }>; submindsInvoked: string[]; decisionChain: unknown[] }> {
  const results: Record<string, { success: boolean; data: unknown; error?: string }> = {};
  const submindsInvoked: string[] = [];
  const decisionChain: unknown[] = [];
  let accumulatedPayload = { ...knpPayload };

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const phaseLabel = `Phase ${phaseIdx + 1}`;

    if (phase.parallel) {
      // Concurrent dispatch
      const promises = phase.subminds.map(async (name) => {
        submindsInvoked.push(name);
        decisionChain.push({ phase: phaseLabel, submind: name, mode: "parallel", timestamp: new Date().toISOString() });
        return { name, result: await dispatchSubmind(name, accumulatedPayload, supabaseUrl, serviceRoleKey) };
      });

      const settled = await Promise.all(promises);
      for (const { name, result } of settled) {
        results[name] = result;
        // Merge successful outputs into accumulated payload
        if (result.success && result.data && typeof result.data === "object") {
          const d = result.data as Record<string, unknown>;
          for (const key of Object.values(KNP)) {
            if (d[key]) accumulatedPayload[key] = d[key];
          }
        }
      }
    } else {
      // Sequential dispatch
      for (const name of phase.subminds) {
        submindsInvoked.push(name);
        decisionChain.push({ phase: phaseLabel, submind: name, mode: "sequential", timestamp: new Date().toISOString() });

        const result = await dispatchSubmind(name, accumulatedPayload, supabaseUrl, serviceRoleKey);
        results[name] = result;

        if (result.success && result.data && typeof result.data === "object") {
          const d = result.data as Record<string, unknown>;
          for (const key of Object.values(KNP)) {
            if (d[key]) accumulatedPayload[key] = d[key];
          }
        }
      }
    }
  }

  return { results, submindsInvoked, decisionChain };
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

    // ── Health Check ──
    if (body.action === "health") {
      return jsonRes({
        status: "operational",
        version: "2.0-orchestrator",
        intents: ["campaign_new", "trend_analysis", "performance_review", "content_revision", "learning_report", "general_chat"],
        modes: ["guided", "solo"],
        subminds_live: ["research", "product", "narrative", "creative", "social", "image", "approval"],
        subminds_stub: ["viral", "analytics", "learning-engine"],
        features: [
          "web_topology_routing",
          "phase_based_dispatch",
          "knp_normalizer_membrane",
          "session_persistence",
          "solo_mode_audit",
          "guided_3plus1_format",
          "client_brain_resolution",
        ],
      });
    }

    // ── Chat Action ──
    if (body.action !== "chat") {
      return jsonRes({ error: `Unknown action: ${body.action}. Valid: chat, health` }, 400);
    }

    if (!body.message && !body.knp_payload) {
      return jsonRes({ error: "message or knp_payload required" }, 400);
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const { supabaseUrl, serviceRoleKey } = getRuntimeConfig();
    const supabaseAuth = makeAuthClient(authHeader);
    const token = authHeader.replace("Bearer ", "");

    let userId: string;
    try {
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userError || !userData?.user?.id) {
        return jsonRes({ error: "Unauthorized" }, 401);
      }
      userId = userData.user.id;
    } catch {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const supabase = makeServiceClient();
    const clientId = body.client_id || userId;
    const message = body.message || "";

    // ── Session ──
    const session = await getOrCreateSession(supabase, body.session_id, userId, clientId);

    // ── Solo Mode Grant ──
    if (body.solo_grant?.enabled) {
      session.mode = "solo";
    }

    // Check for solo trigger in message
    const lowerMsg = message.toLowerCase();
    const isSoloTrigger = (
      lowerMsg.includes("solo mode") ||
      lowerMsg.includes("do it yourself") ||
      lowerMsg.includes("make the next campaign yourself") ||
      lowerMsg.includes("handle it") ||
      lowerMsg.includes("go ahead and decide")
    );

    if (isSoloTrigger && session.mode !== "solo") {
      session.mode = "solo";
      await updateSessionContext(supabase, session.id, session.context, session.subminds_called, "solo");
      await logSoloModeEntry(supabase, session.id, clientId, "full", [{ event: "solo_activated", message, timestamp: new Date().toISOString() }], [], { activated: true });

      const soloReply = "🤖 **Solo Mode activated.** I'll handle everything autonomously and log all decisions for your review.\n\nWhat should I work on?";
      const resp: OrchestratorResponse = {
        reply: soloReply,
        intent: "general_chat",
        source: "orchestrator",
        next_questions: buildNextQuestions("general_chat"),
        requires_approval: false,
        risk_level: "low",
        session_id: session.id,
        subminds_invoked: [],
        mode: "solo",
      };
      return jsonRes(resp);
    }

    // ── Detect Intent ──
    const intent = detectIntent(message);

    // ── Normalizer: Compress inbound ──
    const knpPacket = body.knp_payload || normalizerCompress(message, session.id);

    // ── Enrich from client brain ──
    const enrichedPayload = { ...knpPacket } as Record<string, unknown>;
    try {
      const brainData = await resolveFromClientBrain(supabase, clientId);
      if (brainData) {
        if (brainData.brand_voice && !enrichedPayload[KNP.λv]) {
          enrichedPayload[KNP.λv] = compressValue(brainData.brand_voice);
        }
        if (brainData.audience_segments && !enrichedPayload[KNP.ζq]) {
          enrichedPayload[KNP.ζq] = compressValue(brainData.audience_segments);
        }
        if (brainData.competitor_list && !enrichedPayload[KNP.θc]) {
          enrichedPayload[KNP.θc] = compressValue(brainData.competitor_list);
        }
        if (brainData.industry) {
          enrichedPayload._industry = brainData.industry;
        }
      }
    } catch (e) {
      console.warn("Client brain lookup failed:", e);
    }

    // ── Route based on intent ──
    const phases = getIntentPhases(intent);

    // No subminds needed — general chat
    if (phases.length === 0) {
      const reply =
        "I'm KLYC, your AI marketing orchestrator. I coordinate specialized subminds to help you with:\n\n" +
        "• **Campaign creation** — full pipeline from research to approval\n" +
        "• **Trend analysis** — market signals and competitor insights\n" +
        "• **Performance review** — campaign metrics and learnings\n" +
        "• **Content revision** — optimize and refine existing content\n" +
        "• **Learning reports** — retrospective analysis of what worked\n\n" +
        "What would you like to work on?";

      const resp: OrchestratorResponse = {
        reply,
        intent,
        source: "orchestrator",
        next_questions: buildNextQuestions(intent),
        requires_approval: false,
        risk_level: "low",
        session_id: session.id,
        subminds_invoked: [],
        mode: session.mode,
      };

      await updateSessionContext(supabase, session.id, { ...session.context, last_intent: intent, last_message: message }, session.subminds_called, session.mode);
      return jsonRes(resp);
    }

    // ── Execute phases ──
    const { results, submindsInvoked, decisionChain } = await executePhases(
      phases, enrichedPayload, supabaseUrl, serviceRoleKey, session.mode,
    );

    // ── Assemble reply ──
    const reply = assembleReply(intent, results, session.mode);

    // ── Update session ──
    const allSubminds = [...new Set([...session.subminds_called, ...submindsInvoked])];
    await updateSessionContext(supabase, session.id, {
      ...session.context,
      last_intent: intent,
      last_message: message,
      last_subminds: submindsInvoked,
    }, allSubminds, session.mode);

    // ── Solo mode logging ──
    if (session.mode === "solo") {
      await logSoloModeEntry(supabase, session.id, clientId, "full", decisionChain, submindsInvoked, { reply: reply.slice(0, 500), results_summary: Object.keys(results) });
    }

    // ── Post-pipeline hooks ──
    if (intent === "campaign_new") {
      try {
        await supabase.from("campaign_memory").insert({
          user_id: userId,
          client_id: clientId,
          campaign_name: message.slice(0, 100),
          platform: String(enrichedPayload[KNP.πf] || "multi"),
          message_summary: message.slice(0, 200),
          subminds_used: submindsInvoked,
        });
      } catch (e) {
        console.warn("Campaign memory insert failed:", e);
      }
    }

    // ── Check if approval gate requires human decision ──
    const approvalResult = results["approval"];
    const requiresApproval = approvalResult?.success && (approvalResult.data as Record<string, unknown>)?.decision === "NEEDS_HUMAN";

    const resp: OrchestratorResponse = {
      reply,
      intent,
      source: "orchestrator",
      next_questions: buildNextQuestions(intent),
      requires_approval: Boolean(requiresApproval),
      risk_level: intent === "campaign_new" ? "medium" : "low",
      session_id: session.id,
      subminds_invoked: submindsInvoked,
      mode: session.mode,
    };

    return jsonRes(resp);

  } catch (err) {
    console.error("Orchestrator error:", err);
    // NEVER return empty — always return a valid response
    const fallbackReply = "I encountered an issue processing your request. Could you try again or rephrase? I'm here to help with campaigns, analytics, competitor insights, and more.";
    return jsonRes({
      reply: fallbackReply,
      intent: "general_chat",
      source: "orchestrator",
      next_questions: buildNextQuestions("general_chat"),
      requires_approval: false,
      risk_level: "low",
      session_id: "",
      subminds_invoked: [],
      error_detail: err instanceof Error ? err.message : "Internal error",
    }, 500);
  }
});
