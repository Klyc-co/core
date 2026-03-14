import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CampaignPerformanceTimeline from "@/components/campaigns/CampaignPerformanceTimeline";
import { ArrowLeft, Zap, Sparkles, AlertCircle } from "lucide-react";
import SignalDiscoveryPanel, { type SignalDiscoveryState } from "@/components/command-center/SignalDiscoveryPanel";
import StrategyComparisonPanel, { type StrategyComparison } from "@/components/command-center/StrategyComparisonPanel";
import MarketOpportunityPanel, { type MarketOpportunity } from "@/components/command-center/MarketOpportunityPanel";
import CompressionStatePanel, { type CompressionState } from "@/components/command-center/CompressionStatePanel";
import NormalizerReportPanel from "@/components/command-center/NormalizerReportPanel";
import RunStatusPanel from "@/components/command-center/RunStatusPanel";
import OrchestrationVisibilityPanel from "@/components/command-center/OrchestrationVisibilityPanel";
import { toast } from "sonner";
import { useCurrentClient } from "@/hooks/use-current-client";
import { useRunCampaign } from "@/hooks/use-run-campaign";
import type { WorkflowPayload } from "@/types/workflow-payload";
import { isPayloadReady } from "@/types/workflow-payload";
import { idleEnvelope, type WorkflowReportEnvelope, type RawNormalizedObjects } from "@/types/run-status";
import RunHistorySelector, { type RunHistoryEntry } from "@/components/command-center/RunHistorySelector";
import type { User } from "@supabase/supabase-js";

const DEFAULT_SIGNALS: SignalDiscoveryState = {
  campaignGoal: "",
  geo: "",
  industry: "",
  customerSize: "",
  competitor: "",
  addressableMarket: "",
  businessNeed: "",
  regulatoryDriver: "",
  productDefinition: "",
  mode: "hybrid",
};

const DEFAULT_COMPRESSION: CompressionState = {
  customerDnaLoaded: false,
  customerDnaSummary: null,
  strategyProfileLoaded: false,
  strategyProfileName: null,
  lastRunAt: null,
  websiteSummary: null,
  productSummary: null,
  regulatorySummary: null,
  competitorSummary: null,
  priorCampaignSummary: null,
};

