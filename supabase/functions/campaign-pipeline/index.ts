import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Lane Lock ─────────────────────────────────────────────────────────────────
const PIPELINE_VERSION = "v7";
const PERMITTED_LANES = new Set(["research", "strategy", "performance"]);

// ── Slot encoding dictionaries ────────────────────────────────────────────────
const KNP_STYLE_CODES: Record<string, string> = {
  "IMG:001": "photorealistic lifestyle photography, authentic, UGC-style",
  "IMG:002": "photorealistic lifestyle photography, no text, no words, no typography, no overlays",
  "IMG:003": "cinematic, high contrast, Gen Z aesthetic",
  "TONE:001": "authentic, conversational, Gen Z",
  "TONE:002": "professional, authoritative, B2B",
  "TONE:003": "playful, energetic, consumer brand",
};

const KNP_PLATFORM_CODES: Record<string, string> = {
  "ALL6": "tiktok,instagram,linkedin,youtube,twitter,facebook",
  "SOCIAL3": "tiktok,instagram,twitter",
  "B2B2": "linkedin,youtube",
};

function decodeKnpSlot(value: string, dict: Record<string, string>): string {
  return dict[value] || value;
}

// ── KNP envelope helper ───────────────────────────────────────────────────────
function knpEnvelope(sigmaO: unknown, elapsedMs: number, lane: string, confidence = 0.92): Record<string, unknown> {
  return {
    "σo": sigmaO,
    "δi": lane,
    "κw": confidence,
    "τt": new Date().toISOString(),
    "ρs": `campaign-pipeline∷${PIPELINE_VERSION}∷${lane}`,
    "knp": "Ψ3",
    "elapsed_ms": elapsedMs,
  };
}

// ── System prompts per lane ───────────────────────────────────────────────────
const LANE_PROMPTS: Record<string, string> = {
  research: `You are a market research and audience analysis specialist. Your ONLY output is research findings — never strategy, copy, or creative content.

Analyze the campaign brief and return structured JSON only:
{
  "market_context": "concise market landscape summary",
  "target_audience": {
    "primary_segment": "...",
    "secondary_segment": "...",
    "psychographic_profile": "..."
  },
  "competitive_landscape": "key competitor positioning",
  "key_opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"],
  "recommended_messaging_angles": ["angle 1", "angle 2", "angle 3"]
}

Return ONLY the JSON object. No preamble. No explanation.`,

  strategy: `You are a campaign strategist. Your ONLY output is campaign strategy — never research reports, copy, or performance scoring.

Using the campaign brief and any research context provided, return structured JSON only:
{
  "campaign_concept": "the big idea in one sentence",
  "core_message": "what we want the audience to think/feel/do",
  "messaging_framework": {
    "headline": "primary headline",
    "sub_headline": "supporting message",
    "proof_points": ["point 1", "point 2", "point 3"]
  },
  "content_pillars": ["pillar 1", "pillar 2", "pillar 3"],
  "campaign_arc": "how the narrative unfolds over the campaign duration",
  "tactical_recommendations": ["tactic 1", "tactic 2", "tactic 3"]
}

Return ONLY the JSON object. No preamble. No explanation.`,

  performance: `You are a campaign performance analyst. Your ONLY output is performance scoring and optimization recommendations — never research, strategy, or copy.

Using the campaign brief, research context, and strategy provided, return structured JSON only:
{
  "performance_score": 0-100,
  "score_rationale": "brief explanation of the score",
  "predicted_ctr_range": "e.g. 1.2-2.4%",
  "predicted_reach_multiplier": 1.0,
  "budget_efficiency_rating": "low|medium|high|excellent",
  "risk_factors": [
    { "risk": "description", "severity": "low|medium|high", "mitigation": "what to do" }
  ],
  "optimization_recommendations": ["rec 1", "rec 2", "rec 3"],
  "platform_performance_outlook": {
    "platform_name": "strong|moderate|weak"
  }
}

Return ONLY the JSON object. No preamble. No explanation.`,
};

// ── RAG query ─────────────────────────────────────────────────────────────────
async function queryRag(
  query: string,
  lane: string,
  supabaseUrl: string,
  limit = 3,
): Promise<string[]> {
  if (!query || !supabaseUrl) return [];
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/knowledge-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lane, limit, threshold: 0.35 }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return ((data.chunks || []) as Array<{ content: string }>)
      .map((c) => c.content)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildSystemWithRag(basePrompt: string, ragChunks: string[]): string {
  if (!ragChunks.length) return basePrompt;
  const ragBlock = ragChunks.join("\n---\n");
  return `${basePrompt}\n\n=== PLATFORM & KNOWLEDGE CONTEXT ===\nUse the following verified knowledge to inform your response. Do not quote it verbatim; synthesize it.\n\n${ragBlock}\n=== END KNOWLEDGE CONTEXT ===`;
}

// ── Health log ────────────────────────────────────────────────────────────────
async function logHealth(
  laneId: string, success: boolean, latencyMs: number,
  tokensIn: number | null = null, tokensOut: number | null = null,
): Promise<void> {
  try {
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await _sb.from("submind_health_snapshots").insert({
      submind_id: `campaign-pipeline-${laneId}`,
      invocation_count: 1, success_count: success ? 1 : 0, error_count: success ? 0 : 1,
      avg_latency_ms: latencyMs, avg_tokens_in: tokensIn,
      avg_tokens_out: tokensOut, window_start: new Date().toISOString(),
    });
  } catch (_) { /* non-blocking */ }
}

// ── Claude call ───────────────────────────────────────────────────────────────
async function callClaude(system: string, userContent: string): Promise<{
  text: string; tokensIn: number | null; tokensOut: number | null;
}> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 2048,
      system, messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const data = await response.json();
  return {
    text: data.content?.[0]?.text || "{}",
    tokensIn: data.usage?.input_tokens ?? null,
    tokensOut: data.usage?.output_tokens ?? null,
  };
}

