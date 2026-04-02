// ============================================================
// KLYC RESEARCH SUBMIND — Market Intelligence Engine
// Speaks ONLY KNP. Never communicates directly with users.
// All output returns to the Orchestrator.
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
const KNP_NULL_MARKER = "∅";
const KNP_VALUE_JOINER = "⊕";

const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw", πf: "πf", σo: "σo",
  ρr: "ρr", φd: "φd", ηn: "ηn", ωs: "ωs", δi: "δi", εe: "εe", αa: "αa", χy: "χy", ψv: "ψv",
} as const;

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return "Ψ" + Math.abs(h).toString(36);
}

function compressValue(val: string, maxLen = 250): string {
  return val.trim().slice(0, maxLen);
}

// ---- AI Client (Lovable Gateway) ----

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not set");
    return "Research analysis unavailable — API key missing.";
  }

  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI call failed:", response.status, await response.text());
      return "Research analysis returned an error.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No research output generated.";
  } catch (e) {
    console.error("AI call exception:", e);
    return "Research analysis exception occurred.";
  }
}

// ---- Data Gathering ----

async function queryCompetitorObservations(
  supabase: ReturnType<typeof createClient>,
  clientId: string
): Promise<Record<string, unknown>[]> {
  if (!clientId || clientId === KNP_NULL_MARKER) return [];
  const { data } = await supabase
    .from("competitor_observations")
    .select("*")
    .eq("client_id", clientId)
    .order("observed_at", { ascending: false })
    .limit(20);
  return data || [];
}

async function queryCampaignMemory(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  platform?: string,
  industry?: string
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("campaign_memory")
    .select("*")
    .order("viral_score", { ascending: false })
    .limit(15);

  if (clientId && clientId !== KNP_NULL_MARKER) {
    query = query.eq("client_id", clientId);
  }
  if (platform && platform !== KNP_NULL_MARKER) {
    query = query.eq("platform", platform);
  }

  const { data } = await query;
  return data || [];
}

async function insertResearchFeed(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  clientId: string | null,
  campaignId: string | null,
  findingType: string,
  rawData: Record<string, unknown>,
  knpPayload: string
): Promise<void> {
  try {
    await supabase.from("research_feed").insert({
      user_id: userId,
      client_id: clientId || null,
      campaign_id: campaignId || null,
      finding_type: findingType,
      raw_data: rawData,
      knp_payload: knpPayload,
    });
  } catch (e) {
    console.warn("Failed to insert research feed:", e);
  }
}

