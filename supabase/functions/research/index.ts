// ============================================================
// RESEARCH — Market Intelligence Engine v2.1
// Speaks ONLY KNP. Never communicates directly with users.
// All output returns to the Orchestrator.
//
// Decision Tree: Signal Classification → Opportunity Scoring →
//   Entity Extraction → Routing Decision
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Protocol Constants ──
const KNP_VERSION = "Ψ3";
const KNP_NULL = "∅";

const K = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw",
  πf: "πf", σo: "σo", ρr: "ρr", χc: "χc", ψv: "ψv",
} as const;

function knpChecksum(seg: Record<string, string>): string {
  let h = 0;
  const s = Object.entries(seg).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "Ψ" + Math.abs(h).toString(36);
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

// ── AI Client (Anthropic) ──

async function callAI(system: string, user: string): Promise<{ text: string; tokensIn: number | null; tokensOut: number | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { text: "Research unavailable — API key missing.", tokensIn: null, tokensOut: null };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) { console.error("AI error:", res.status); return { text: "Research analysis error.", tokensIn: null, tokensOut: null }; }
    const d = await res.json();
    return {
      text: d.content?.[0]?.text || "No output.",
      tokensIn: d.usage?.input_tokens ?? null,
      tokensOut: d.usage?.output_tokens ?? null,
    };
  } catch (e) {
    console.error("AI exception:", e);
    return { text: "Research exception.", tokensIn: null, tokensOut: null };
  }
}

// ── Data Gathering ──

async function getCompetitorObs(sb: ReturnType<typeof createClient>, clientId: string) {
  if (!clientId || clientId === KNP_NULL) return [];
  const { data } = await sb.from("competitor_observations").select("*")
    .eq("client_id", clientId).order("observed_at", { ascending: false }).limit(20);
  return data || [];
}

async function getCampaignMemory(sb: ReturnType<typeof createClient>, clientId: string, platform?: string) {
  let q = sb.from("campaign_memory").select("*").order("viral_score", { ascending: false }).limit(15);
  if (clientId && clientId !== KNP_NULL) q = q.eq("client_id", clientId);
  if (platform && platform !== KNP_NULL) q = q.eq("platform", platform);
  const { data } = await q;
  return data || [];
}

async function getClientBrain(sb: ReturnType<typeof createClient>, clientId: string) {
  if (!clientId || clientId === KNP_NULL) return null;
  const { data } = await sb.from("client_brain").select("brand_voice, audience_segments, moat_profile, competitor_list, industry, market_sophistication")
    .eq("client_id", clientId).maybeSingle();
  return data;
}

async function getClientProfile(sb: ReturnType<typeof createClient>, clientId: string) {
  if (!clientId || clientId === KNP_NULL) return null;
  const { data } = await sb.from("client_profiles").select("business_name, industry, target_audience, marketing_goals, main_competitors")
    .eq("id", clientId).maybeSingle();
  return data;
}

async function getSocialTrends(sb: ReturnType<typeof createClient>, platform?: string) {
  let q = sb.from("social_trends").select("*").order("scraped_at", { ascending: false }).limit(10);
  if (platform && platform !== KNP_NULL) q = q.eq("platform", platform);
  const { data } = await q;
  return data || [];
}

// ── Opportunity Scoring ──

interface OpportunityFactors {
  relevance: number;
  freshness: number;
  multiSource: number;
  audienceAlignment: number;
  competitiveGap: number;
}

function computeOpportunityScore(f: OpportunityFactors): number {
  return 0.25 * f.relevance + 0.15 * f.freshness + 0.20 * f.multiSource +
         0.25 * f.audienceAlignment + 0.15 * f.competitiveGap;
}

// ── Signal Classification ──

type SignalType = "social_spike" | "competitor_activity" | "sentiment_shift" | "format_emergence" | "general";