// ── Peer call ─────────────────────────────────────────────────────────────────
async function callPeer(
  targetLane: string,
  originalBody: Record<string, any>,
  supabaseUrl: string,
  peerRegistry: Record<string, { fn: string }>,
): Promise<Record<string, any> | null> {
  const fn = peerRegistry[targetLane]?.fn || "campaign-pipeline";
  const url = `${supabaseUrl}/functions/v1/${fn}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...originalBody,
        lane: targetLane,
        _peer_call: true,
        peer_registry: peerRegistry,
        supabase_url: supabaseUrl,
      }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startTime = Date.now();

  try {
    const body = await req.json();

    // ── Health ────────────────────────────────────────────────────────────────
    if (body.action === "health") {
      return new Response(JSON.stringify({
        status: "ok", agent: "campaign-pipeline", version: PIPELINE_VERSION,
        permitted_lanes: [...PERMITTED_LANES], rag_enabled: true,
        "δi": "campaign-pipeline", timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Lane check ────────────────────────────────────────────────────────────
    const lane = (body.lane as string || "").toLowerCase();
    if (!lane || !PERMITTED_LANES.has(lane)) {
      return new Response(JSON.stringify({
        error: `Lane required. Permitted: [${[...PERMITTED_LANES].join(", ")}]. Got: "${lane}"`,
        permitted_lanes: [...PERMITTED_LANES],
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const AGENT_ID = lane; // functional identifier = lane name
    const isPeerCall = body._peer_call === true;
    const supabaseUrl = body.supabase_url || Deno.env.get("SUPABASE_URL") || "";
    const peerRegistry: Record<string, { fn: string }> = body.peer_registry || {
      research: { fn: "campaign-pipeline" },
      strategy: { fn: "campaign-pipeline" },
      performance: { fn: "campaign-pipeline" },
      copy: { fn: "social" },
      image: { fn: "generate-image" },
    };

    // ── Decode slot codes ─────────────────────────────────────────────────────
    let platforms = body["μp"] || body.platforms || "";
    if (platforms) {
      platforms = decodeKnpSlot(platforms, KNP_PLATFORM_CODES);
    }

    // ── Build brief from KNP envelope ─────────────────────────────────────────
    const brief = body["ξb"] || body.brief || body.knp_envelope?.["ξb"] || "";
    const client = body["θc"] || body.client || "";
    const useContext = body["ζq"] || body.use_context || "";

    const campaignSummary = [
      brief ? `Campaign brief: ${brief}` : "",
      client ? `Client context: ${client}` : "",
      platforms ? `Target platforms: ${platforms}` : "",
      useContext ? `Use context: ${useContext}` : "",
    ].filter(Boolean).join("\n");

    // ── RAG lookup (before peer calls — each submind fetches its own slice) ───
    const ragQuery = brief || campaignSummary || "campaign best practices";
    const ragChunks = await queryRag(ragQuery, lane, supabaseUrl);
    const systemPrompt = buildSystemWithRag(LANE_PROMPTS[lane], ragChunks);

    // ── Peer consultation ─────────────────────────────────────────────────────
    let peerContext: Record<string, string> = {};
    const peersConsulted: string[] = [];

    if (!isPeerCall) {
      if (lane === "strategy") {
        const researchResult = await callPeer("research", body, supabaseUrl, peerRegistry);
        if (researchResult) {
          const sigmaO = researchResult["σo"] || researchResult.output;
          peerContext.research = typeof sigmaO === "string"
            ? sigmaO : JSON.stringify(sigmaO);
          peersConsulted.push("research");
        }
      }

      if (lane === "performance") {
        const [researchResult, strategyResult] = await Promise.all([
          callPeer("research", body, supabaseUrl, peerRegistry),
          callPeer("strategy", body, supabaseUrl, peerRegistry),
        ]);
        if (researchResult) {
          const sigmaO = researchResult["σo"] || researchResult.output;
          peerContext.research = typeof sigmaO === "string"
            ? sigmaO : JSON.stringify(sigmaO);
          peersConsulted.push("research");
        }
        if (strategyResult) {
          const sigmaO = strategyResult["σo"] || strategyResult.output;
          peerContext.strategy = typeof sigmaO === "string"
            ? sigmaO : JSON.stringify(sigmaO);
          peersConsulted.push("strategy");
        }
      }
    }

    // ── Build user prompt ─────────────────────────────────────────────────────
    const peerSection = Object.entries(peerContext)
      .map(([k, v]) => `=== ${k.toUpperCase()} INPUT ===\n${v}`)
      .join("\n\n");

    const userPrompt = [
      `=== CAMPAIGN BRIEF ===`,
      campaignSummary || "No brief provided — use general best practices.",
      peerSection ? `\n${peerSection}` : "",
    ].join("\n");

    // ── AI call ───────────────────────────────────────────────────────────────
    const { text, tokensIn, tokensOut } = await callClaude(systemPrompt, userPrompt);

    // Parse output — try JSON first, fall back to raw text
    let parsedOutput: unknown;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsedOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch {
      parsedOutput = text;
    }

    const elapsed = Date.now() - startTime;
    await logHealth(AGENT_ID, true, elapsed, tokensIn, tokensOut);

    // ── Wrap in KNP σo envelope ──────────────────────────────────────────────
    const outputEnvelope = knpEnvelope(parsedOutput, elapsed, lane);

    return new Response(JSON.stringify(outputEnvelope), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error("campaign-pipeline error:", error);
    return new Response(JSON.stringify({
      error: (error as Error).message || "Unknown error", elapsed_ms: elapsed,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
