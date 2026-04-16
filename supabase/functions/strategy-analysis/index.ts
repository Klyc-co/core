// KLYC STRATEGY ANALYSIS SUBMIND
// Routes through the research submind (KNP) + Anthropic Claude
// Analyzes brand library, social presence, posting history
// Returns structured AnalysisResult for the strategy dashboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNP_VERSION = "Ψ3";
const KNP_NULL = "∅";
const K = { ξb: "ξb", ζq: "ζq", κw: "κw", σo: "σo" } as const;

function scoreToGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

async function callAI(system: string, user: string): Promise<{ text: string; tokensIn: number | null; tokensOut: number | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { text: "{}", tokensIn: null, tokensOut: null };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  const d = await res.json();
  return {
    text: d.content?.[0]?.text || "{}",
    tokensIn: d.usage?.input_tokens ?? null,
    tokensOut: d.usage?.output_tokens ?? null,
  };
}

async function callResearchSubmind(supabaseUrl: string, serviceKey: string, brief: string, audience: string, context: string): Promise<string> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({
        version: KNP_VERSION,
        session_id: crypto.randomUUID(),
        segments: {
          [K.ξb]: brief.slice(0, 500),
          [K.ζq]: audience.slice(0, 200),
          [K.κw]: context.slice(0, 300),
        },
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.segments?.[K.σo] || "";
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();

    const {
      client_name,
      business_name,
      website,
      description,
      industry,
      target_audience,
      value_proposition,
      brand_data,
      website_data,
      strategy_data,
      audience_data,
      competitor_data,
      social_connections = [],
      post_history = [],
    } = body;

    const brandName = business_name || client_name || "Your Brand";
    const audienceStr = target_audience || (audience_data ? JSON.stringify(audience_data).slice(0, 200) : "Not specified");

    const brandBrief = [
      business_name && `Brand: ${business_name}`,
      website && `Website: ${website}`,
      industry && `Industry: ${industry}`,
      description && `Description: ${description.slice(0, 300)}`,
      value_proposition && `Value prop: ${value_proposition.slice(0, 200)}`,
      competitor_data && `Competitors: ${JSON.stringify(competitor_data).slice(0, 200)}`,
    ].filter(Boolean).join(". ");

    const socialStr = social_connections.length > 0
      ? social_connections.map((s: any) => `${s.platform}:@${s.platform_username || s.platform_user_id || "unknown"}`).join(", ")
      : "No social channels connected";

    const postStr = post_history.length > 0
      ? `${post_history.length} posts (recent: ${post_history.slice(0, 5).map((p: any) => p.status || "draft").join(", ")})`
      : "No posting history";

    // Route through the research submind for market intelligence
    const researchFindings = await callResearchSubmind(
      supabaseUrl,
      serviceKey,
      brandBrief || "General brand strategy analysis",
      audienceStr,
      `Social: ${socialStr}. Posts: ${postStr}`
    );

    const availableDocs = [
      brand_data ? "brand" : null,
      website_data ? "website" : null,
      strategy_data ? "strategy" : null,
      audience_data ? "audience" : null,
      competitor_data ? "competitor" : null,
    ].filter(Boolean).join(", ") || "none";

    const systemPrompt = `You are the KLYC Strategy Analysis Submind. You produce structured brand strategy reports by analyzing brand data from the KLYC platform. You have access to research findings from the market intelligence engine.

You MUST return ONLY a valid JSON object — no markdown, no preamble, no explanation. Be specific and direct. Name real problems, not vague platitudes. Every recommendation must be concrete enough to act on tomorrow.

NEVER reference internal system names, protocols, or technical identifiers in any output.`;

    const userPrompt = `Analyze this brand and produce a full strategy report.

BRAND DATA:
${brandBrief || "Minimal brand data available"}

SOCIAL PRESENCE:
${socialStr}

POSTING HISTORY:
${postStr}

BRAND LIBRARY DOCS AVAILABLE: ${availableDocs}

RESEARCH SUBMIND INTELLIGENCE:
${researchFindings || "Not available"}

Return this exact JSON structure:
{
  "client_name": "${brandName}",
  "overall_score": <0-100>,
  "overall_grade": "<A+/A/A-/B+/B/B-/C+/C/C-/D/F>",
  "summary": "<2-3 sentence executive summary: current position, biggest gap, top opportunity>",
  "key_metrics": [
    {"label": "Social Channels", "value": "${social_connections.length}"},
    {"label": "Post History", "value": "${post_history.length} posts"},
    {"label": "<3rd meaningful metric>", "value": "<value>"}
  ],
  "page_audits": [
    {
      "title": "<section: Homepage/Pricing/Blog/Community/etc>",
      "grade": "<grade>",
      "score": <0-100>,
      "strengths": ["<specific>"],
      "issues": ["<specific>"],
      "opportunities": ["<specific>"]
    }
  ],
  "funnel_stages": [
    {
      "name": "<Discover/Engage/Convert/Retain>",
      "description": "<what happens at this stage>",
      "conversion_points": <number>,
      "blockers": ["<specific blocker if any>"]
    }
  ],
  "conversion_killers": ["<top 2-4 critical issues killing revenue/growth>"],
  "social_profiles": [
    {
      "platform": "<platform>",
      "handle": "<@handle or not connected>",
      "followers": null,
      "grade": "<grade>",
      "active": <true/false>,
      "gaps": ["<gap>"],
      "opportunities": ["<opportunity>"]
    }
  ],
  "audience_opportunities": [
    {"type": "proactive", "title": "<title>", "description": "<action + why>", "priority": "high"},
    {"type": "proactive", "title": "<title>", "description": "<action + why>", "priority": "medium"},
    {"type": "proactive", "title": "<title>", "description": "<action + why>", "priority": "low"},
    {"type": "reactive", "title": "<title>", "description": "<action + why>", "priority": "high"},
    {"type": "reactive", "title": "<title>", "description": "<action + why>", "priority": "medium"}
  ],
  "roadmap": [
    {"phase": "Foundation", "days": "Days 1-30", "items": ["<action 1>", "<action 2>", "<action 3>"]},
    {"phase": "Growth", "days": "Days 31-60", "items": ["<action 1>", "<action 2>", "<action 3>"]},
    {"phase": "Scale", "days": "Days 61-90", "items": ["<action 1>", "<action 2>", "<action 3>"]}
  ]
}`;

    const { text: rawJson, tokensIn, tokensOut } = await callAI(systemPrompt, userPrompt);

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const match = rawJson.match(/\{[\s\S]*\}/);
      try { parsed = match ? JSON.parse(match[0]) : {}; } catch { parsed = {}; }
    }

    // Log health (non-blocking)
    try {
      const sb = createClient(supabaseUrl, serviceKey);
      await sb.from("submind_health_snapshots").insert({
        submind_id: "strategy-analysis",
        invocation_count: 1,
        success_count: 1,
        error_count: 0,
        avg_latency_ms: 0,
        avg_tokens_in: tokensIn,
        avg_tokens_out: tokensOut,
        window_start: new Date().toISOString(),
      });
    } catch { /* non-blocking */ }

    const result = {
      client_name: parsed.client_name || brandName,
      overall_score: parsed.overall_score || 50,
      overall_grade: parsed.overall_grade || scoreToGrade(parsed.overall_score || 50),
      summary: parsed.summary || "Analysis complete.",
      key_metrics: parsed.key_metrics || [
        { label: "Social Channels", value: String(social_connections.length) },
        { label: "Post History", value: `${post_history.length} posts` },
        { label: "Brand Docs", value: availableDocs },
      ],
      page_audits: parsed.page_audits || [],
      funnel_stages: parsed.funnel_stages || [],
      conversion_killers: parsed.conversion_killers || [],
      social_profiles: parsed.social_profiles || [],
      audience_opportunities: parsed.audience_opportunities || [],
      roadmap: parsed.roadmap || [],
      analyzed_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("strategy-analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
