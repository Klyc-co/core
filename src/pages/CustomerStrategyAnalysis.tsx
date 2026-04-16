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
  BarChart2, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PlatformBattleView, { type PlatformBattle } from "@/components/strategy-intelligence/PlatformBattleView";
import CustomerDNACard, { type CustomerDNA } from "@/components/strategy-intelligence/CustomerDNACard";
import StrategyReasoningPanel, { type StrategyReasoning } from "@/components/strategy-intelligence/StrategyReasoningPanel";

const BACKEND_URL = "https://wkqiielsazzbxziqmgdb.supabase.co";
const BACKEND_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWlpZWxzYXp6Ynh6aXFtZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE3ODMsImV4cCI6MjA5MTA3Nzc4M30.HAoqLxzj_YdKXhldOzyjR4qaJHVLfaldMY_XKgf8htU";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PageAudit {
  title: string; grade: string; score: number;
  issues: string[]; strengths: string[]; opportunities: string[];
}
interface FunnelStage {
  name: string; description: string; conversion_points: number; blockers: string[];
}
interface SocialProfile {
  platform: string; handle: string; followers?: number;
  grade: string; score?: number; active: boolean;
  gaps: string[]; opportunities: string[];
}
interface AudienceOpportunity {
  type: "proactive" | "reactive"; title: string;
  description: string; priority: "high" | "medium" | "low";
}
interface RoadmapItem { phase: string; days: string; items: string[]; }
interface AnalysisResult {
  client_name: string; overall_score: number; overall_grade: string;
  summary: string; key_metrics: { label: string; value: string }[];
  page_audits: PageAudit[]; funnel_stages: FunnelStage[];
  conversion_killers: string[]; social_profiles: SocialProfile[];
  audience_opportunities: AudienceOpportunity[];
  roadmap: RoadmapItem[]; analyzed_at: string;
}
interface BrainDoc { data: any; document_type: string; }

// ─── Metric card types ────────────────────────────────────────────────────────

type GradeLevel = "green" | "yellow" | "red";

interface SubStat { label: string; score: number; }