const CampaignCommandCenter = () => {
  const navigate = useNavigate();
  const { currentClientId, currentClientName } = useCurrentClient();
  const [user, setUser] = useState<User | null>(null);
  const [signals, setSignals] = useState<SignalDiscoveryState>(DEFAULT_SIGNALS);
  const [strategy, setStrategy] = useState<StrategyComparison | null>(null);
  const [market, setMarket] = useState<MarketOpportunity | null>(null);
  const [compression, setCompression] = useState<CompressionState>(DEFAULT_COMPRESSION);
  const [envelope, setEnvelope] = useState<WorkflowReportEnvelope | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { execute, isRunning, state: workflowState, history } = useRunCampaign();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else setUser(user);
    });
  }, [navigate]);

  useEffect(() => {
    if (user && currentClientId) loadClientContext(currentClientId);
  }, [user, currentClientId]);

  const loadClientContext = async (clientId: string) => {
    try {
      const { data } = await supabase
        .from("client_brain")
        .select("data, document_type")
        .eq("client_id", clientId)
        .limit(10);
      if (!data || data.length === 0) return;
      const find = (type: string) => {
        const doc = data.find((d) => d.document_type === type);
        return doc ? JSON.stringify(doc.data).slice(0, 300) : null;
      };
      setCompression((prev) => ({
        ...prev,
        customerDnaLoaded: Boolean(find("brand")),
        customerDnaSummary: find("brand"),
        strategyProfileLoaded: Boolean(find("strategy")),
        strategyProfileName: find("strategy") ? "Active Strategy" : null,
        websiteSummary: find("website"),
        productSummary: find("product"),
        regulatorySummary: find("regulatory"),
        competitorSummary: find("competitor"),
        priorCampaignSummary: find("campaign_history"),
      }));
    } catch { /* optional */ }
  };

  const handleLoadDna = async () => {
    if (!user) return;
    const clientId = currentClientId || user.id;
    try {
      const { data } = await supabase
        .from("client_brain")
        .select("data, document_type")
        .eq("client_id", clientId)
        .in("document_type", ["brand", "voice", "strategy"])
        .limit(3);
      if (data && data.length > 0) {
        const brandDoc = data.find((d) => d.document_type === "brand");
        const summary = brandDoc ? JSON.stringify(brandDoc.data).slice(0, 120) + "…" : "Loaded";
        setCompression((prev) => ({ ...prev, customerDnaLoaded: true, customerDnaSummary: summary }));
        toast.success("Customer DNA loaded");
      } else {
        toast.info("No Customer DNA found. Set up your Client Brain first.");
      }
    } catch { toast.error("Failed to load Customer DNA"); }
  };

  const handleLoadStrategy = async () => {
    if (!user) return;
    const clientId = currentClientId || user.id;
    try {
      const { data } = await supabase
        .from("client_brain")
        .select("data")
        .eq("client_id", clientId)
        .eq("document_type", "strategy")
        .limit(1)
        .maybeSingle();
      if (data) {
        setCompression((prev) => ({ ...prev, strategyProfileLoaded: true, strategyProfileName: "Active Strategy" }));
        toast.success("Strategy profile loaded");
      } else { toast.info("No strategy profile found."); }
    } catch { toast.error("Failed to load strategy profile"); }
  };

  const assemblePayload = (): WorkflowPayload => ({
    input_as_text: signals.campaignGoal,
    client_id: currentClientId || user?.id || "",
    client_name: currentClientName || "Default",
    compressed_customer_dna: compression.customerDnaSummary,
    prior_strategy_summary: compression.strategyProfileName ? compression.customerDnaSummary : null,
    prior_campaign_summary: compression.priorCampaignSummary,
    website_summary: compression.websiteSummary,
    product_summary: compression.productSummary || signals.productDefinition || null,
    regulatory_summary: compression.regulatorySummary || signals.regulatoryDriver || null,
    competitor_summary: compression.competitorSummary || signals.competitor || null,
  });

  const handleAnalyze = async () => {
    const payload = assemblePayload();
    if (!isPayloadReady(payload)) {
      toast.error("Enter a campaign brief and select a client to analyze");
      return;
    }

    const result = await execute(payload);
    if (!result) return;

    setEnvelope(result.envelope);
    setActiveRunId(result.runId);
    setCompression((prev) => ({ ...prev, lastRunAt: result.runTimestamp }));

    // Derive strategy & market panels from envelope's normalized objects
    const raw = result.envelope.rawNormalizedObjects;
    const brief = raw?.campaignBrief;

    if (brief) {
      setStrategy({
        requested: {
          summary: signals.campaignGoal,
          platforms: brief.requestedPlatforms?.length ? brief.requestedPlatforms : ["LinkedIn"],
          goal: signals.campaignGoal,
          timeline: "30 days",
        },
        recommended: {
          summary: `Optimized multi-channel approach targeting ${signals.customerSize || "mid-market"} ${signals.industry || "tech"} companies in ${signals.geo || "North America"} with emphasis on ${brief.campaignMode || "hybrid"} outreach.`,
          platforms: brief.recommendedPlatformsHint || ["LinkedIn", "YouTube"],
          goal: `${signals.campaignGoal} with optimized ROI`,
          timeline: "45 days (phased rollout)",
          confidenceScore: brief.confidenceScore ?? 0,
          reasoning: `Based on ${brief.confidenceScore ?? 0}% confidence and ${raw?.customerContext?.contextCoverage ?? 0}% coverage. ${brief.warnings?.length ? `Note: ${brief.warnings[0]}` : ""}`,
          risks: brief.warnings?.slice(0, 3) || [],
          upsides: [
            "Multi-touch attribution for higher quality leads",
            "Platform diversification reduces single-channel dependency",
            ...(raw?.orchestratorHints?.requiresNarrativeSimulation ? ["Narrative simulation will optimize messaging"] : []),
          ],
        },
      });

      setMarket({
        addressableMarketSize: brief.addressableMarket || "~125K",
        reachableAudience: "32K",
        recommendedOutbounds: 180,
        estimatedAccounts: 12,
        platformRankings: (brief.recommendedPlatformsHint || ["LinkedIn", "YouTube"]).map((p, i) => ({
          platform: p,
          score: Math.max(50, 95 - i * 15),
          reason: i === 0 ? "Primary recommended channel" : "Supporting channel",
        })),
        pressureMap: [
          { factor: "Competitor Activity", intensity: (raw?.orchestratorHints?.requiresResearch ? "high" : "medium") as "high" | "medium", note: brief.competitorFilter || "Requires research" },
          { factor: "Market Timing", intensity: "medium" as const, note: "Current market cycle" },
          { factor: "Regulatory", intensity: (brief.regulatoryDriver ? "high" : "low") as "high" | "low", note: brief.regulatoryDriver || "No significant constraints" },
          { factor: "Content Saturation", intensity: "medium" as const, note: "Moderate noise in primary channels" },
        ],
      });
    }
  };

  const clientId = currentClientId || user?.id || "";
  const clientName = currentClientName || "Default";

  let displayEnvelope: WorkflowReportEnvelope = envelope || idleEnvelope(clientId, clientName);
  if (isRunning) {
    displayEnvelope = { ...displayEnvelope, runMetadata: { ...displayEnvelope.runMetadata, status: "running" } };
  } else if (workflowState.phase === "error") {
    displayEnvelope = {
      ...displayEnvelope,
      runMetadata: { ...displayEnvelope.runMetadata, status: "error" },
      orchestrationSummary: { ...displayEnvelope.orchestrationSummary, verdict: "blocked", verdictReason: workflowState.message },
    };
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Campaign Command Center
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI-driven campaign intelligence & strategy engine
                {currentClientName && <Badge variant="outline" className="ml-2 text-[10px] h-4">{currentClientName}</Badge>}
              </p>
            </div>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleAnalyze} disabled={isRunning}>
            <Sparkles className="w-4 h-4" />
            {isRunning ? "Running Workflow…" : "Run Analysis"}
          </Button>
        </div>

        {workflowState.phase === "error" && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Workflow Error</p>
              <p className="text-xs text-destructive/80">{workflowState.message}</p>
            </div>
          </div>
        )}

        {workflowState.phase === "partial" && (
          <div className="mb-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-700">{workflowState.warning}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <SignalDiscoveryPanel state={signals} onChange={setSignals} />
            <CompressionStatePanel state={compression} onLoadDna={handleLoadDna} onLoadStrategy={handleLoadStrategy} onRerun={handleAnalyze} isLoading={isRunning} />
            <RunHistorySelector
              entries={history}
              activeRunId={activeRunId}
              onSelect={(entry) => {
                setEnvelope(entry.result.envelope);
                setActiveRunId(entry.id);
                setCompression((prev) => ({ ...prev, lastRunAt: entry.timestamp }));
              }}
            />
            <RunStatusPanel data={displayEnvelope} />
          </div>
          <div className="lg:col-span-2 space-y-5">
            <OrchestrationVisibilityPanel
              data={displayEnvelope.orchestrationSummary}
              isRunning={isRunning}
              isIdle={displayEnvelope.runMetadata.status === "idle"}
            />
            <StrategyComparisonPanel data={strategy} />
            <MarketOpportunityPanel data={market} />
            <NormalizerReportPanel report={envelope?.rawNormalizedObjects ?? null} />
          </div>
        </div>

        {strategy && (
          <div className="mt-6">
            <CampaignPerformanceTimeline campaignTitle={signals.campaignGoal || undefined} />
          </div>
        )}
      </main>
    </div>
  );
};

export default CampaignCommandCenter;
