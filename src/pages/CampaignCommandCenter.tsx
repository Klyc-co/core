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
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const DEFAULT_SIGNALS: SignalDiscoveryState = {
  geo: "",
  industry: "",
  customerSize: "",
  competitor: "",
  addressableMarket: "",
  businessNeed: "",
  regulatoryDriver: "",
  productDefinition: "",
  campaignGoal: "",
  mode: "hybrid",
};

const DEFAULT_COMPRESSION: CompressionState = {
  customerDnaLoaded: false,
  customerDnaSummary: null,
  strategyProfileLoaded: false,
  strategyProfileName: null,
  lastRunAt: null,
};

const CampaignCommandCenter = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [signals, setSignals] = useState<SignalDiscoveryState>(DEFAULT_SIGNALS);
  const [strategy, setStrategy] = useState<StrategyComparison | null>(null);
  const [market, setMarket] = useState<MarketOpportunity | null>(null);
  const [compression, setCompression] = useState<CompressionState>(DEFAULT_COMPRESSION);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else setUser(user);
    });
  }, [navigate]);

  const handleLoadDna = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("client_brain")
        .select("data, document_type")
        .eq("user_id", user.id)
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
    try {
      const { data } = await supabase
        .from("client_brain")
        .select("data")
        .eq("user_id", user.id)
        .eq("document_type", "strategy")
        .limit(1)
        .maybeSingle();

      if (data) {
        setCompression((prev) => ({ ...prev, strategyProfileLoaded: true, strategyProfileName: "Active Strategy" }));
        toast.success("Strategy profile loaded");
      } else {
        toast.info("No strategy profile found.");
      }
    } catch {
      toast.error("Failed to load strategy profile");
    }
  };

  const handleAnalyze = async () => {
    if (!signals.campaignGoal) {
      toast.error("Enter a campaign goal to analyze");
      return;
    }
    setIsAnalyzing(true);

    // Simulate analysis (placeholder for AI call)
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
              <p className="text-xs text-muted-foreground mt-0.5">AI-driven campaign intelligence & strategy engine</p>
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
          {/* Left Column: Signal Discovery + Compression */}
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

          {/* Right Column: Strategy + Market */}
          <div className="lg:col-span-2 space-y-5">
            <StrategyComparisonPanel data={strategy} />
            <MarketOpportunityPanel data={market} />
          </div>
        </div>

        {/* Performance Timeline — full width below grid */}
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
