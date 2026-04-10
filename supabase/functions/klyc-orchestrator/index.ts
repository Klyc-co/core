import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Orchestrator identity ─────────────────────────────────────────────────────
const ORCHESTRATOR_VERSION = "v3";

// ── Agent registry — keyed by lane (functional IDs, no names) ────────────────
const AGENT_REGISTRY: Record<string, { fn: string; lane: string }> = {
  research:    { fn: "campaign-pipeline", lane: "research" },
  strategy:    { fn: "campaign-pipeline", lane: "strategy" },
  copy:        { fn: "social",            lane: "copy" },
  image:       { fn: "generate-image",    lane: "image" },
  performance: { fn: "campaign-pipeline", lane: "performance" },
};

// Peer registry passed to each agent for self-coordinated peer calls
const PEER_REGISTRY: Record<string, { fn: string }> = Object.fromEntries(
  Object.entries(AGENT_REGISTRY).map(([lane, cfg]) => [lane, { fn: cfg.fn }])
);

// ── Sequence resolution ───────────────────────────────────────────────────────
function resolveSequence(intent: string, flags: string, hasPlatforms: boolean): string[] {
  // Full campaign pipeline
  const base = ["research", "strategy", "copy", "performance"];
  if (hasPlatforms) {
    // Insert image generation before performance
    base.splice(base.indexOf("performance"), 0, "image");
  }
  return base;
}

// ── Dispatch one agent ────────────────────────────────────────────────────────
async function dispatchAgent(
  lane: string,
  envelope: Record<string, any>,
  supabaseUrl: string,
): Promise<{ lane: string; result: Record<string, any> | null; error: string | null }> {
  const cfg = AGENT_REGISTRY[lane];
  if (!cfg) return { lane, result: null, error: `Unknown lane: ${lane}` };

  const url = `${supabaseUrl}/functions/v1/${cfg.fn}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...envelope,
        lane: cfg.lane,
        peer_registry: PEER_REGISTRY,
        supabase_url: supabaseUrl,
        _peer_call: false,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown");
      return { lane, result: null, error: `HTTP ${resp.status}: ${errText.slice(0, 200)}` };
    }

    const result = await resp.json();
    return { lane, result, error: null };
  } catch (e: any) {
    return { lane, result: null, error: e.message || "Dispatch failed" };
  }
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
        status: "ok",
        version: ORCHESTRATOR_VERSION,
        agent_registry: Object.keys(AGENT_REGISTRY),
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    // ── Accept KNP envelope (from normalize-input) or raw brief ───────────────
    const envelope: Record<string, any> = body.knp_envelope || body;
    const meta: Record<string, any> = body.meta || {};

    // Extract signals for sequence resolution
    const intent = meta.intent || envelope.intent || "campaign_complete";
    const flags = envelope["πf"] || envelope.flags || "";
    const platforms = envelope["μp"] || envelope.platforms || meta.platforms || "";
    const hasPlatforms = Boolean(platforms) && platforms !== "∅";

    // ── Stamp λv (routing verdict) ────────────────────────────────────────────
    const sequence = resolveSequence(intent, flags, hasPlatforms);
    const lambdaV = sequence.join("⊕");

    // Enrich envelope with orchestrator stamp
    const stampedEnvelope = {
      ...envelope,
      "λv": lambdaV,
    };

    // ── Concurrent dispatch ───────────────────────────────────────────────────
    const dispatches = sequence.map(lane =>
      dispatchAgent(lane, stampedEnvelope, supabaseUrl)
    );

    const settled = await Promise.allSettled(dispatches);

    // ── Collect final products ────────────────────────────────────────────────
    const final_products: Record<string, any> = {};
    const errors: Record<string, string> = {};

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const { lane, result: agentResult, error } = result.value;
        if (error) {
          errors[lane] = error;
        } else if (agentResult) {
          final_products[lane] = agentResult;
        }
      } else {
        errors[`unknown_${Math.random().toString(36).slice(2)}`] = result.reason?.message || "Promise rejected";
      }
    }

    const elapsed = Date.now() - startTime;

    return new Response(JSON.stringify({
      version: ORCHESTRATOR_VERSION,
      "λv": lambdaV,
      sequence,
      final_products,
      agents_succeeded: Object.keys(final_products).length,
      agents_failed: Object.keys(errors).length,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      elapsed_ms: elapsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Orchestrator error:", error);
    return new Response(JSON.stringify({
      error: error.message || "Orchestrator failed",
      elapsed_ms: Date.now() - startTime,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