interface MetricCardData {
  id: string;
  value: string;
  label: string;
  grade: GradeLevel;
  gradeLabel: "Good" | "Par" | "Focus Area";
  subStats: SubStat[];
  platforms?: string[];   // social channels only
  barScore?: number;      // shows a score bar under value
  source: string;
  isGradeLetter?: boolean; // large colored letter (overall grade)
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

const pageGradeColor = (g: string) => {
  if (g.startsWith("A")) return "text-green-500";
  if (g.startsWith("B")) return "text-blue-500";
  if (g.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
};
const pageGradeBg = (g: string) => {
  if (g.startsWith("A")) return "bg-green-500/10 border-green-500/20";
  if (g.startsWith("B")) return "bg-blue-500/10 border-blue-500/20";
  if (g.startsWith("C")) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
};
const priorityBadge = (p: string) => {
  if (p === "high")   return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
};
const barHex = (score: number) => score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

const dotClass = (g: GradeLevel) =>
  g === "green" ? "bg-green-500" : g === "yellow" ? "bg-yellow-500" : "bg-red-500";
const gradeBorderBg = (g: GradeLevel) =>
  g === "green" ? "bg-green-500/10 border-green-500/20"
  : g === "yellow" ? "bg-yellow-500/10 border-yellow-500/20"
  : "bg-red-500/10 border-red-500/20";
const gradeLetterColor = (g: GradeLevel) =>
  g === "green" ? "text-green-500" : g === "yellow" ? "text-yellow-500" : "text-red-500";
const gradeBadgeClass = (g: GradeLevel) =>
  g === "green" ? "text-green-600 dark:text-green-400 border-green-500/30"
  : g === "yellow" ? "text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
  : "text-red-500 border-red-500/30";

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ data }: { data: MetricCardData }) {
  const { value, label, grade, gradeLabel, subStats, platforms, barScore, source, isGradeLetter } = data;

  return (
    <Card className={isGradeLetter ? `border ${gradeBorderBg(grade)}` : ""}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className={isGradeLetter
            ? `text-4xl font-black leading-none ${gradeLetterColor(grade)}`
            : "text-2xl font-bold leading-tight text-foreground"
          }>
            {value}
          </div>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 shrink-0 mt-1 cursor-help">
                  <div className={`w-2 h-2 rounded-full ${dotClass(grade)}`} />
                  <Info className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground" />
                </div>
              </TooltipTrigger>

              <TooltipContent side="top" className="w-64 p-3" sideOffset={5}>
                <div className="space-y-2.5">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${gradeBadgeClass(grade)}`}>
                      {gradeLabel}
                    </span>
                  </div>

                  {/* Connected platform badges */}
                  {platforms && platforms.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1">
                        Connected Platforms
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {platforms.map(p => (
                          <span key={p} className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3 sub-stat progress bars */}
                  <div>
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1.5">
                      What drives this grade
                    </p>
                    <div className="space-y-2">
                      {subStats.map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">{s.label}</span>
                            <span className="font-mono font-semibold text-foreground">{s.score}%</span>
                          </div>
                          <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${s.score}%`, backgroundColor: barHex(s.score) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-primary/50 font-mono">Source: {source}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Grade dot + label */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass(grade)}`} />
          <p className="text-sm text-muted-foreground leading-snug">{label}</p>
        </div>

        {/* Optional score bar */}
        {barScore !== undefined && (
          <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(Math.max(barScore, 0), 100)}%`, backgroundColor: barHex(barScore) }}
            />
          </div>
        )}
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

// ─── Grade helpers ────────────────────────────────────────────────────────────

function scoreToGrade(score: number): { grade: GradeLevel; gradeLabel: "Good" | "Par" | "Focus Area" } {
  if (score >= 75) return { grade: "green",  gradeLabel: "Good" };
  if (score >= 50) return { grade: "yellow", gradeLabel: "Par" };
  return              { grade: "red",    gradeLabel: "Focus Area" };
}

function gradeLetterToScore(g: string): number {
  if (g.startsWith("A+")) return 97; if (g.startsWith("A")) return 90;
  if (g.startsWith("B+")) return 87; if (g.startsWith("B")) return 78;
  if (g.startsWith("C+")) return 67; if (g.startsWith("C")) return 60;
  if (g.startsWith("D"))  return 45; return 30;
}

// ─── Intelligence data builders ───────────────────────────────────────────────

function safeArr(v: any, limit = 6): string[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, limit).map(i => typeof i === "string" ? i : (i?.name ?? JSON.stringify(i).slice(0, 80)));
}
function safeStr(v: any, fb = ""): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return JSON.stringify(v).slice(0, 300);
  return fb;
}

function buildPlatformBattle(profiles: SocialProfile[]): PlatformBattle {
  const scored = profiles.map(p => ({ ...p, _s: p.score ?? gradeLetterToScore(p.grade) }));
  const sorted = [...scored].sort((a, b) => b._s - a._s);
  return {
    scores: Object.fromEntries(scored.map(p => [p.platform, p._s])),
    bestFirst: sorted[0]?.platform || "",
    customerRequested: profiles.filter(p => p.active).map(p => p.platform),
    systemRecommended: sorted.slice(0, 3).map(p => p.platform),
  };
}

function buildCustomerDNA(brainDocs: BrainDoc[], result: AnalysisResult): CustomerDNA {
  const bd = brainDocs.find(d => d.document_type === "brand")?.data;
  const ad = brainDocs.find(d => d.document_type === "audience")?.data;
  const cd = brainDocs.find(d => d.document_type === "competitor")?.data;
  const rd = brainDocs.find(d => d.document_type === "regulatory")?.data;
  const rawComp = cd?.competitors ?? (Array.isArray(cd) ? cd : []);
  return {
    brandVoice:        safeStr(bd?.brandVoice || bd?.brand_voice || bd?.voice || bd?.tone) || result.summary.slice(0, 280),
    audienceSegments:  safeArr(ad?.segments || ad?.audienceSegments || ad?.audience_segments || ad?.audiences),
    painPoints:        safeArr(ad?.painPoints || ad?.pain_points || bd?.painPoints || bd?.pain_points),
    proofPoints:       safeArr(bd?.proofPoints || bd?.proof_points || bd?.results || bd?.outcomes),
    regulations:       safeArr(rd?.regulations || rd?.rules || rd?.requirements || rd?.compliance),
    competitors:       safeArr(rawComp),
    semanticThemes:    safeArr(bd?.themes || bd?.semanticThemes || bd?.keywords || bd?.topics),
    trustSignals:      safeArr(bd?.trustSignals || bd?.trust_signals || bd?.credentials),
    compressedSourceCount: brainDocs.length,
  };
}

function buildStrategyReasoning(result: AnalysisResult): StrategyReasoning {
  const sorted = [...result.social_profiles].sort((a, b) => (b.score ?? gradeLetterToScore(b.grade)) - (a.score ?? gradeLetterToScore(a.grade)));
  const active   = result.social_profiles.filter(p => p.active).map(p => p.platform);
  const topThree = sorted.slice(0, 3).map(p => `${p.platform} (${p.grade})`);
  const reactive  = result.audience_opportunities.filter(o => o.type === "reactive").map(o => `${o.title}: ${o.description}`);
  const proactive = result.audience_opportunities.filter(o => o.type === "proactive").map(o => `${o.title}: ${o.description}`);
  return {
    whyThisApproach:        result.summary,
    customerRequested:      active.length ? `Active connections: ${active.join(", ")}. Strategy anchored to existing platform footprint.` : "No active social connections — strategy is foundational, focused on setup and first-publish.",
    systemRecommendation:   topThree.length ? `Prioritize ${topThree.join(", ")} based on scoring. ${sorted[0]?.opportunities?.[0] ?? ""}` : "Connect social platforms to generate data-driven channel recommendations.",
    reactiveOpportunities:  reactive.length ? reactive : result.conversion_killers.slice(0, 3),
    proactiveOpportunities: proactive,
    qrRoutingNotes: result.page_audits.filter(p => p.opportunities.length > 0).slice(0, 3).map(p => `${p.title}: ${p.opportunities[0]}`),
  };
}

// ─── Build all 10 metric cards from raw data ──────────────────────────────────

const BRAIN_DOC_TYPES = ["brand", "website", "strategy", "audience", "competitor", "regulatory"];

function buildMetricCards(
  result: AnalysisResult,
  brainDocs: BrainDoc[],
  socialConns: any[],
  postQueue: any[],
  totalPostCount: number,
): MetricCardData[] {

  // ── shared computations ─────────────────────────────────────────────────
  const publishedPosts = postQueue.filter(p => p.status === "published").length;
  const failedPosts    = postQueue.filter(p => p.status === "failed").length;
  const draftPosts     = postQueue.filter(p => ["draft", "pending"].includes(p.status)).length;
  const totalInQueue   = postQueue.length;
  const totalShown     = totalPostCount > 0 ? totalPostCount : totalInQueue;

  const foundDocs      = BRAIN_DOC_TYPES.filter(t => brainDocs.some(d => d.document_type === t));
  const docScore       = Math.round((foundDocs.length / BRAIN_DOC_TYPES.length) * 100);
  const activeSocial   = result.social_profiles.filter(p => p.active).length;
  const publishRate    = totalInQueue > 0 ? Math.round((publishedPosts / totalInQueue) * 100) : 0;

  // ── 1. Overall Grade ────────────────────────────────────────────────────
  const socialPresenceScore = Math.round(Math.min((activeSocial / 5) * 100, 100));
  const contentActivityScore = publishRate;
  const overallAvg = Math.round((docScore + socialPresenceScore + contentActivityScore) / 3);
  const overallGrade = result.overall_grade.startsWith("A") ? "green"
    : result.overall_grade.startsWith("B") ? "yellow" : "red" as GradeLevel;
  const overallGradeLabel = overallGrade === "green" ? "Good" : overallGrade === "yellow" ? "Par" : "Focus Area" as "Good" | "Par" | "Focus Area";

  // ── 2. Social Channels ──────────────────────────────────────────────────
  const connCount     = socialConns.length;
  const connScore     = Math.round(Math.min((connCount / 5) * 100, 100));
  const activeScore   = connCount > 0 ? Math.round((activeSocial / connCount) * 100) : 0;
  const b2b    = ["linkedin", "x", "twitter"].some(p => socialConns.some(c => c.platform?.toLowerCase().includes(p)));
  const social = ["instagram", "facebook", "tiktok"].some(p => socialConns.some(c => c.platform?.toLowerCase().includes(p)));
  const video  = ["youtube"].some(p => socialConns.some(c => c.platform?.toLowerCase().includes(p)));
  const diversityScore = (b2b ? 33 : 0) + (social ? 33 : 0) + (video ? 34 : 0);
  const socialChannelScore = Math.round((connScore + activeScore + diversityScore) / 3);
  const scGrade = scoreToGrade(socialChannelScore);

  // ── 3. Post History ─────────────────────────────────────────────────────
  const failScore    = totalInQueue > 0 ? Math.round(((totalInQueue - failedPosts) / totalInQueue) * 100) : 100;
  const queueHealth  = totalInQueue > 0 ? Math.round(((totalInQueue - draftPosts) / totalInQueue) * 100) : 0;
  const postGradeScore = Math.round((publishRate + failScore + queueHealth) / 3);
  const postGrade    = scoreToGrade(postGradeScore);

  // ── 4. Brand Docs ───────────────────────────────────────────────────────
  const coreFound     = ["brand", "website", "strategy"].filter(t => brainDocs.some(d => d.document_type === t)).length;
  const researchFound = ["audience", "competitor"].filter(t => brainDocs.some(d => d.document_type === t)).length;
  const compFound     = ["regulatory"].filter(t => brainDocs.some(d => d.document_type === t)).length;
  const coreScore     = Math.round((coreFound / 3) * 100);
  const researchScore = Math.round((researchFound / 2) * 100);
  const compScore     = Math.round((compFound / 1) * 100);
  const brainGrade    = scoreToGrade(docScore);

  // ── 5. Funnel Sections ──────────────────────────────────────────────────
  const auditCount    = result.page_audits.length;
  const avgAudit      = auditCount > 0 ? Math.round(result.page_audits.reduce((a, p) => a + p.score, 0) / auditCount) : 0;
  const highGrades    = result.page_audits.filter(p => p.grade.startsWith("A") || p.grade.startsWith("B")).length;
  const auditCoverage = Math.round(Math.min((auditCount / 5) * 100, 100));
  const auditPassRate = auditCount > 0 ? Math.round((highGrades / auditCount) * 100) : 0;
  const funnelScore   = Math.round((auditCoverage + avgAudit + auditPassRate) / 3);
  const funnelGrade   = scoreToGrade(funnelScore);

  // ── 6. Audience Opportunities ───────────────────────────────────────────
  const oppCount      = result.audience_opportunities.length;
  const highOpp       = result.audience_opportunities.filter(o => o.priority === "high").length;
  const proactCount   = result.audience_opportunities.filter(o => o.type === "proactive").length;
  const oppScore      = Math.round(Math.min((oppCount / 10) * 100, 100));
  const highOppScore  = oppCount > 0 ? Math.round((highOpp / oppCount) * 100) : 0;
  const proactScore   = oppCount > 0 ? Math.round((proactCount / oppCount) * 100) : 0;
  const oppGradeScore = Math.round((oppScore + highOppScore + proactScore) / 3);
  const oppGrade      = scoreToGrade(oppGradeScore);

  // ── 7. Roadmap Actions ──────────────────────────────────────────────────
  const totalActions = result.roadmap.reduce((acc, p) => acc + p.items.length, 0);
  const findPhase    = (days: string) => result.roadmap.find(p => p.days?.includes(days))?.items.length ?? 0;
  const p1 = Math.min(findPhase("1-30")  || findPhase("1–30"),  10) * 10;
  const p2 = Math.min(findPhase("31-60") || findPhase("31–60"), 10) * 10;
  const p3 = Math.min(findPhase("61-90") || findPhase("61–90"), 10) * 10;
  const roadmapScore = Math.round(Math.min((totalActions / 15) * 100, 100));
  const roadmapGrade = scoreToGrade(roadmapScore);

  // ── 8. Content Production Health ────────────────────────────────────────
  const recentFive    = postQueue.slice(0, 5);
  const recentPub     = recentFive.filter(p => p.status === "published").length;
  const successRate   = recentFive.length > 0 ? Math.round((recentPub / recentFive.length) * 100) : 0;
  const hasScheduled  = postQueue.filter(p => p.scheduled_at).length;
  const schedScore    = Math.round(Math.min((hasScheduled / 10) * 100, 100));
  const velocityScore = Math.round(Math.min((totalInQueue / 30) * 100, 100));
  const healthScore   = Math.round((successRate + schedScore + velocityScore) / 3);
  const healthGrade   = scoreToGrade(healthScore);

  // ── 9. 0–2 Hour Window ─────────────────────────────────────────────────
  const withTimes     = postQueue.filter(p => p.published_at && p.created_at);
  const quickPub      = withTimes.filter(p => {
    const diff = new Date(p.published_at).getTime() - new Date(p.created_at).getTime();
    return diff >= 0 && diff <= 2 * 60 * 60 * 1000;
  });
  const quickRate     = withTimes.length > 0 ? Math.round((quickPub.length / withTimes.length) * 100) : 0;
  const peakPosts     = postQueue.filter(p => {
    const t = p.published_at || p.scheduled_at;
    if (!t) return false;
    const h = new Date(t).getHours();
    return (h >= 8 && h <= 10) || (h >= 17 && h <= 19);
  });
  const peakCoverage  = totalInQueue > 0 ? Math.round((peakPosts.length / totalInQueue) * 100) : 0;
  const upcoming      = postQueue.filter(p => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) > new Date());
  const readiness     = Math.round(Math.min((upcoming.length / 5) * 100, 100));
  const twoHrScore    = Math.round((quickRate + peakCoverage + readiness) / 3);
  const twoHrGrade    = scoreToGrade(twoHrScore);
  const twoHrValue    = quickPub.length > 0 ? `${quickPub.length} quick` : "0 tracked";

  // ── 10. Visibility Improvement ─────────────────────────────────────────
  const half          = Math.floor(totalInQueue / 2);
  const older         = postQueue.slice(half);
  const newer         = postQueue.slice(0, half);
  const olderPub      = older.filter(p => p.status === "published").length;
  const newerPub      = newer.filter(p => p.status === "published").length;
  const trendScore    = (half > 0 && olderPub > 0) ? Math.min(Math.round((newerPub / olderPub) * 50), 100) : (newerPub > 0 ? 75 : 30);
  const platformsHit  = new Set(postQueue.filter(p => p.status === "published" && p.platform).map(p => p.platform));
  const reachScore    = connCount > 0 ? Math.round((Math.max(platformsHit.size, 1) / connCount) * 100) : (activeSocial > 0 ? 50 : 20);
  const consistScore  = Math.round(Math.min((totalInQueue / 30) * 100, 100));
  const visScore      = Math.round((trendScore + reachScore + consistScore) / 3);
  const visGrade      = scoreToGrade(visScore);
  const visValue      = visScore > 0 ? `+${visScore}%` : "—";

  // ── Assemble ────────────────────────────────────────────────────────────
  return [
    {
      id: "overall", value: result.overall_grade, label: "Overall Grade",
      grade: overallGrade, gradeLabel: overallGradeLabel,
      subStats: [
        { label: "Brand Completeness", score: docScore },
        { label: "Social Presence",    score: socialPresenceScore },
        { label: "Content Activity",   score: contentActivityScore },
      ],
      barScore: result.overall_score,
      source: "overall_score · strategy-analysis submind",
      isGradeLetter: true,
    },
    {
      id: "social", value: `${connCount}`, label: "Social Channels",
      ...scGrade,
      subStats: [
        { label: "Platforms Connected",  score: connScore },
        { label: "Active Rate",          score: activeScore },
        { label: "Platform Diversity",   score: diversityScore },
      ],
      platforms: socialConns.map(c => c.platform).filter(Boolean),
      source: "social_connections table · user_id",
    },
    {
      id: "posts", value: `${publishedPosts}/${totalShown}`, label: "Post History",
      ...postGrade,
      subStats: [
        { label: "Published Rate",    score: publishRate },
        { label: "No Failed Posts",   score: failScore },
        { label: "Queue Health",      score: queueHealth },
      ],
      source: "post_queue table · user_id",
    },
    {
      id: "brain", value: `${foundDocs.length}/6`, label: "Brand Docs",
      ...brainGrade,
      subStats: [
        { label: "Core (Brand / Web / Strategy)",  score: coreScore },
        { label: "Research (Audience / Competitor)", score: researchScore },
        { label: "Compliance (Regulatory)",        score: compScore },
      ],
      source: "client_brain table · document_type · user_id",
    },
    {
      id: "funnel", value: auditCount > 0 ? `${auditCount} sections` : "—", label: "Funnel Sections",
      ...funnelGrade,
      subStats: [
        { label: "Audit Coverage",       score: auditCoverage },
        { label: "Avg Section Quality",  score: avgAudit },
        { label: "High-Grade Sections",  score: auditPassRate },
      ],
      source: "page_audits[] · strategy-analysis submind",
    },
    {
      id: "opps", value: oppCount > 0 ? `${oppCount} found` : "0 found", label: "Audience Opportunities",
      ...oppGrade,
      subStats: [
        { label: "Opportunity Volume",    score: oppScore },
        { label: "High-Priority Signals", score: highOppScore },
        { label: "Proactive Coverage",    score: proactScore },
      ],
      source: "audience_opportunities[] · strategy-analysis submind",
    },
    {
      id: "roadmap", value: `${totalActions} actions`, label: "90-Day Roadmap",
      ...roadmapGrade,
      subStats: [
        { label: "Days 1–30 Actions",  score: p1 },
        { label: "Days 31–60 Actions", score: p2 },
        { label: "Days 61–90 Actions", score: p3 },
      ],
      source: "roadmap[] · strategy-analysis submind",
    },
    {
      id: "health", value: `${successRate}%`, label: "Content Health",
      ...healthGrade,
      subStats: [
        { label: "Recent Success Rate",  score: successRate },
        { label: "Scheduling Coverage",  score: schedScore },
        { label: "Content Velocity",     score: velocityScore },
      ],
      source: "post_queue · status · scheduled_at · user_id",
    },
    {
      id: "two_hour", value: twoHrValue, label: "0–2 Hour Window",
      ...twoHrGrade,
      subStats: [
        { label: "Quick-Publish Rate",   score: quickRate },
        { label: "Peak Hour Coverage",   score: peakCoverage },
        { label: "Response Readiness",   score: readiness },
      ],
      source: "post_queue · published_at vs created_at · scheduled_at",
    },
    {
      id: "visibility", value: visValue, label: "Visibility Improvement",
      ...visGrade,
      subStats: [
        { label: "Publishing Trend",    score: trendScore },
        { label: "Platform Reach",      score: reachScore },
        { label: "Posting Consistency", score: consistScore },
      ],
      source: "post_queue · social_connections · trend analysis",
    },
  ];
}

// ─── KLYC Demo data (used when brainDocs is empty) ───────────────────────────

const KLYC_DEMO_PLATFORM: PlatformBattle = {
  scores: { LinkedIn: 91, "X / Twitter": 83, Reddit: 74, YouTube: 68 },
  bestFirst: "LinkedIn",
  customerRequested: ["LinkedIn", "Instagram"],
  systemRecommended: ["LinkedIn", "X / Twitter", "Reddit"],
};

const KLYC_DEMO_DNA: CustomerDNA = {
  brandVoice:
    "Bold, precise, and unapologetically ambitious. Speaks to founders and operators who move at the speed of thought. Leads with outcomes, never features. Calls out noise for what it is — then eliminates it.",
  audienceSegments: [
    "Mid-market SaaS founders (Series A–B)",
    "Marketing directors at growth-stage companies (50–200 headcount)",
    "Solo operators scaling past $500k ARR",
    "Agency owners running 5+ client brands simultaneously",
  ],
  painPoints: [
    "Brand voice fractures across AI tools and platforms",
    "Manual campaign planning burns 10+ hours per week",
    "No unified brand memory between AI sessions",
    "Published posts don't reflect actual brand standards",
    "Competitors move faster because they're AI-native already",
  ],
  proofPoints: [
    "3x average engagement lift in pilot programs",
    "First campaign draft in under 60 seconds",
    "40% reduction in planning time vs. traditional tools",
    "Brand consistency score improves 2 letter grades after 30 days",
  ],
  regulations: [
    "FTC disclosure for AI-generated content",
    "GDPR email consent for subscriber campaigns",
    "CCPA opt-out compliance for California users",
    "Platform-specific ad policies (Meta, LinkedIn, X)",
  ],
  competitors: ["Jasper", "Copy.ai", "HubSpot Content Hub", "Sprout Social", "Buffer", "Hootsuite"],
  semanticThemes: [
    "AI-native marketing",
    "brand compression",
    "Kill Noise Protocol",
    "brand memory",
    "signal vs. noise",
    "autonomous campaigns",
  ],
  trustSignals: [
    "KNP Ψ3 compression architecture",
    "Zero data sharing with third parties",
    "Client brain library encrypted at rest",
    "Built for compliance from day one",
  ],
  compressedSourceCount: 247,
};

const KLYC_DEMO_STRATEGY: StrategyReasoning = {
  whyThisApproach:
    "KLYC is operating in the AI marketing tools category at a pivotal moment — competitors are adding AI features to legacy infrastructure while KLYC is building AI-native from the ground up. The challenger narrative works because the proof points are verifiable and the KNP compression architecture is genuinely differentiated. The 22-channel footprint creates a surface area advantage most competitors can't match, but requires orchestration to activate at full potential.",
  customerRequested:
    "Broad brand awareness campaign across LinkedIn and Instagram targeting founder and marketing director audiences with educational content about AI-native marketing automation and brand consistency at scale.",
  systemRecommendation:
    "Prioritize LinkedIn (91) + X / Twitter (83) for B2B authority and Reddit (74) for community trust-building. Instagram deprioritized for B2B SaaS — engagement quality is lower for enterprise buyers. Add YouTube as secondary channel for product demo and long-form thought leadership.",
  reactiveOpportunities: [
    "Jasper and Copy.ai facing pricing pushback — window open for competitive value positioning",
    "HubSpot Content Hub averaging 3-star reviews on G2 this month — contrast messaging opportunity",
    "AI content detection tools creating anxiety in the market — position KLYC as brand-authentic AI",
    "ChatGPT marketing use growing fast — users want branded outputs, not generic ones",
  ],
  proactiveOpportunities: [
    "Launch 'Brand Memory' as a new category term before competitors adopt the language",
    "Q2 budget season — create ROI calculator comparing manual vs. KLYC campaign planning time",
    "AI regulation discussion heating up — position as the compliant-first AI marketing platform",
    "Founder-led content outperforming brand content — activate as brand voice on LinkedIn",
  ],
  qrRoutingNotes: [
    "Demo QR codes at events should route to pre-filled brand context pages (compressed with KNP Ψ3)",
    "WhatsApp routing recommended for enterprise prospects — higher close rate than cold email",
    "Use campaign QR codes to capture audience segment data and auto-populate brain library entries",
  ],
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerStrategyAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState<AnalysisResult | null>(null);
  const [brainDocs, setBrainDocs]         = useState<BrainDoc[]>([]);
  const [socialConns, setSocialConns]     = useState<any[]>([]);
  const [postQueue, setPostQueue]         = useState<any[]>([]);
  const [totalPostCount, setTotalPostCount] = useState(0);
  const [activeTab, setActiveTab]         = useState("summary");
  const [intelTab, setIntelTab]           = useState("dna");
  const [brandName, setBrandName]         = useState<string>("");

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const userId = user.id;

      const [profileRes, brainRes, socialRes, postRes, countRes] = await Promise.all([
        supabase.from("client_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("client_brain").select("data, document_type").eq("user_id", userId).limit(30),
        supabase.from("social_connections").select("platform, platform_username, platform_user_id, created_at").eq("user_id", userId),
        supabase.from("post_queue").select("id, content_type, post_text, status, scheduled_at, published_at, created_at, platform").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("post_queue").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const profile = profileRes.data;
      const brain   = brainRes.data  || [];
      const socials = socialRes.data || [];
      const posts   = postRes.data   || [];
      const count   = countRes.count ?? 0;

      setBrainDocs(brain);
      setSocialConns(socials);
      setPostQueue(posts);
      setTotalPostCount(count);

      const find = (type: string) => brain.find((d) => d.document_type === type)?.data || null;
      if (profile?.business_name) setBrandName(profile.business_name);

      const res = await fetch(`${BACKEND_URL}/functions/v1/strategy-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${BACKEND_ANON}`, "apikey": BACKEND_ANON },
        body: JSON.stringify({
          user_id: userId,
          client_name: profile?.business_name || user.email?.split("@")[0] || "Your Brand",
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
          social_connections: socials,
          post_history:       posts,
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
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

  // Build metric cards from raw data (not from result.key_metrics text)
  const metricCards = result
    ? buildMetricCards(result, brainDocs, socialConns, postQueue, totalPostCount)
    : [];

  // Intelligence panel data — use KLYC demo data when brainDocs is empty
  const useDemoIntel   = brainDocs.length === 0;
  const platformBattle = result
    ? (result.social_profiles.length > 0 ? buildPlatformBattle(result.social_profiles) : KLYC_DEMO_PLATFORM)
    : undefined;
  const customerDNA    = result ? (useDemoIntel ? KLYC_DEMO_DNA      : buildCustomerDNA(brainDocs, result)) : undefined;
  const strategyRsn    = result ? (useDemoIntel ? KLYC_DEMO_STRATEGY : buildStrategyReasoning(result))       : undefined;

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
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Analyzing…</> : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Re-analyze</>}
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

            {/* ── 10-card metric grid ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {metricCards.map(card => <MetricCard key={card.id} data={card} />)}
            </div>

            {/* Summary sentence */}
            <Card>
              <CardContent className="py-4 px-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>

            {/* ── 5-tab analysis section ──────────────────────────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 no-print">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              </TabsList>

              {/* Summary */}
              <TabsContent value="summary" className="mt-4 space-y-4">
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
                {result.page_audits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.page_audits.slice(0, 3).map((page, i) => (
                      <Card key={i} className={`border ${pageGradeBg(page.grade)}`}>
                        <CardContent className="py-4 px-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{page.title}</span>
                            <span className={`text-lg font-black ${pageGradeColor(page.grade)}`}>{page.grade}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${page.score}%`, backgroundColor: barHex(page.score) }} />
                          </div>
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
                    <CardContent className="py-6">
                      <EmptyState icon={<Target className="w-8 h-8" />} message="No funnel audit data this run" sub="Add a website URL to your brand profile and re-analyze to get page-level grades." />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Website */}
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
                      <Card key={i} className={`border ${pageGradeBg(page.grade)}`}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">{page.title}</CardTitle>
                            <span className={`text-xl font-black ${pageGradeColor(page.grade)}`}>{page.grade}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${page.score}%`, backgroundColor: barHex(page.score) }} />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-1">
                          {page.strengths.map((s, si)    => <div key={si} className="flex gap-2 text-xs text-green-400"><CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />{s}</div>)}
                          {page.issues.map((issue, ii)   => <div key={ii} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{issue}</div>)}
                          {page.opportunities.map((o, oi) => <div key={oi} className="flex gap-2 text-xs text-yellow-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />{o}</div>)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Target className="w-10 h-10" />} message="No page audits returned" sub="Add a website URL to your profile and re-analyze." />
                )}
              </TabsContent>

              {/* Social */}
              <TabsContent value="social" className="mt-4 space-y-5">
                <PlatformBattleView data={platformBattle} />
                {result.social_profiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.social_profiles.map((profile, i) => (
                      <Card key={i} className={`border ${pageGradeBg(profile.grade)}`}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">{profile.platform}</CardTitle>
                            <div className="flex items-center gap-2">
                              {!profile.active && <Badge variant="outline" className="text-xs text-red-400 border-red-500/30">Inactive</Badge>}
                              <span className={`text-xl font-black ${pageGradeColor(profile.grade)}`}>{profile.grade}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {profile.handle}
                            {profile.followers && <span className="ml-2 font-medium text-foreground">{profile.followers.toLocaleString()} followers</span>}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-1">
                          {profile.gaps.map((g, gi)          => <div key={gi} className="flex gap-2 text-xs text-red-400"><XCircle className="w-3 h-3 mt-0.5 shrink-0" />{g}</div>)}
                          {profile.opportunities.map((o, oi)  => <div key={oi} className="flex gap-2 text-xs text-green-400"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />{o}</div>)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<BarChart2 className="w-10 h-10" />} message="No social profile data returned" sub="Connect social accounts in Settings and re-analyze." />
                )}
              </TabsContent>

              {/* Audience */}
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
                  <EmptyState icon={<Zap className="w-10 h-10" />} message="No audience opportunities detected" sub="Upload audience, competitor, and brand documents to your brain library, then re-analyze." />
                )}
              </TabsContent>

              {/* Roadmap */}
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
                  <EmptyState icon={<Clock className="w-10 h-10" />} message="No 90-day roadmap generated" sub="Add brand context docs and re-analyze to generate sequenced actions." />
                )}
              </TabsContent>
            </Tabs>

            {/* ── Brand Intelligence — 3-tab bottom section ───────────────────── */}
            <div className="border-t border-border/60 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Brand Intelligence</h2>
                <Badge variant="outline" className="text-xs font-mono">
                  {brainDocs.length} brain docs · {socialConns.length} platforms
                </Badge>
              </div>
              <Tabs value={intelTab} onValueChange={setIntelTab}>
                <TabsList className="grid w-full grid-cols-3 no-print mb-4">
                  <TabsTrigger value="dna">Customer DNA</TabsTrigger>
                  <TabsTrigger value="strategy">Strategy Reasoning</TabsTrigger>
                  <TabsTrigger value="platform">Platform Battle</TabsTrigger>
                </TabsList>
                <TabsContent value="dna">
                  <CustomerDNACard data={customerDNA} />
                </TabsContent>
                <TabsContent value="strategy">
                  <StrategyReasoningPanel data={strategyRsn} />
                </TabsContent>
                <TabsContent value="platform">
                  <PlatformBattleView data={platformBattle} />
                </TabsContent>
              </Tabs>
            </div>

            <p className="text-xs text-muted-foreground text-right no-print">
              Analyzed: {new Date(result.analyzed_at).toLocaleString()} · {result.client_name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