function classifySignals(brief: string, competitors: unknown[], trends: unknown[]): SignalType {
  const lower = brief.toLowerCase();
  if (competitors.length > 3) return "competitor_activity";
  if (lower.match(/spike|surge|viral|blow up|explod/)) return "social_spike";
  if (lower.match(/sentiment|attitude|backlash|perception/)) return "sentiment_shift";
  if (lower.match(/reels|shorts|carousel|format|thread|story/)) return "format_emergence";
  if (trends.length > 5) return "social_spike";
  return "general";
}

// ── Routing Decision ──

function buildRoutingRecommendation(
  signalType: SignalType,
  opportunityScore: number,
  hasCompetitorData: boolean,
): string[] {
  const recs: string[] = [];
  if (opportunityScore >= 0.7) recs.push("ALERT:orchestrator — high opportunity detected");
  if (signalType === "competitor_activity" || hasCompetitorData) recs.push("ACTIVATE:product — moat analysis needed");
  if (signalType === "social_spike" || signalType === "format_emergence") recs.push("ACTIVATE:creative — format opportunity");
  recs.push("ACTIVATE:narrative — story angles available");
  if (signalType === "social_spike") recs.push("ACTIVATE:viral — preliminary VS data ready");
  return recs;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);
    const body = await req.json();

    if (body.action === "health") {
      return jsonRes({
        version: "2.1-knp", submind: "research", status: "operational",
        features: ["signal_classification", "opportunity_scoring", "entity_extraction",
          "routing_decision", "campaign_memory", "competitor_monitoring", "client_brain_lookup",
          "social_trends", "learning_engine_feed"],
        knp_version: KNP_VERSION,
      });
    }

    // ── Parse KNP ──
    let segments: Record<string, string> = {};
    let sessionId = "";

    if (body.segments) {
      segments = body.segments;
      sessionId = body.session_id || "";
    } else if (body.version === KNP_VERSION) {
      for (const [k, v] of Object.entries(body)) {
        if (!["version", "checksum", "timestamp", "session_id", "action"].includes(k)) {
          segments[k] = String(v);
        }
      }
      sessionId = body.session_id || "";
    } else {
      return jsonRes({ error: "Invalid KNP payload. Research only speaks KNP." }, 400);
    }

    const brief = segments[K.ξb] || KNP_NULL;
    const audience = segments[K.ζq] || KNP_NULL;
    const platform = segments[K.μp] || segments[K.πf] || KNP_NULL;
    const keywords = segments[K.κw] || KNP_NULL;
    const clientId = segments[K.θc] || KNP_NULL;

    if (brief === KNP_NULL && audience === KNP_NULL) {
      const seg: Record<string, string> = {
        [K.σo]: KNP_NULL, [K.πf]: "0.0",
        [`${K.ζq}∷MISSING`]: KNP_NULL, [K.λv]: KNP_NULL,
      };
      return jsonRes({
        version: KNP_VERSION, submind: "research", status: "incomplete",
        checksum: knpChecksum(seg), timestamp: Date.now(),
        session_id: sessionId, segments: seg, elapsed_ms: Date.now() - t0,
      });
    }

    // ── Parallel data gathering ──
    const [competitors, campaigns, brain, profile, trends] = await Promise.all([
      getCompetitorObs(sb, clientId),
      getCampaignMemory(sb, clientId, platform),
      getClientBrain(sb, clientId),
      getClientProfile(sb, clientId),
      getSocialTrends(sb, platform),
    ]);

    const signalType = classifySignals(brief, competitors, trends);

    const compSummary = competitors.length > 0
      ? competitors.slice(0, 5).map((c: any) => `${c.competitor_name}: ${c.observed_action} (${c.platform}, conf:${c.confidence})`).join("; ")
      : "No competitor data.";

    const memSummary = campaigns.length > 0
      ? campaigns.slice(0, 5).map((c: any) => `"${c.campaign_name}" ${c.platform}: VS=${c.viral_score}`).join("; ")
      : "No campaign history.";

    const trendSummary = trends.length > 0
      ? trends.slice(0, 5).map((t: any) => `${t.trend_name} on ${t.platform} (rank:${t.trend_rank})`).join("; ")
      : "No trend data.";

    let brainContext = "";
    if (brain) {
      brainContext = `Industry: ${brain.industry || "?"}. Sophistication: ${brain.market_sophistication || "?"}. Competitors: ${JSON.stringify(brain.competitor_list || []).slice(0, 150)}. Voice: ${JSON.stringify(brain.brand_voice || {}).slice(0, 100)}.`;
    }

    let profileContext = "";
    if (profile) {
      profileContext = `Business: ${profile.business_name || "?"}. Industry: ${profile.industry || "?"}. Audience: ${profile.target_audience || "?"}. Goals: ${profile.marketing_goals || "?"}. Competitors: ${profile.main_competitors || "?"}`;
    }

    // ── AI Analysis ──
    const systemPrompt = `You are a market research analyst with deep expertise in signal classification, opportunity scoring, and competitive intelligence. Temperature 0.3. Be precise and data-oriented. NEVER reference internal system names, protocols, or technical identifiers in any output.

Signal type detected: ${signalType}

Output this EXACT format (no markdown, no extra text):
SIGNAL_TYPE: ${signalType}
MARKET_TRENDS:
- [trend 1]
- [trend 2]
- [trend 3]
COMPETITOR_INTEL:
- [finding 1]
- [finding 2]
AUDIENCE_INSIGHTS:
- [insight 1]
- [insight 2]
VIRAL_SIGNALS:
- [angle 1]
- [angle 2]
ENTITIES: [comma-separated: brands, products, trends, platforms mentioned]
OPPORTUNITY_FACTORS:
  relevance: [0.0-1.0]
  freshness: [0.0-1.0]
  multi_source: [0.0-1.0]
  audience_alignment: [0.0-1.0]
  competitive_gap: [0.0-1.0]
CONFIDENCE: [0.0-1.0]
VS_PRELIMINARY: hook=[0-1] emotion=[0-1] share=[0-1]
FORMAT_REC: [content format recommendation]
MOAT_FLAGS: [data points for competitive moat analysis]
RECOMMENDATION: [1 sentence next action]`;

    const userPrompt = `Brief: ${brief !== KNP_NULL ? brief : "General market analysis"}
Audience: ${audience !== KNP_NULL ? audience : "Not specified"}
Platform: ${platform !== KNP_NULL ? platform : "All"}
Keywords: ${keywords !== KNP_NULL ? keywords : "None"}
Client brain: ${brainContext || "No brain data."}
Client profile: ${profileContext || "No profile."}
Competitor observations: ${compSummary}
Campaign history: ${memSummary}
Current trends: ${trendSummary}`;

    const { text: aiResponse, tokensIn, tokensOut } = await callAI(systemPrompt, userPrompt);

    // ── Parse AI output ──
    const parseField = (pattern: RegExp, fallback: string) => {
      const m = aiResponse.match(pattern);
      return m ? m[1].trim() : fallback;
    };

    const confidence = Math.min(1, Math.max(0,
      parseFloat(parseField(/CONFIDENCE:\s*([\d.]+)/i, "0.5"))));

    const viralSignals = parseField(/VIRAL_SIGNALS?:\s*(.+?)(?=\nENTIT|\nOPPORT|\n[A-Z]{2,}:|\n*$)/is, KNP_NULL)
      .slice(0, 200);

    const entities = parseField(/ENTITIES:\s*(.+?)(?=\n[A-Z]|\n*$)/i, "").slice(0, 200);

    const factors: OpportunityFactors = {
      relevance: parseFloat(parseField(/relevance:\s*([\d.]+)/i, "0.5")),
      freshness: parseFloat(parseField(/freshness:\s*([\d.]+)/i, "0.5")),
      multiSource: parseFloat(parseField(/multi_source:\s*([\d.]+)/i, "0.3")),
      audienceAlignment: parseFloat(parseField(/audience_alignment:\s*([\d.]+)/i, "0.5")),
      competitiveGap: parseFloat(parseField(/competitive_gap:\s*([\d.]+)/i, "0.4")),
    };
    const opportunityScore = computeOpportunityScore(factors);

    const vsPrelim = parseField(/VS_PRELIMINARY:\s*(.+?)(?=\n|$)/i, "").slice(0, 100);
    const formatRec = parseField(/FORMAT_REC:\s*(.+?)(?=\n|$)/i, "").slice(0, 150);
    const moatFlags = parseField(/MOAT_FLAGS:\s*(.+?)(?=\n|$)/i, "").slice(0, 150);
    const competitorIntel = parseField(/COMPETITOR_INTEL:\s*(.+?)(?=\nAUDI|\n[A-Z]{2,}:)/is, compSummary)
      .slice(0, 300);

    const routing = buildRoutingRecommendation(signalType, opportunityScore, competitors.length > 0);

    const compressedFindings = aiResponse.trim().slice(0, 400);

    const responseSegments: Record<string, string> = {
      [K.σo]: compressedFindings,
      [K.πf]: String(confidence),
      [K.λv]: viralSignals,
      [K.ρr]: JSON.stringify({
        signal_type: signalType,
        opportunity_score: Math.round(opportunityScore * 100) / 100,
        opportunity_factors: factors,
        entities: entities.split(",").map(e => e.trim()).filter(Boolean),
        vs_preliminary: vsPrelim,
        format_recommendation: formatRec,
        moat_flags: moatFlags,
        routing_decisions: routing,
        data_sources: {
          competitors: competitors.length,
          campaigns: campaigns.length,
          trends: trends.length,
          has_brain: !!brain,
          has_profile: !!profile,
        },
      }).slice(0, 400),
      [K.χc]: competitorIntel,
    };

    if (audience === KNP_NULL) responseSegments[`${K.ζq}∷MISSING`] = KNP_NULL;

    const checksum = knpChecksum(responseSegments);

    // ── Persist to research_feed ──
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const uc = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: ud } = await uc.auth.getUser();
        if (ud?.user?.id) userId = ud.user.id;
      } catch { /* skip */ }
    }

    if (userId) {
      try {
        await sb.from("research_feed").insert({
          user_id: userId,
          client_id: clientId !== KNP_NULL ? clientId : null,
          finding_type: signalType,
          raw_data: {
            brief: brief !== KNP_NULL ? brief : null,
            platform: platform !== KNP_NULL ? platform : null,
            signal_type: signalType,
            opportunity_score: opportunityScore,
            confidence,
            competitors_found: competitors.length,
            campaigns_found: campaigns.length,
            trends_found: trends.length,
            entities,
          },
          knp_payload: JSON.stringify({ version: KNP_VERSION, checksum, segments: responseSegments }),
        });
      } catch (e) { console.warn("research_feed insert failed:", e); }
    }

    const elapsed = Date.now() - t0;
    await logHealth("research", true, elapsed, tokensIn, tokensOut);

    return jsonRes({
      version: KNP_VERSION,
      submind: "research",
      status: "complete",
      checksum,
      timestamp: Date.now(),
      session_id: sessionId,
      segments: responseSegments,
      elapsed_ms: elapsed,
      _meta: {
        signal_type: signalType,
        opportunity_score: Math.round(opportunityScore * 100) / 100,
        opportunity_alert: opportunityScore >= 0.7,
        routing: routing,
        quality: compressedFindings.length <= 15 * 4 ? "precise" : compressedFindings.length <= 20 * 4 ? "acceptable" : "verbose",
      },
    });

  } catch (error: unknown) {
    const elapsed = Date.now() - t0;
    await logHealth("research", false, elapsed, null, null);
    console.error("Research error:", error);
    return jsonRes({
      version: KNP_VERSION, submind: "research", status: "error",
      error: error instanceof Error ? error.message : "Unknown research error",
      segments: { [K.σo]: KNP_NULL, [K.πf]: "0.0", [K.λv]: KNP_NULL },
    }, 500);
  }
});
