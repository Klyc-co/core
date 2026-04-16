import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Loader2, Download, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Zap, Target, ChevronRight, Brain, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
  </div>
);

export default function CustomerStrategyAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [brandName, setBrandName] = useState<string>("");

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // Get the logged-in user — they ARE the client
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const userId = user.id;

      // Fetch all brand data in parallel — all keyed to user_id
      const [profileRes, brainRes, socialRes, postRes] = await Promise.all([
        supabase.from("client_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("client_brain").select("data, document_type").eq("user_id", userId).limit(30),
        supabase.from("social_connections").select("platform, platform_username, platform_user_id, created_at").eq("user_id", userId),
        supabase.from("post_queue").select("id, content_type, post_text, status, scheduled_at, published_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);

      const profile = profileRes.data;
      const brainData = brainRes.data || [];
      const find = (type: string) => brainData.find((d) => d.document_type === type)?.data || null;

      // Set brand name from profile
      if (profile?.business_name) setBrandName(profile.business_name);

      // Call strategy-analysis on the backend project directly (all AI subminds live there)
      const res = await fetch(`${BACKEND_URL}/functions/v1/strategy-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BACKEND_ANON}`,
          "apikey": BACKEND_ANON,
        },
        body: JSON.stringify({
          user_id: userId,
          client_name: profile?.business_name || user.email?.split("@")[0] || "Your Brand",
          // Brand profile
          business_name: profile?.business_name,
          website: profile?.website,
          description: profile?.description,
          industry: profile?.industry,
          target_audience: profile?.target_audience,
          value_proposition: profile?.value_proposition,
          // Brain library docs
          brand_data: find("brand"),
          website_data: find("website"),
          strategy_data: find("strategy"),
          audience_data: find("audience"),
          competitor_data: find("competitor"),
          regulatory_data: find("regulatory"),
          // Social & activity
          social_connections: socialRes.data || [],
          post_history: postRes.data || [],
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

  // Auto-run on mount — the user IS the brand
  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="border-b border-border bg-card/50 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/strategy")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="w-px h-5 bg-border" />
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Strategy Analysis</h1>
              <p className="text-xs text-muted-foreground">
                Brand library · Social presence · Audience opportunities · 90-day roadmap
                {brandName && (
                  <Badge variant="outline" className="ml-2 text-[10px] h-4">{brandName}</Badge>
                )}
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
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Reading your brand data…</h2>
            <p className="text-sm text-muted-foreground">Analyzing brand library, social connections, and posting history</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className={`border ${gradeBg(result.overall_grade)}`}>
                <CardContent className="py-4 text-center">
                  <div className={`text-4xl font-black ${gradeColor(result.overall_grade)}`}>{result.overall_grade}</div>
                  <div className="text-xs text-muted-foreground mt-1">Overall Grade</div>
                  <ScoreBar score={result.overall_score} />
                </CardContent>
              </Card>
              {result.key_metrics.map((m, i) => (
                <Card key={i}><CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                </CardContent></Card>
              ))}
            </div>

            <Card><CardContent className="py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </CardContent></Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 no-print">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4 space-y-4">
                {result.conversion_killers.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Priority Issues</CardTitle></CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {result.conversion_killers.map((k, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><span className="text-sm text-foreground">{k}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.page_audits.slice(0, 3).map((page, i) => (
                    <Card key={i} className={`border ${gradeBg(page.grade)}`}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{page.title}</span>
                          <span className={`text-lg font-black ${gradeColor(page.grade)}`}>{page.grade}</span>
                        </div>
                        <ScoreBar score={page.score} />
                        <div className="mt-2 space-y-1">
                          {page.issues.slice(0, 2).map((issue, ii) => (
                            <div key={ii} className="text-xs text-red-400 flex gap-1 items-start"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{issue}</div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="website" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Funnel Analysis</CardTitle></CardHeader>
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
                        {page.strengths.map((s, si) => <div key={si} className="flex gap-2 text-xs text-green-400"><CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />{s}</div>)}
                        {page.issues.map((issue, ii) => <div key={ii} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{issue}</div>)}
                        {page.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-yellow-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />{o}</div>)}
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
                        <div className="text-xs text-muted-foreground">{profile.handle}{profile.followers && <span className="ml-2 font-medium text-foreground">{profile.followers.toLocaleString()} followers</span>}</div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        {profile.gaps.map((g, gi) => <div key={gi} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{g}</div>)}
                        {profile.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-green-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />{o}</div>)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="audience" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-green-500" />Proactive Opportunities</h3>
                    {result.audience_opportunities.filter((o) => o.type === "proactive").map((opp, i) => (
                      <Card key={i} className="border-green-500/20"><CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div><div className="text-sm font-medium text-foreground">{opp.title}</div><div className="text-xs text-muted-foreground mt-0.5">{opp.description}</div></div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${priorityBadge(opp.priority)}`}>{opp.priority}</Badge>
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />Reactive Opportunities</h3>
                    {result.audience_opportunities.filter((o) => o.type === "reactive").map((opp, i) => (
                      <Card key={i} className="border-orange-500/20"><CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div><div className="text-sm font-medium text-foreground">{opp.title}</div><div className="text-xs text-muted-foreground mt-0.5">{opp.description}</div></div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${priorityBadge(opp.priority)}`}>{opp.priority}</Badge>
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roadmap" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.roadmap.map((phase, i) => (
                    <Card key={i}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary"><Clock className="w-3.5 h-3.5" />{phase.days}</div>
                        <CardTitle className="text-sm font-bold text-foreground">{phase.phase}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {phase.items.map((item, ii) => (
                          <div key={ii} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{item}</div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
