import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CampaignPerformanceTimeline from "@/components/campaigns/CampaignPerformanceTimeline";
import { ArrowLeft, Zap, Sparkles } from "lucide-react";
import SignalDiscoveryPanel, { type SignalDiscoveryState } from "@/components/command-center/SignalDiscoveryPanel";
import StrategyComparisonPanel, { type StrategyComparison } from "@/components/command-center/StrategyComparisonPanel";
import MarketOpportunityPanel, { type MarketOpportunity } from "@/components/command-center/MarketOpportunityPanel";
import CompressionStatePanel, { type CompressionState } from "@/components/command-center/CompressionStatePanel";
import NormalizerReportPanel from "@/components/command-center/NormalizerReportPanel";
import RunStatusPanel from "@/components/command-center/RunStatusPanel";
import { toast } from "sonner";
import { useCurrentClient } from "@/hooks/use-current-client";
import type { WorkflowPayload } from "@/types/workflow-payload";
import { isPayloadReady } from "@/types/workflow-payload";
import type { NormalizerReport } from "@/types/normalizer-report";
import { deriveRunStatus } from "@/types/run-status";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [normalizerReport, setNormalizerReport] = useState<NormalizerReport | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else setUser(user);
    });
  }, [navigate]);

  // Auto-load context when client is set
  useEffect(() => {
    if (user && currentClientId) {
      loadClientContext(currentClientId);
    }
  }, [user, currentClientId]);

  /** Load all available context summaries for the active client */
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
    } catch {
      // Silently continue – context is optional
    }
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
    } catch {
      toast.error("Failed to load Customer DNA");
    }
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
        setCompression((prev) => ({
          ...prev,
          strategyProfileLoaded: true,
          strategyProfileName: "Active Strategy",
        }));
        toast.success("Strategy profile loaded");
      } else {
        toast.info("No strategy profile found.");
      }
    } catch {
      toast.error("Failed to load strategy profile");
    }
  };

  /** Assemble a typed WorkflowPayload from current UI state */
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

    setIsAnalyzing(true);
    // TODO: Replace with real AI call passing `payload`
    console.log("[KLYC] Workflow payload ready:", payload);
    await new Promise((r) => setTimeout(r, 1500));

    setStrategy({
      requested: {
        summary: signals.campaignGoal,
        platforms: signals.industry === "SaaS" ? ["LinkedIn", "Twitter"] : ["Instagram", "TikTok"],
        goal: signals.campaignGoal,
        timeline: "30 days",
      },
      recommended: {
        summary: `Optimized multi-channel approach targeting ${signals.customerSize || "mid-market"} ${signals.industry || "tech"} companies in ${signals.geo || "North America"} with emphasis on ${signals.mode} outreach.`,
        platforms: ["LinkedIn", "Twitter", "YouTube"],
        goal: `${signals.campaignGoal} with 40% higher predicted ROI`,
        timeline: "45 days (phased rollout)",
        confidenceScore: 78,
        reasoning: `Based on ${signals.industry || "industry"} benchmarks and ${signals.mode} mode selection, a phased multi-platform approach reduces CAC by ~25% while maintaining volume targets. ${signals.regulatoryDriver ? `Regulatory considerations (${signals.regulatoryDriver}) factored into content compliance scoring.` : ""}`,
        risks: [
          "Longer timeline may delay initial metrics",
          signals.competitor ? `Direct competition from ${signals.competitor} in same channels` : "Market saturation risk on primary channels",
        ],
        upsides: [
          "Higher quality lead scoring through multi-touch attribution",
          "Platform diversification reduces single-channel dependency",
          "Phased approach allows mid-campaign optimization",
        ],
      },
    });

    setMarket({
      addressableMarketSize: signals.addressableMarket || "~125K",
      reachableAudience: "32K",
      recommendedOutbounds: 180,
      estimatedAccounts: 12,
      platformRankings: [
        { platform: "LinkedIn", score: 92, reason: "Highest B2B conversion" },
        { platform: "Twitter / X", score: 78, reason: "Thought leadership reach" },
        { platform: "YouTube", score: 65, reason: "Long-form authority" },
        { platform: "Instagram", score: 45, reason: "Brand awareness" },
      ],
      pressureMap: [
        { factor: "Competitor Activity", intensity: "high", note: signals.competitor ? `${signals.competitor} active on LinkedIn` : "Multiple incumbents active" },
        { factor: "Market Timing", intensity: "medium", note: "Q1 budget cycle aligns well" },
        { factor: "Regulatory", intensity: signals.regulatoryDriver ? "high" : "low", note: signals.regulatoryDriver || "No significant constraints" },
        { factor: "Content Saturation", intensity: "medium", note: "Moderate noise in primary channels" },
      ],
    });

    // Build normalizer report from payload + signals
    setNormalizerReport({
      campaignBrief: {
        geoFilter: signals.geo || null,
        industryFilter: signals.industry || null,
        customerSizeFilter: signals.customerSize || null,
        competitorFilter: signals.competitor || null,
        addressableMarket: signals.addressableMarket || null,
        businessNeed: signals.businessNeed || null,
        regulatoryDriver: signals.regulatoryDriver || null,
        productDefinition: signals.productDefinition || null,
        campaignGoal: signals.campaignGoal || null,
        requestedPlatforms: signals.industry === "SaaS" ? ["LinkedIn", "Twitter"] : ["Instagram", "TikTok"],
        recommendedPlatformsHint: ["LinkedIn", "Twitter", "YouTube"],
        campaignMode: signals.mode,
        confidenceScore: 78,
        warnings: [
          ...(!signals.competitor ? ["No competitor specified – competitive positioning may be generic"] : []),
          ...(!signals.regulatoryDriver ? ["No regulatory driver – compliance checks skipped"] : []),
        ],
      },
      customerContext: {
        brandVoiceSummary: compression.customerDnaSummary,
        productOfferSummary: compression.productSummary || signals.productDefinition || null,
        audienceSegments: signals.customerSize ? [signals.customerSize] : [],
        primaryPainPoints: signals.businessNeed ? [signals.businessNeed] : [],
        proofPoints: [],
        competitors: signals.competitor ? [signals.competitor] : [],
        regulations: signals.regulatoryDriver ? [signals.regulatoryDriver] : [],
        semanticThemes: signals.industry ? [signals.industry, signals.mode] : [signals.mode],
        trustSignals: compression.customerDnaLoaded ? ["Client Brain loaded"] : [],
        objections: [],
        sourceCount: [compression.customerDnaLoaded, compression.strategyProfileLoaded, compression.websiteSummary, compression.productSummary, compression.competitorSummary].filter(Boolean).length,
        lastUpdated: compression.lastRunAt,
        contextCoverage: Math.round(
          ([signals.campaignGoal, signals.industry, signals.geo, signals.customerSize, signals.competitor, signals.productDefinition, compression.customerDnaSummary, compression.productSummary].filter(Boolean).length / 8) * 100
        ),
      },
      orchestratorHints: {
        requiresResearch: !compression.competitorSummary,
        requiresProductPositioning: !compression.productSummary && !signals.productDefinition,
        requiresNarrativeSimulation: true,
        requiresPlatformEvaluation: true,
        estimatedCampaignComplexity: signals.regulatoryDriver ? "high" : signals.competitor ? "medium" : "low",
        missingCriticalInputs: [
          ...(!signals.campaignGoal ? ["Campaign goal"] : []),
          ...(!compression.customerDnaLoaded ? ["Customer DNA"] : []),
          ...(!signals.productDefinition && !compression.productSummary ? ["Product definition"] : []),
        ],
      },
      learningHooks: {
        explicitInputs: [
          ...(signals.campaignGoal ? ["Campaign goal"] : []),
          ...(signals.industry ? ["Industry"] : []),
          ...(signals.geo ? ["Geography"] : []),
          ...(signals.competitor ? ["Competitor"] : []),
        ],
        inferredSignals: [
          ...(signals.mode === "proactive" ? ["Proactive mode suggests brand-building intent"] : []),
          ...(signals.industry === "SaaS" ? ["SaaS industry suggests LinkedIn-first strategy"] : []),
        ],
        missingInputs: [
          ...(!signals.addressableMarket ? ["Addressable market size"] : []),
          ...(!compression.priorCampaignSummary ? ["Prior campaign history"] : []),
          ...(!compression.websiteSummary ? ["Website intelligence"] : []),
        ],
        confidenceDrivers: [
          ...(compression.customerDnaLoaded ? ["Customer DNA loaded"] : []),
          ...(signals.campaignGoal ? ["Clear campaign goal"] : []),
          ...(signals.industry ? ["Industry specified"] : []),
        ],
        compressionNotes: [
          ...(compression.customerDnaLoaded ? ["DNA compressed from client_brain"] : []),
          ...(compression.strategyProfileLoaded ? ["Strategy profile pre-loaded"] : []),
        ],
        updatableFields: ["competitor", "addressableMarket", "regulatoryDriver", "productDefinition"],
        sourceReferences: [
          ...(compression.customerDnaLoaded ? ["client_brain:brand"] : []),
          ...(compression.strategyProfileLoaded ? ["client_brain:strategy"] : []),
          ...(compression.websiteSummary ? ["client_brain:website"] : []),
        ],
        recommendedNextUpdate: compression.priorCampaignSummary ? null : "Load prior campaign data for better predictions",
      },
    });

    setCompression((prev) => ({ ...prev, lastRunAt: new Date().toISOString() }));
    setIsAnalyzing(false);
    toast.success("Analysis complete");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
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
                {currentClientName && (
                  <Badge variant="outline" className="ml-2 text-[10px] h-4">{currentClientName}</Badge>
                )}
              </p>
            </div>
          </div>
          <Button
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <Sparkles className="w-4 h-4" />
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <SignalDiscoveryPanel state={signals} onChange={setSignals} />
            <CompressionStatePanel
              state={compression}
              onLoadDna={handleLoadDna}
              onLoadStrategy={handleLoadStrategy}
              onRerun={handleAnalyze}
              isLoading={isAnalyzing}
            />
          </div>
          <div className="lg:col-span-2 space-y-5">
            <StrategyComparisonPanel data={strategy} />
            <MarketOpportunityPanel data={market} />
            <NormalizerReportPanel report={normalizerReport} />
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
