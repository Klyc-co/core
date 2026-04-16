import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Globe, Search, Loader2, Download, Camera,
  TrendingUp, AlertTriangle, CheckCircle, XCircle,
  BarChart2, Users, Zap, Target, ChevronRight
} from "lucide-react";
import CustomerDNACard from "@/components/strategy-intelligence/CustomerDNACard";
import NarrativeSimulationArena from "@/components/strategy-intelligence/NarrativeSimulationArena";
import PlatformBattleView from "@/components/strategy-intelligence/PlatformBattleView";
import StrategyReasoningPanel from "@/components/strategy-intelligence/StrategyReasoningPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiscoveredPage {
  path: string;
  title: string;
  type: string;
  grade: string;
  score: number;
  issues: string[];
  strengths: string[];
  opportunities: string[];
}

interface FunnelStage {
  name: string;
  pages: string[];
  conversion_points: number;
  blockers: string[];
}

interface SocialProfile {
  platform: string;
  handle: string;
  followers?: number;
  grade: string;
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
  customer_url: string;
  customer_name: string;
  overall_score: number;
  overall_grade: string;
  summary: string;
  key_metrics: { label: string; value: string }[];
  pages: DiscoveredPage[];
  funnel_stages: FunnelStage[];
  conversion_killers: string[];
  social_profiles: SocialProfile[];
  audience_opportunities: AudienceOpportunity[];
  roadmap: RoadmapItem[];
  analyzed_at: string;
}

const gradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
};

const gradeBg = (grade: string) => {
  if (grade.startsWith("A")) return "bg-green-500/10 border-green-500/20";
  if (grade.startsWith("B")) return "bg-blue-500/10 border-blue-500/20";
  if (grade.startsWith("C")) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
};

const priorityBadge = (p: string) => {
  if (p === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
};

const ScoreBar = ({ score, color = "bg-primary" }: { score: number; color?: string }) => (
  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
    <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
  </div>
);

export default function CustomerStrategyAnalysis() {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("summary");

  const runAnalysis = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("strategy-discovery", {
        body: { customer_url: url.trim() },
      });
      if (error) throw error;
      setResult(data as AnalysisResult);
      setActiveTab("summary");
      toast.success("Analysis complete");
    } catch (err: any) {
      toast.error(err?.message || "Analysis failed — check the URL and try again");
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshot = async () => {
    if (!dashboardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `strategy-${result?.customer_name || "report"}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Screenshot saved");
    } catch {
      toast.error("Screenshot failed");
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current || !result) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      const w = 210;
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`strategy-${result.customer_name}-${Date.now()}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/strategy")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="w-px h-5 bg-border" />
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Customer Strategy Analysis</h1>
              <p className="text-xs text-muted-foreground">
                Dynamic website & social audit · Audience opportunities · 90-day roadmap
              </p>
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleScreenshot}>
                <Camera className="w-3.5 h-3.5 mr-1.5" /> Screenshot
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Enter customer website (e.g. lockeinyoursuccess.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                />
              </div>
              <Button onClick={runAnalysis} disabled={loading || !url.trim()}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing…</>
                  : <><Search className="w-4 h-4 mr-2" /> Run Analysis</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div ref={dashboardRef} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className={`border ${gradeBg(result.overall_grade)}`}>
                <CardContent className="py-4 text-center">
                  <div className={`text-4xl font-black ${gradeColor(result.overall_grade)}`}>
                    {result.overall_grade}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Overall Grade</div>
                  <ScoreBar score={result.overall_score} />
                </CardContent>
              </Card>
              {result.key_metrics.map((m, i) => (
                <Card key={i}>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{m.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <CustomerDNACard />
                  <PlatformBattleView />
                  <StrategyReasoningPanel />
                </div>
                <NarrativeSimulationArena />
                {result.conversion_killers.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" /> Conversion Killers
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
              </TabsContent>

              <TabsContent value="website" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> Funnel Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {result.funnel_stages.map((stage, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="px-3 py-2 rounded-lg bg-muted text-center min-w-[100px]">
                            <div className="text-xs font-semibold text-foreground">{stage.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{stage.pages.length} page{stage.pages.length !== 1 ? "s" : ""}</div>
                            <div className="text-xs text-primary mt-0.5">{stage.conversion_points} conversion{stage.conversion_points !== 1 ? "s" : ""}</div>
                            {stage.blockers.length > 0 && <div className="mt-1 text-xs text-red-400">{stage.blockers[0]}</div>}
                          </div>
                          {i < result.funnel_stages.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.pages.map((page, i) => (
                    <Card key={i} className={`border ${gradeBg(page.grade)}`}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-foreground">
                            {page.title}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">{page.path}</span>
                          </CardTitle>
                          <span className={`text-xl font-black ${gradeColor(page.grade)}`}>{page.grade}</span>
                        </div>
                        <ScoreBar score={page.score} />
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        {page.strengths.map((s, si) => <div key={si} className="flex gap-2 text-xs text-green-400"><CheckCircle className="w-3 h-3 mt-0.5 shrink-0" /> {s}</div>)}
                        {page.issues.map((issue, ii) => <div key={ii} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" /> {issue}</div>)}
                        {page.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-yellow-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" /> {o}</div>)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
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
                          {profile.handle}{profile.followers && <span className="ml-2 font-medium text-foreground">{profile.followers.toLocaleString()} followers</span>}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        {profile.gaps.map((g, gi) => <div key={gi} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" /> {g}</div>)}
                        {profile.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-green-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" /> {o}</div>)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="audience" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" /> Proactive Opportunities</h3>
                    {result.audience_opportunities.filter((o) => o.type === "proactive").map((opp, i) => (
                      <Card key={i} className="border-green-500/20">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div><div className="text-sm font-medium text-foreground">{opp.title}</div><div className="text-xs text-muted-foreground mt-0.5">{opp.description}</div></div>
                            <Badge variant="outline" className={`text-xs shrink-0 ${priorityBadge(opp.priority)}`}>{opp.priority}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Reactive Opportunities</h3>
                    {result.audience_opportunities.filter((o) => o.type === "reactive").map((opp, i) => (
                      <Card key={i} className="border-orange-500/20">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div><div className="text-sm font-medium text-foreground">{opp.title}</div><div className="text-xs text-muted-foreground mt-0.5">{opp.description}</div></div>
                            <Badge variant="outline" className={`text-xs shrink-0 ${priorityBadge(opp.priority)}`}>{opp.priority}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roadmap" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.roadmap.map((phase, i) => (
                    <Card key={i}>
                      <CardHeader className="py-3 px-4">
                        <div className="text-xs font-semibold text-primary">{phase.days}</div>
                        <CardTitle className="text-sm font-bold text-foreground">{phase.phase}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {phase.items.map((item, ii) => (
                          <div key={ii} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {item}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground text-right">
              Analyzed: {new Date(result.analyzed_at).toLocaleString()} · {result.customer_url}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
