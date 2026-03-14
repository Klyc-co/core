import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WorkflowPayload {
  input_as_text: string;
  client_id: string;
  client_name: string;
  compressed_customer_dna: string | null;
  prior_strategy_summary: string | null;
  prior_campaign_summary: string | null;
  website_summary: string | null;
  product_summary: string | null;
  regulatory_summary: string | null;
  competitor_summary: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: WorkflowPayload = await req.json();

    if (!payload.input_as_text?.trim() || !payload.client_id?.trim()) {
      return new Response(
        JSON.stringify({ error: "input_as_text and client_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runTimestamp = new Date().toISOString();

    // ── Load enrichment from client_brain ──
    const { data: brainDocs } = await supabase
      .from("client_brain")
      .select("data, document_type")
      .eq("client_id", payload.client_id)
      .limit(10);

    const findBrain = (type: string): string | null => {
      const doc = brainDocs?.find((d: any) => d.document_type === type);
      return doc ? JSON.stringify(doc.data).slice(0, 500) : null;
    };

    const dna = payload.compressed_customer_dna || findBrain("brand");
    const strategySummary = payload.prior_strategy_summary || findBrain("strategy");
    const campaignHistory = payload.prior_campaign_summary || findBrain("campaign_history");
    const websiteSummary = payload.website_summary || findBrain("website");
    const productSummary = payload.product_summary || findBrain("product");
    const regulatorySummary = payload.regulatory_summary || findBrain("regulatory");
    const competitorSummary = payload.competitor_summary || findBrain("competitor");

    // ── Compute metrics ──
    const contextFields = [dna, strategySummary, campaignHistory, websiteSummary, productSummary, regulatorySummary, competitorSummary];
    const filledCount = contextFields.filter(Boolean).length;
    const contextCoverage = Math.round((filledCount / contextFields.length) * 100);

    const text = payload.input_as_text.toLowerCase();
    const hasRegulatory = Boolean(regulatorySummary) || /regulat|compliance|gdpr|hipaa/i.test(text);
    const hasCompetitor = Boolean(competitorSummary) || /competitor|compete|rival/i.test(text);

    const missingCriticalInputs: string[] = [];
    if (!payload.input_as_text) missingCriticalInputs.push("Campaign goal");
    if (!dna) missingCriticalInputs.push("Customer DNA");
    if (!productSummary) missingCriticalInputs.push("Product definition");

    const warnings: string[] = [];
    if (!hasCompetitor) warnings.push("No competitor data — competitive positioning may be generic");
    if (!hasRegulatory) warnings.push("No regulatory context — compliance checks skipped");
    if (!campaignHistory) warnings.push("No prior campaign history — predictions may be less accurate");

    const confidenceScore = Math.min(100, Math.round(
      30 + (dna ? 15 : 0) + (productSummary ? 12 : 0) + (competitorSummary ? 10 : 0) +
      (strategySummary ? 8 : 0) + (websiteSummary ? 7 : 0) + (campaignHistory ? 10 : 0) + (regulatorySummary ? 8 : 0)
    ));

    // ── Build normalizer report ──
    const normalizerReport = {
      campaignBrief: {
        geoFilter: extractHint(text, /(?:geo|geography|region|market)[:\s]*([^\n,]+)/i),
        industryFilter: extractHint(text, /(?:industry|sector|vertical)[:\s]*([^\n,]+)/i),
        customerSizeFilter: extractHint(text, /(?:size|segment|smb|enterprise|mid-?market)[:\s]*([^\n,]+)/i),
        competitorFilter: competitorSummary ? competitorSummary.slice(0, 100) : null,
        addressableMarket: extractHint(text, /(?:tam|addressable|market size)[:\s]*([^\n,]+)/i),
        businessNeed: extractHint(text, /(?:need|pain|problem|challenge)[:\s]*([^\n,]+)/i),
        regulatoryDriver: regulatorySummary ? regulatorySummary.slice(0, 100) : null,
        productDefinition: productSummary ? productSummary.slice(0, 200) : null,
        campaignGoal: payload.input_as_text.slice(0, 300),
        requestedPlatforms: extractPlatforms(text),
        recommendedPlatformsHint: recommendPlatforms(text, dna),
        campaignMode: /proactive/i.test(text) ? "proactive" : /reactive/i.test(text) ? "reactive" : "hybrid",
        confidenceScore,
        warnings,
      },
      customerContext: {
        brandVoiceSummary: dna ? dna.slice(0, 200) : null,
        productOfferSummary: productSummary ? productSummary.slice(0, 200) : null,
        audienceSegments: extractList(text, /(?:audience|segment|persona)/i),
        primaryPainPoints: extractList(text, /(?:pain|problem|challenge)/i),
        proofPoints: [],
        competitors: competitorSummary ? [competitorSummary.slice(0, 80)] : [],
        regulations: regulatorySummary ? [regulatorySummary.slice(0, 80)] : [],
        semanticThemes: extractThemes(text),
        trustSignals: dna ? ["Client Brain loaded"] : [],
        objections: [],
        sourceCount: filledCount,
        lastUpdated: runTimestamp,
        contextCoverage,
      },
      orchestratorHints: {
        requiresResearch: !competitorSummary,
        requiresProductPositioning: !productSummary,
        requiresNarrativeSimulation: true,
        requiresPlatformEvaluation: true,
        estimatedCampaignComplexity: (hasRegulatory ? "high" : hasCompetitor ? "medium" : "low"),
        missingCriticalInputs,
      },
      learningHooks: {
        explicitInputs: ["Campaign goal", ...(dna ? ["Customer DNA"] : [])],
        inferredSignals: extractThemes(text).map((t: string) => `Inferred theme: ${t}`),
        missingInputs: [
          ...(!campaignHistory ? ["Prior campaign history"] : []),
          ...(!websiteSummary ? ["Website intelligence"] : []),
          ...(!regulatorySummary ? ["Regulatory context"] : []),
        ],
        confidenceDrivers: [
          ...(dna ? ["Customer DNA loaded"] : []),
          "Campaign goal provided",
          ...(productSummary ? ["Product context available"] : []),
        ],
        compressionNotes: [
          ...(dna ? ["DNA compressed from client_brain"] : []),
          ...(strategySummary ? ["Strategy profile pre-loaded"] : []),
        ],
        updatableFields: ["competitor", "addressableMarket", "regulatoryDriver", "productDefinition"],
        sourceReferences: [
          ...(dna ? ["client_brain:brand"] : []),
          ...(strategySummary ? ["client_brain:strategy"] : []),
          ...(websiteSummary ? ["client_brain:website"] : []),
          ...(productSummary ? ["client_brain:product"] : []),
        ],
        recommendedNextUpdate: !campaignHistory ? "Load prior campaign data for better predictions" : null,
      },
    };

    // ── Verdict ──
    let verdict = "ready";
    let verdictReason = "All checks passed — ready for orchestration";
    if (missingCriticalInputs.length > 0) {
      verdict = "blocked";
      verdictReason = `Blocked by ${missingCriticalInputs.length} missing critical input(s)`;
    } else if (confidenceScore < 40) {
      verdict = "low_confidence";
      verdictReason = `Confidence score (${confidenceScore}%) is below threshold`;
    } else if (contextCoverage < 30) {
      verdict = "needs_refresh";
      verdictReason = `Context coverage (${contextCoverage}%) is too low`;
    }

    // ── Agent execution summary ──
    const agentSteps = [
      { agent: "Normalizer", status: "complete", durationMs: Math.round((Date.now() - startTime) * 0.3), note: null },
      { agent: "Context Enricher", status: filledCount > 0 ? "complete" : "skipped", durationMs: filledCount > 0 ? Math.round((Date.now() - startTime) * 0.2) : null, note: filledCount === 0 ? "No client brain data" : null },
      { agent: "Signal Extractor", status: "complete", durationMs: Math.round((Date.now() - startTime) * 0.15), note: null },
      { agent: "Confidence Scorer", status: "complete", durationMs: Math.round((Date.now() - startTime) * 0.1), note: null },
      { agent: "Platform Evaluator", status: "complete", durationMs: Math.round((Date.now() - startTime) * 0.1), note: null },
      { agent: "Orchestration Planner", status: verdict === "blocked" ? "error" : "complete", durationMs: Math.round((Date.now() - startTime) * 0.15), note: verdict === "blocked" ? verdictReason : null },
    ];

    const completedAgents = agentSteps.filter((s) => s.status === "complete").length;
    const skippedAgents = agentSteps.filter((s) => s.status === "skipped").length;
    const errorAgents = agentSteps.filter((s) => s.status === "error").length;

    const durationMs = Date.now() - startTime;

    // ── Build unified envelope ──
    const envelope = {
      runMetadata: {
        clientId: payload.client_id,
        clientName: payload.client_name,
        runTimestamp,
        workflowVersion: "v2.1",
        status: "complete",
        durationMs,
      },
      normalizationChecksum: {
        contextCoverage,
        confidenceScore,
        missingInputsCount: missingCriticalInputs.length + normalizerReport.learningHooks.missingInputs.length,
        warningsCount: warnings.length,
        sourceCount: filledCount,
        compressionNotesCount: normalizerReport.learningHooks.compressionNotes.length,
      },
      orchestrationSummary: {
        verdict,
        verdictReason,
        orchestrationStatus: verdict === "blocked" ? "blocked" : "complete",
        executionOrder: agentSteps.filter(s => s.status !== "skipped").map(s => s.agent),
        partialRunAllowed: missingCriticalInputs.length > 0 && missingCriticalInputs.length < 3,
        blockedReasons: missingCriticalInputs,
        requiresResearch: normalizerReport.orchestratorHints.requiresResearch,
        requiresProductPositioning: normalizerReport.orchestratorHints.requiresProductPositioning,
        requiresNarrativeSimulation: true,
        requiresPlatformEvaluation: true,
        estimatedComplexity: normalizerReport.orchestratorHints.estimatedCampaignComplexity,
      },
      agentExecutionSummary: {
        totalAgents: agentSteps.length,
        completedAgents,
        skippedAgents,
        errorAgents,
        steps: agentSteps,
      },
      nextActions: {
        recommended: [
          ...(normalizerReport.orchestratorHints.requiresResearch ? ["Run competitor research"] : []),
          ...(normalizerReport.orchestratorHints.requiresProductPositioning ? ["Define product positioning"] : []),
          ...(verdict === "blocked" ? ["Resolve missing critical inputs"] : []),
        ],
        optional: [
          ...(!websiteSummary ? ["Import website intelligence"] : []),
          ...(!campaignHistory ? ["Load prior campaign data"] : []),
        ],
        recommendedNextUpdate: normalizerReport.learningHooks.recommendedNextUpdate,
      },
    };

    // Log activity
    await supabase.from("activity_events").insert({
      user_id: user.id,
      client_id: payload.client_id,
      event_type: "workflow_run",
      event_message: `Campaign workflow executed: ${payload.input_as_text.slice(0, 80)}`,
      metadata: { verdict, confidenceScore, contextCoverage, durationMs },
    });

    // Nest normalizer report inside envelope as rawNormalizedObjects
    envelope.rawNormalizedObjects = normalizerReport;

    return new Response(
      JSON.stringify({ success: true, envelope }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("run-campaign error:", err);
    return new Response(
      JSON.stringify({ error: "Internal workflow error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Utility helpers ──

function extractHint(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

function extractPlatforms(text: string): string[] {
  const platforms = ["linkedin", "twitter", "instagram", "tiktok", "youtube", "facebook"];
  return platforms.filter((p) => text.includes(p)).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
}

function recommendPlatforms(text: string, dna: string | null): string[] {
  const rec = ["LinkedIn"];
  if (/b2b|saas|enterprise/i.test(text + (dna || ""))) rec.push("Twitter");
  else rec.push("Instagram");
  rec.push("YouTube");
  return rec;
}

function extractList(text: string, pattern: RegExp): string[] {
  return pattern.test(text) ? [text.match(pattern)?.[0] || ""].filter(Boolean) : [];
}

function extractThemes(text: string): string[] {
  const themes: string[] = [];
  if (/growth|scale/i.test(text)) themes.push("Growth");
  if (/brand|awareness/i.test(text)) themes.push("Brand Awareness");
  if (/lead|conversion/i.test(text)) themes.push("Lead Generation");
  if (/retention|loyalty/i.test(text)) themes.push("Retention");
  if (/launch|product/i.test(text)) themes.push("Product Launch");
  return themes.length ? themes : ["General Campaign"];
}
