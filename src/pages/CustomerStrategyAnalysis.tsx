import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft, Loader2, Download, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Zap, Target, ChevronRight, Brain, Clock, Info,
  BarChart2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PlatformBattleView, { type PlatformBattle } from "@/components/strategy-intelligence/PlatformBattleView";
import CustomerDNACard, { type CustomerDNA } from "@/components/strategy-intelligence/CustomerDNACard";
import StrategyReasoningPanel, { type StrategyReasoning } from "@/components/strategy-intelligence/StrategyReasoningPanel";

// Backend project — all AI subminds live here
const BACKEND_URL = "https://wkqiielsazzbxziqmgdb.supabase.co";
const BACKEND_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWlpZWxzYXp6Ynh6aXFtZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE3ODMsImV4cCI6MjA5MTA3Nzc4M30.HAoqLxzj_YdKXhldOzyjR4qaJHVLfaldMY_XKgf8htU";

interface PageAudit {
  title: string;
  grade: string;
  score: number;
  issues: string[];
  strengths: string[];
  opportunities: string[];
}

interface FunnelStage {
  name: string;
  description: string;
  conversion_points: number;
  blockers: string[];
}

interface SocialProfile {
  platform: string;
  handle: string;
  followers?: number;
  grade: string;
  score?: number;
  active: boolean;
  gaps: string[];
  opportunities: string[];
}