// ---- Main Handler ----

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // ---- Health Check ----
    if (body.action === "health") {
      return new Response(
        JSON.stringify({
          version: "2.0-knp",
          submind: "research",
          status: "operational",
          features: [
            "market_analysis", "competitor_monitoring", "campaign_memory",
            "trend_identification", "learning_engine_feed",
          ],
          knp_version: KNP_VERSION,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Parse KNP Payload ----
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
      return new Response(
        JSON.stringify({ error: "Invalid KNP payload. Research only speaks KNP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    // Extract KNP fields
    const brief = segments[KNP.ξb] || KNP_NULL_MARKER;
    const query = segments[KNP.ζq] || KNP_NULL_MARKER;
    const platformCtx = segments[KNP.μp] || segments[KNP.πf] || KNP_NULL_MARKER;
    const keywords = segments[KNP.κw] || KNP_NULL_MARKER;
    const clientId = segments[KNP.θc] || KNP_NULL_MARKER;

    // ---- Validate: brief must not be empty ----
    if (brief === KNP_NULL_MARKER && query === KNP_NULL_MARKER) {
      const responseSegments: Record<string, string> = {
        [KNP.σo]: KNP_NULL_MARKER,
        [KNP.πf]: "0.0",
        [KNP.ζq]: `MISSING${KNP_NULL_MARKER}`,
        [KNP.λv]: KNP_NULL_MARKER,
      };
      return new Response(
        JSON.stringify({
          version: KNP_VERSION,
          submind: "research",
          status: "incomplete",
          checksum: knpChecksum(responseSegments),
          timestamp: Date.now(),
          session_id: sessionId,
          segments: responseSegments,
          elapsed_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Gather Data ----

    // 1. Competitor observations
    const competitors = await queryCompetitorObservations(supabase, clientId);
    const competitorSummary = competitors.length > 0
      ? competitors.slice(0, 5).map(c =>
          `${c.competitor_name}: ${c.observed_action} on ${c.platform} (Δ${c.engagement_delta})`
        ).join("; ")
      : "No competitor data available.";

    // 2. Campaign memory (past high-performing campaigns)
    const pastCampaigns = await queryCampaignMemory(supabase, clientId, platformCtx);
    const memorySummary = pastCampaigns.length > 0
      ? pastCampaigns.slice(0, 5).map(c =>
          `"${c.campaign_name}" on ${c.platform}: VS=${c.viral_score}, E=${c.engagement_score}`
        ).join("; ")
      : "No campaign history available.";

    // 3. Client profile context
    let clientContext = "";
    if (clientId && clientId !== KNP_NULL_MARKER) {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("business_name, industry, target_audience, marketing_goals, main_competitors")
        .eq("id", clientId)
        .maybeSingle();

      if (profile) {
        clientContext = `Business: ${profile.business_name || "Unknown"}. Industry: ${profile.industry || "Unknown"}. Audience: ${profile.target_audience || "Unknown"}. Goals: ${profile.marketing_goals || "Unknown"}. Competitors: ${profile.main_competitors || "Unknown"}.`;
      }
    }

    // ---- AI Analysis ----
    const systemPrompt = `You are the KLYC Research Submind — an analytical intelligence engine. You produce structured market research findings. Be precise, data-oriented, and actionable. Temperature 0.3 — analytical, not creative.

Output format (strict):
MARKET_TRENDS: [2-3 bullet points]
COMPETITOR_INTEL: [2-3 bullet points]
AUDIENCE_INSIGHTS: [2-3 bullet points]
VIRAL_SIGNALS: [1-2 trending angles]
CONFIDENCE: [0.0-1.0 based on data completeness]
RECOMMENDATION: [1 sentence]`;

    const userPrompt = `Research brief: ${brief !== KNP_NULL_MARKER ? brief : "General market analysis"}
Query: ${query !== KNP_NULL_MARKER ? query : "N/A"}
Platform: ${platformCtx !== KNP_NULL_MARKER ? platformCtx : "All"}
Keywords: ${keywords !== KNP_NULL_MARKER ? keywords.replace(/⊕/g, ", ") : "None"}
Client context: ${clientContext || "No client profile."}
Competitor data: ${competitorSummary}
Past campaign performance: ${memorySummary}

Analyze the above and produce structured research findings.`;

    const aiResponse = await callAI(systemPrompt, userPrompt);

    // ---- Extract confidence from AI response ----
    const confidenceMatch = aiResponse.match(/CONFIDENCE:\s*([\d.]+)/i);
    const confidence = confidenceMatch ? Math.min(1, Math.max(0, parseFloat(confidenceMatch[1]))) : 0.5;

    // ---- Extract viral signals ----
    const viralMatch = aiResponse.match(/VIRAL_SIGNALS?:\s*(.+?)(?=\n[A-Z]|\n*$)/is);
    const viralSignals = viralMatch ? viralMatch[1].trim().slice(0, 200) : KNP_NULL_MARKER;

    // ---- Compress findings ----
    const compressedFindings = compressValue(aiResponse);

    // ---- Insert to research_feed (Learning Engine data) ----
    // Extract user_id from auth if available
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await userClient.auth.getUser();
        if (userData?.user?.id) userId = userData.user.id;
      } catch { /* use system */ }
    }

    const responseSegments: Record<string, string> = {
      [KNP.σo]: compressedFindings,
      [KNP.πf]: String(confidence),
      [KNP.λv]: viralSignals,
    };

    const knpResponse = JSON.stringify({
      version: KNP_VERSION,
      submind: "research",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      segments: responseSegments,
    });

    // Insert to research feed for Learning Engine
    await insertResearchFeed(
      supabase,
      userId,
      clientId !== KNP_NULL_MARKER ? clientId : null,
      null,
      "market_analysis",
      {
        brief: brief !== KNP_NULL_MARKER ? brief : null,
        platform: platformCtx !== KNP_NULL_MARKER ? platformCtx : null,
        competitors_found: competitors.length,
        past_campaigns_found: pastCampaigns.length,
        confidence,
      },
      knpResponse
    );

    const elapsed = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "research",
        status: "complete",
        checksum: knpChecksum(responseSegments),
        timestamp: Date.now(),
        session_id: sessionId,
        segments: responseSegments,
        elapsed_ms: elapsed,
        token_tracking: {
          submind: "research",
          input_chars: userPrompt.length,
          output_chars: aiResponse.length,
          compressed_chars: compressedFindings.length,
          elapsed_ms: elapsed,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Research submind error:", error);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: KNP_NULL_MARKER,
      [KNP.πf]: "0.0",
      [KNP.λv]: KNP_NULL_MARKER,
    };
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "research",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown research error",
        segments: errorSegments,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