interface AudienceOpportunity {
  type: "proactive" | "reactive";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface RoadmapItem {
  phase: string;
  days: string;
  items: string[];
}

interface AnalysisResult {
  client_name: string;
  overall_score: number;
  overall_grade: string;
  summary: string;
  key_metrics: { label: string; value: string }[];
  page_audits: PageAudit[];
  funnel_stages: FunnelStage[];
  conversion_killers: string[];
  social_profiles: SocialProfile[];
  audience_opportunities: AudienceOpportunity[];
  roadmap: RoadmapItem[];
  analyzed_at: string;
}

interface BrainDoc {
  data: any;
  document_type: string;
}

// ─── Visual helpers ────────────────────────────────────────────────────────────

const gradeColor = (g: string) => {
  if (g.startsWith("A")) return "text-green-500";
  if (g.startsWith("B")) return "text-blue-500";
  if (g.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
};

const gradeBg = (g: string) => {
  if (g.startsWith("A")) return "bg-green-500/10 border-green-500/20";
  if (g.startsWith("B")) return "bg-blue-500/10 border-blue-500/20";
  if (g.startsWith("C")) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
};

const priorityBadge = (p: string) => {
  if (p === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
};

const ScoreBar = ({ score }: { score: number }) => (
  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
    <div
      className="bg-primary h-1.5 rounded-full transition-all"
      style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
    />
  </div>
);

// ─── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  value: string | number;
  label: string;
  tooltip: string;
  source: string;
  colorClass?: string;
  bgClass?: string;
  showBar?: boolean;
  barScore?: number;
}

function MetricCard({ value, label, tooltip, source, colorClass, bgClass, showBar, barScore }: MetricCardProps) {
  return (
    <Card className={bgClass ? `border ${bgClass}` : ""}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className={`text-2xl font-bold leading-tight ${colorClass || "text-foreground"}`}>
            {value}
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground shrink-0 mt-1 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                <p className="font-medium mb-1">{label}</p>
                <p className="text-muted-foreground">{tooltip}</p>
                <p className="text-primary/70 mt-1 font-mono text-[10px]">Source: {source}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">{label}</p>
        {showBar && barScore !== undefined && <ScoreBar score={barScore} />}
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
      <div className="text-muted-foreground/30">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {sub && <p className="text-xs text-muted-foreground/60 max-w-xs">{sub}</p>}
    </div>
  );
}

// ─── Intelligence data builders ───────────────────────────────────────────────

function gradeToScore(grade: string): number {
  if (grade.startsWith("A+")) return 97;
  if (grade.startsWith("A")) return 90;
  if (grade.startsWith("B+")) return 87;
  if (grade.startsWith("B")) return 78;
  if (grade.startsWith("C+")) return 67;
  if (grade.startsWith("C")) return 60;
  if (grade.startsWith("D")) return 45;
  return 30;
}

function safeArr(v: any, limit = 6): string[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, limit).map(item =>
    typeof item === "string" ? item : (item?.name ?? JSON.stringify(item).slice(0, 80))
  );
}

function safeStr(v: any, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return JSON.stringify(v).slice(0, 300);
  return fallback;
}

function buildPlatformBattle(profiles: SocialProfile[]): PlatformBattle {
  const scored = profiles.map(p => ({ ...p, _score: p.score ?? gradeToScore(p.grade) }));
  const sorted = [...scored].sort((a, b) => b._score - a._score);
  return {
    scores: Object.fromEntries(scored.map(p => [p.platform, p._score])),
    bestFirst: sorted[0]?.platform || "",
    customerRequested: profiles.filter(p => p.active).map(p => p.platform),
    systemRecommended: sorted.slice(0, 3).map(p => p.platform),
  };
}

function buildCustomerDNA(brainDocs: BrainDoc[], result: AnalysisResult): CustomerDNA {
  const brandDoc = brainDocs.find(d => d.document_type === "brand")?.data;
  const audDoc   = brainDocs.find(d => d.document_type === "audience")?.data;
  const compDoc  = brainDocs.find(d => d.document_type === "competitor")?.data;
  const regDoc   = brainDocs.find(d => d.document_type === "regulatory")?.data;

  const brandVoice =
    safeStr(brandDoc?.brandVoice || brandDoc?.brand_voice || brandDoc?.voice || brandDoc?.tone) ||
    result.summary.slice(0, 280);

  const rawCompetitors = compDoc?.competitors ?? (Array.isArray(compDoc) ? compDoc : []);

  return {
    brandVoice,
    audienceSegments: safeArr(audDoc?.segments || audDoc?.audienceSegments || audDoc?.audience_segments || audDoc?.audiences),
    painPoints:       safeArr(audDoc?.painPoints || audDoc?.pain_points || brandDoc?.painPoints || brandDoc?.pain_points),
    proofPoints:      safeArr(brandDoc?.proofPoints || brandDoc?.proof_points || brandDoc?.results || brandDoc?.outcomes),
    regulations:      safeArr(regDoc?.regulations || regDoc?.rules || regDoc?.requirements || regDoc?.compliance),
    competitors:      safeArr(rawCompetitors),
    semanticThemes:   safeArr(brandDoc?.themes || brandDoc?.semanticThemes || brandDoc?.keywords || brandDoc?.topics),
    trustSignals:     safeArr(brandDoc?.trustSignals || brandDoc?.trust_signals || brandDoc?.credentials),
    compressedSourceCount: brainDocs.length,
  };
}

function buildStrategyReasoning(result: AnalysisResult): StrategyReasoning {
  const sorted = [...result.social_profiles]
    .sort((a, b) => (b.score ?? gradeToScore(b.grade)) - (a.score ?? gradeToScore(a.grade)));
  const active = result.social_profiles.filter(p => p.active).map(p => p.platform);
  const topThree = sorted.slice(0, 3).map(p => `${p.platform} (${p.grade})`);

  const reactive  = result.audience_opportunities.filter(o => o.type === "reactive").map(o => `${o.title}: ${o.description}`);
  const proactive = result.audience_opportunities.filter(o => o.type === "proactive").map(o => `${o.title}: ${o.description}`);

  return {
    whyThisApproach: result.summary,
    customerRequested: active.length
      ? `Active connections: ${active.join(", ")}. Strategy is anchored to your existing platform footprint.`
      : "No active social connections detected — strategy is foundational, focused on setup and first-publish.",
    systemRecommendation: topThree.length
      ? `Prioritize ${topThree.join(", ")} based on engagement scoring. ${sorted[0]?.opportunities?.[0] ?? ""}`
      : "Connect social platforms to generate data-driven channel recommendations.",
    reactiveOpportunities:  reactive.length  ? reactive  : result.conversion_killers.slice(0, 3),
    proactiveOpportunities: proactive,
    qrRoutingNotes: result.page_audits
      .filter(p => p.opportunities.length > 0)
      .slice(0, 3)
      .map(p => `${p.title}: ${p.opportunities[0]}`),
  };
}

// ─── Tooltip map for key_metrics ──────────────────────────────────────────────

const METRIC_TOOLTIP_MAP: Record<string, { tip: string; src: string }> = {
  "Active Social Channels": {
    tip: "Number of social platforms actively connected in your KLYC account. More connected platforms increases visibility coverage and gives the analysis engine more data to work with.",
    src: "social_connections table · user_id",
  },
  "Social Channels": {
    tip: "Number of social platforms actively connected in your KLYC account.",
    src: "social_connections table · user_id",
  },
  "Total Posts": {
    tip: "Posts in your queue (last 30 entries), across all statuses. Consecutive failures indicate publishing errors — check your social connection tokens.",
    src: "post_queue table · last 30 rows · user_id",
  },
  "Post History": {
    tip: "Posts recorded in your queue (last 30). Includes published, draft, failed, and scheduled entries.",
    src: "post_queue table · last 30 rows · user_id",
  },
  "Brand Documentation": {
    tip: "Presence of key brain library documents: brand, website, strategy, audience, and competitor. Missing docs reduce analysis depth and campaign quality.",
    src: "client_brain table · document_type · user_id",
  },
  "Brand Docs": {
    tip: "Presence of key brain library documents: brand, website, strategy, audience, and competitor. Missing docs reduce analysis depth and campaign quality.",
    src: "client_brain table · document_type · user_id",
  },
  "Content Production Health": {
    tip: "Success rate of your 5 most recent posts. Published = success. Failed or still in draft = failure. A 0% rate means your last 5 posts never made it to any platform.",
    src: "post_queue table · status field · last 5 posts",
  },
};

function getMetricTooltip(label: string): { tip: string; src: string } {
  const key = Object.keys(METRIC_TOOLTIP_MAP).find(k => label.includes(k));
  return key
    ? METRIC_TOOLTIP_MAP[key]
    : { tip: `${label} — derived from your brand and posting data by the analysis engine.`, src: "strategy-analysis submind · key_metrics[]" };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerStrategyAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [brainDocs, setBrainDocs]   = useState<BrainDoc[]>([]);
  const [activeTab, setActiveTab]   = useState("summary");
  const [brandName, setBrandName]   = useState<string>("");

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const userId = user.id;

      const [profileRes, brainRes, socialRes, postRes] = await Promise.all([
        supabase.from("client_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("client_brain").select("data, document_type").eq("user_id", userId).limit(30),
        supabase.from("social_connections").select("platform, platform_username, platform_user_id, created_at").eq("user_id", userId),
        supabase.from("post_queue").select("id, content_type, post_text, status, scheduled_at, published_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);

      const profile = profileRes.data;
      const brain   = brainRes.data || [];
      setBrainDocs(brain);

      const find = (type: string) => brain.find((d) => d.document_type === type)?.data || null;
      if (profile?.business_name) setBrandName(profile.business_name);

      const res = await fetch(`${BACKEND_URL}/functions/v1/strategy-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BACKEND_ANON}`,
          "apikey": BACKEND_ANON,
        },
        body: JSON.stringify({
          user_id:           userId,
          client_name:       profile?.business_name || user.email?.split("@")[0] || "Your Brand",
          business_name:     profile?.business_name,
          website:           profile?.website,
          description:       profile?.description,
          industry:          profile?.industry,
          target_audience:   profile?.target_audience,
          value_proposition: profile?.value_proposition,
          brand_data:        find("brand"),
          website_data:      find("website"),
          strategy_data:     find("strategy"),
          audience_data:     find("audience"),
          competitor_data:   find("competitor"),
          regulatory_data:   find("regulatory"),
          social_connections: socialRes.data || [],
          post_history:       postRes.data   || [],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data as AnalysisResult);
      setActiveTab("summary");
      toast.success("Strategy analysis complete");
    } catch (err: any) {
      toast.error(err?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runAnalysis(); }, []);

  // Derived metrics
  const derivedMetrics = result ? [
    {
      value:   result.page_audits.length > 0 ? `${result.page_audits.length} sections` : "—",
      label:   "Funnel Sections Audited",
      tooltip: "Number of funnel touchpoints reviewed — Homepage, Pricing, Blog, etc. Each graded independently and visible in the Website tab.",
      source:  "page_audits[] · strategy-analysis submind",
    },
    {
      value:   result.audience_opportunities.length > 0 ? `${result.audience_opportunities.length} found` : "0 found",
      label:   "Audience Opportunities",
      tooltip: `${result.audience_opportunities.filter(o => o.priority === "high").length} high · ${result.audience_opportunities.filter(o => o.priority === "medium").length} medium · ${result.audience_opportunities.filter(o => o.priority === "low").length} low priority. Proactive = things to start, Reactive = gaps to close.`,
      source:  "audience_opportunities[] · strategy-analysis submind",
    },
    {
      value:   `${result.roadmap.reduce((acc, p) => acc + p.items.length, 0)} actions`,
      label:   "90-Day Roadmap Actions",
      tooltip: result.roadmap.length > 0
        ? `${result.roadmap.map(p => `${p.phase}: ${p.items.length}`).join(" · ")}. Sequenced across Days 1–30, 31–60, 61–90.`
        : "No roadmap generated this run — re-analyze with more brand context loaded.",
      source:  "roadmap[] · strategy-analysis submind",
    },
  ] : [];

  // Intelligence panel data (always built when result exists)
  const platformBattle = result ? buildPlatformBattle(result.social_profiles) : undefined;
  const customerDNA    = result ? buildCustomerDNA(brainDocs, result)         : undefined;
  const strategyRsn    = result ? buildStrategyReasoning(result)               : undefined;

  return (
    <div className="min-h-screen bg-background">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <div className="border-b border-border bg-card/50 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/strategy")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Strategy Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Brand library · Social presence · Audience opportunities · 90-day roadmap
                {brandName && <Badge variant="outline" className="ml-2 text-xs">{brandName}</Badge>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Analyzing…</>
                : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Re-analyze</>}
            </Button>
            {result && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Print / PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Reading your brand data…</h2>
            <p className="text-sm text-muted-foreground">Analyzing brand library, social connections, and posting history</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">

            {/* ── Metric grid ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {/* Overall Grade */}
              <Card className={`border ${gradeBg(result.overall_grade)}`}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className={`text-4xl font-black leading-none ${gradeColor(result.overall_grade)}`}>
                      {result.overall_grade}
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground shrink-0 mt-1 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                          <p className="font-medium mb-1">Overall Grade</p>
                          <p className="text-muted-foreground">Composite score ({result.overall_score}/100) across brand completeness, social presence, posting consistency, and funnel effectiveness.</p>
                          <p className="text-primary/70 mt-1 font-mono text-[10px]">Source: overall_score · strategy-analysis submind</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Grade</p>
                  <ScoreBar score={result.overall_score} />
                </CardContent>
              </Card>

              {/* AI key metrics */}
              {result.key_metrics.map((m, i) => {
                const tip = getMetricTooltip(m.label);
                return <MetricCard key={i} value={m.value} label={m.label} tooltip={tip.tip} source={tip.src} />;
              })}

              {/* 3 derived metrics */}
              {derivedMetrics.map((m, i) => <MetricCard key={`d-${i}`} {...m} />)}
            </div>

            {/* Summary sentence */}
            <Card>
              <CardContent className="py-4 px-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>

            {/* ── Tabs ────────────────────────────────────────────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 no-print">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              </TabsList>

              {/* ── Summary tab ─────────────────────────────────────────────── */}
              <TabsContent value="summary" className="mt-4 space-y-5">

                {/* Priority issues — show if present */}
                {result.conversion_killers.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />Priority Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {result.conversion_killers.map((k, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-foreground">{k}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top 3 page audit mini-cards */}
                {result.page_audits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.page_audits.slice(0, 3).map((page, i) => (
                      <Card key={i} className={`border ${gradeBg(page.grade)}`}>
                        <CardContent className="py-4 px-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{page.title}</span>
                            <span className={`text-lg font-black ${gradeColor(page.grade)}`}>{page.grade}</span>
                          </div>
                          <ScoreBar score={page.score} />
                          <div className="mt-2 space-y-1">
                            {page.issues.slice(0, 2).map((issue, ii) => (
                              <div key={ii} className="text-xs text-red-400 flex gap-1 items-start">
                                <XCircle className="w-3 h-3 mt-0.5 shrink-0" />{issue}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-border/60">
                    <CardContent className="py-6 px-4">
                      <EmptyState
                        icon={<Target className="w-8 h-8" />}
                        message="No funnel audit data this run"
                        sub="Add a website URL to your brand profile and re-analyze to get page-level grades."
                      />
                    </CardContent>
                  </Card>
                )}

                {/* ── Intelligence layer — always visible ──────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <CustomerDNACard data={customerDNA} />
                  <StrategyReasoningPanel data={strategyRsn} />
                </div>
              </TabsContent>

              {/* ── Website tab ─────────────────────────────────────────────── */}
              <TabsContent value="website" className="mt-4 space-y-4">
                {result.funnel_stages.length > 0 && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />Funnel Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap items-start gap-2">
                        {result.funnel_stages.map((stage, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="px-3 py-2 rounded-lg bg-muted text-center min-w-[110px]">
                              <div className="text-xs font-semibold text-foreground">{stage.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{stage.description}</div>
                              <div className="text-xs text-primary mt-0.5">{stage.conversion_points} point{stage.conversion_points !== 1 ? "s" : ""}</div>
                              {stage.blockers[0] && <div className="mt-1 text-xs text-red-400 leading-tight">{stage.blockers[0]}</div>}
                            </div>
                            {i < result.funnel_stages.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3" />}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result.page_audits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.page_audits.map((page, i) => (
                      <Card key={i} className={`border ${gradeBg(page.grade)}`}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">{page.title}</CardTitle>
                            <span className={`text-xl font-black ${gradeColor(page.grade)}`}>{page.grade}</span>
                          </div>
                          <ScoreBar score={page.score} />
                        </CardHeader>
                        <CardContent className="pt-0 space-y-1">
                          {page.strengths.map((s, si)   => <div key={si} className="flex gap-2 text-xs text-green-400"><CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />{s}</div>)}
                          {page.issues.map((issue, ii)  => <div key={ii} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{issue}</div>)}
                          {page.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-yellow-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />{o}</div>)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Target className="w-10 h-10" />}
                    message="No page audits returned"
                    sub="Add a website URL to your profile and re-analyze. The engine will grade Homepage, Pricing, Blog, and key conversion pages."
                  />
                )}
              </TabsContent>

              {/* ── Social tab ──────────────────────────────────────────────── */}
              <TabsContent value="social" className="mt-4 space-y-5">
                {/* Platform Battle — always renders (falls back to mock if no data) */}
                <PlatformBattleView data={platformBattle} />

                {result.social_profiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.social_profiles.map((profile, i) => (
                      <Card key={i} className={`border ${gradeBg(profile.grade)}`}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">{profile.platform}</CardTitle>
                            <div className="flex items-center gap-2">
                              {!profile.active && <Badge variant="outline" className="text-xs text-red-400 border-red-500/30">Inactive</Badge>}
                              <span className={`text-xl font-black ${gradeColor(profile.grade)}`}>{profile.grade}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {profile.handle}
                            {profile.followers && <span className="ml-2 font-medium text-foreground">{profile.followers.toLocaleString()} followers</span>}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-1">
                          {profile.gaps.map((g, gi)         => <div key={gi} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{g}</div>)}
                          {profile.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-green-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />{o}</div>)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<BarChart2 className="w-10 h-10" />}
                    message="No social profile data returned"
                    sub="Connect your social accounts in Settings and re-analyze to get per-platform grading and gap analysis."
                  />
                )}
              </TabsContent>

              {/* ── Audience tab ────────────────────────────────────────────── */}
              <TabsContent value="audience" className="mt-4">
                {result.audience_opportunities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-500" />Proactive Opportunities
                      </h3>
                      {result.audience_opportunities.filter(o => o.type === "proactive").map((opp, i) => (
                        <Card key={i} className="border-green-500/20">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium text-foreground">{opp.title}</div>
                                <div className="text-sm text-muted-foreground mt-0.5">{opp.description}</div>
                              </div>
                              <Badge variant="outline" className={`text-xs shrink-0 ${priorityBadge(opp.priority)}`}>{opp.priority}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />Reactive Opportunities
                      </h3>
                      {result.audience_opportunities.filter(o => o.type === "reactive").map((opp, i) => (
                        <Card key={i} className="border-orange-500/20">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium text-foreground">{opp.title}</div>
                                <div className="text-sm text-muted-foreground mt-0.5">{opp.description}</div>
                              </div>
                              <Badge variant="outline" className={`text-xs shrink-0 ${priorityBadge(opp.priority)}`}>{opp.priority}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Zap className="w-10 h-10" />}
                    message="No audience opportunities detected"
                    sub="Upload audience, competitor, and brand documents to your brain library, then re-analyze for proactive and reactive opportunity scoring."
                  />
                )}
              </TabsContent>

              {/* ── Roadmap tab ─────────────────────────────────────────────── */}
              <TabsContent value="roadmap" className="mt-4">
                {result.roadmap.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.roadmap.map((phase, i) => (
                      <Card key={i}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <Clock className="w-3.5 h-3.5" />{phase.days}
                          </div>
                          <CardTitle className="text-sm font-bold text-foreground">{phase.phase}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {phase.items.map((item, ii) => (
                            <div key={ii} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{item}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Clock className="w-10 h-10" />}
                    message="No 90-day roadmap generated this run"
                    sub="The roadmap requires sufficient brand context (strategy, audience, competitor docs) to generate sequenced actions. Add missing brain docs and re-analyze."
                  />
                )}
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground text-right no-print">
              Analyzed: {new Date(result.analyzed_at).toLocaleString()} · {result.client_name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
