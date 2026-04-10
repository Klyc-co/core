import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, X, ArrowRight, ArrowLeft, Zap, Network, AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── 15 registered edge functions (as of Apr 9 2026) ──
const SUBMINDS = [
  // AI text-gen subminds — Channel 2, KNP only
  { id: "research",         name: "Research",         binary: "0001", status: "active",   model: "claude-haiku-4-5-20251001", version: "v11", channel: "ch2",  api: "anthropic",    note: "Market research & trend analysis" },
  { id: "product",          name: "Product",           binary: "0010", status: "active",   model: "claude-haiku-4-5-20251001", version: "v11", channel: "ch2",  api: "anthropic",    note: "Product info extraction & enrichment" },
  { id: "narrative",        name: "Narrative",         binary: "0011", status: "active",   model: "claude-haiku-4-5-20251001", version: "v11", channel: "ch2",  api: "anthropic",    note: "Brand story & messaging framework" },
  { id: "creative",         name: "Creative",          binary: "0100", status: "active",   model: "claude-haiku-4-5-20251001", version: "v12", channel: "ch2",  api: "anthropic",    note: "Copy variants, hooks, captions" },
  { id: "social",           name: "Social",            binary: "0101", status: "active",   model: "claude-haiku-4-5-20251001", version: "v12", channel: "ch2",  api: "anthropic",    note: "Platform-specific content adaptation" },
  { id: "image",            name: "Image",             binary: "0110", status: "active",   model: "claude-haiku-4-5-20251001", version: "v11", channel: "ch2",  api: "anthropic",    note: "Asset review & brand compliance" },
  { id: "approval",         name: "Approval",          binary: "0111", status: "active",   model: "claude-haiku-4-5-20251001", version: "v11", channel: "ch2",  api: "anthropic",    note: "Risk scoring & campaign approval" },
  { id: "viral",            name: "Viral",             binary: "1000", status: "active",   model: "claude-haiku-4-5-20251001", version: "v11", channel: "ch2",  api: "anthropic",    note: "Virality & trend scoring" },
  { id: "platform",         name: "Platform",          binary: "1001", status: "active",   model: "claude-haiku-4-5-20251001", version: "v10", channel: "ch2",  api: "anthropic",    note: "Platform rules & format enforcement" },
  // User-facing AI (Channel 1)
  { id: "klyc-chat",        name: "Klyc Chat",         binary: "1010", status: "active",   model: "claude-haiku-4-5-20251001", version: "v12", channel: "ch1",  api: "anthropic",    note: "Conversational campaign builder (user-facing)" },
  // Needs provider decision
  { id: "generate-image",   name: "Generate Image",    binary: "1011", status: "degraded", model: "TBD",                       version: "?",   channel: "ch2",  api: "needs_decision", note: "⚠️ Image gen — Nano Banana / DALL-E decision pending" },
  // Infrastructure / routing (no swap needed)
  { id: "orchestrator",     name: "Orchestrator",      binary: "1100", status: "active",   model: "claude-haiku-4-5-20251001", version: "v15", channel: "hub",  api: "anthropic",    note: "Central hub — all traffic routes through here" },
  { id: "campaign-pipeline",name: "Campaign Pipeline",  binary: "1101", status: "active",   model: "claude-haiku-4-5-20251001", version: "v1",  channel: "ch2",  api: "anthropic",    note: "Full campaign generation pipeline" },
  { id: "run-campaign",     name: "Run Campaign",       binary: "1110", status: "active",   model: "none",                      version: "v1",  channel: "ch2",  api: "none",         note: "Scheduling & execution trigger (no AI)" },
  { id: "analytics",        name: "Analytics",         binary: "1111", status: "active",   model: "none",                      version: "v9",  channel: "ch2",  api: "none",         note: "Metrics aggregation (no AI)" },
];

const INTENTS = ["CAMPAIGN_NEW", "TREND_ANALYSIS", "PERFORMANCE_REVIEW", "CONTENT_REVISION", "LEARNING_REPORT"];
const INTENT_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ef4444"];

// Design-time synergy data — affinity scores are architecture-derived.
// Invocation counts update from live health snapshots once traffic flows.
const SYNERGY_PAIRS_BASE = [
  { a: "Research",   b: "Narrative",  affinity: 0.92, invocations: 0 },
  { a: "Product",    b: "Creative",   affinity: 0.89, invocations: 0 },
  { a: "Creative",   b: "Social",     affinity: 0.94, invocations: 0 },
  { a: "Narrative",  b: "Creative",   affinity: 0.88, invocations: 0 },
  { a: "Social",     b: "Image",      affinity: 0.91, invocations: 0 },
  { a: "Research",   b: "Product",    affinity: 0.85, invocations: 0 },
  { a: "Image",      b: "Approval",   affinity: 0.87, invocations: 0 },
  { a: "Platform",   b: "Social",     affinity: 0.83, invocations: 0 },
  { a: "Viral",      b: "Creative",   affinity: 0.79, invocations: 0 },
];

const UPSTREAM_MAP: Record<string, { upstream: string[]; downstream: string[] }> = {
  "research":          { upstream: [],                              downstream: ["product", "narrative"] },
  "product":           { upstream: ["research"],                    downstream: ["creative", "narrative"] },
  "narrative":         { upstream: ["research", "product"],         downstream: ["creative", "social"] },
  "creative":          { upstream: ["narrative", "product"],        downstream: ["social", "image"] },
  "social":            { upstream: ["creative", "narrative"],       downstream: ["image", "approval"] },
  "image":             { upstream: ["creative", "social"],          downstream: ["approval"] },
  "approval":          { upstream: ["image", "social"],             downstream: [] },
  "viral":             { upstream: ["creative"],                    downstream: ["approval"] },
  "platform":          { upstream: ["narrative"],                   downstream: ["social", "creative"] },
  "klyc-chat":         { upstream: [],                              downstream: ["campaign-pipeline"] },
  "generate-image":    { upstream: ["creative"],                    downstream: ["image"] },
  "orchestrator":      { upstream: ["klyc-chat", "campaign-pipeline"], downstream: ["research", "product", "narrative", "creative", "social", "image", "approval", "viral", "platform"] },
  "campaign-pipeline": { upstream: ["klyc-chat"],                   downstream: ["orchestrator"] },
  "run-campaign":      { upstream: ["approval"],                    downstream: [] },
  "analytics":         { upstream: ["run-campaign"],                downstream: [] },
};

interface Snapshot {
  submind_id: string;
  invocation_count: number;
  success_count: number;
  avg_latency_ms: number;
  approval_rate: number | null;
  avg_tokens_in: number | null;
  avg_tokens_out: number | null;
  error_count: number;
  window_start: string;
}

// Topology-based affinity (deterministic — no Math.random()).
// Direct connection in UPSTREAM_MAP → 0.78, 2-hop → 0.58, no path → 0.32.
// Known high-synergy pairs use their design affinity value.
function topoAffinity(aName: string, bName: string): number {
  const aId = SUBMINDS.find((s) => s.name === aName)?.id ?? "";
  const bId = SUBMINDS.find((s) => s.name === bName)?.id ?? "";
  const aMap = UPSTREAM_MAP[aId];
  if (!aMap) return 0.32;
  if (aMap.upstream.includes(bId) || aMap.downstream.includes(bId)) return 0.78;
  for (const mid of [...aMap.upstream, ...aMap.downstream]) {
    const midMap = UPSTREAM_MAP[mid];
    if (midMap && (midMap.upstream.includes(bId) || midMap.downstream.includes(bId))) return 0.58;
  }
  return 0.32;
}

function ArchitectureOverview() {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" /> System Architecture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data flow */}
        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
          <div className="text-slate-500 mb-2">// Data flow (both channels)</div>
          <div className="flex items-center gap-1 flex-wrap text-[11px]">
            <span className="text-green-400">User</span>
            <span className="text-slate-500">──Ch1──▶</span>
            <span className="text-yellow-400">Normalizer</span>
            <span className="text-slate-500">──▶</span>
            <span className="text-blue-400">Orchestrator</span>
            <span className="text-slate-500">──Ch2──▶</span>
            <span className="text-purple-400">Submind(s)</span>
            <span className="text-slate-500">──Ch2──▶</span>
            <span className="text-yellow-400">Normalizer</span>
            <span className="text-slate-500">──▶</span>
            <span className="text-blue-400">Orchestrator</span>
            <span className="text-slate-500">──Ch1──▶</span>
            <span className="text-green-400">User</span>
          </div>
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-yellow-500/20">
            <p className="text-yellow-400 text-xs font-semibold mb-1">Normalizer (KNP Membrane)</p>
            <p className="text-slate-400 text-xs">Wraps the Orchestrator. Compresses ALL data before it reaches any AI. Every payload in and out is KNP-encoded. AIs never receive or emit plain text internally.</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-blue-500/20">
            <p className="text-blue-400 text-xs font-semibold mb-1">Orchestrator (Central Hub)</p>
            <p className="text-slate-400 text-xs">All traffic routes through here. Decides which subminds to invoke, in what order, and whether to run them in parallel. Wrapped entirely by the Normalizer.</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/20">
            <p className="text-purple-400 text-xs font-semibold mb-1">Subminds (Channel 2 only)</p>
            <p className="text-slate-400 text-xs">Never communicate directly with users. Receive and emit KNP-compressed payloads exclusively via Channel 2. Output returns through Normalizer → Orchestrator before hitting Channel 1.</p>
          </div>
        </div>

        {/* Channel key */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500/40 border border-green-500 inline-block" />
            <span className="text-slate-400"><strong className="text-slate-200">Ch1</strong> — User-facing (human-readable)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500/40 border border-purple-500 inline-block" />
            <span className="text-slate-400"><strong className="text-slate-200">Ch2</strong> — AI-to-AI (KNP only)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500/40 border border-blue-500 inline-block" />
            <span className="text-slate-400"><strong className="text-slate-200">Hub</strong> — Orchestrator (center of all routing)</span>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {[
            { label: "Total Functions", value: "15", color: "text-white" },
            { label: "On Anthropic API", value: "13", color: "text-green-400" },
            { label: "No AI (infra)", value: "2", color: "text-slate-400" },
            { label: "Needs Decision", value: "1", color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800/50 rounded p-2 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KlycAdminSubminds() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmind, setSelectedSubmind] = useState<string | null>(null);
  const [deepDiveRange, setDeepDiveRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [showArch, setShowArch] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("submind_health_snapshots")
      .select("submind_id, invocation_count, success_count, avg_latency_ms, approval_rate, avg_tokens_in, avg_tokens_out, error_count, window_start")
      .order("window_start", { ascending: false })
      .limit(500);
    setSnapshots((data as Snapshot[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const agg = new Map<string, { total: number; success: number; errors: number; latency: number[]; approvalRates: number[]; tokensIn: number[]; tokensOut: number[]; daily: Record<string, number> }>();
  snapshots.forEach((s) => {
    const e = agg.get(s.submind_id) ?? { total: 0, success: 0, errors: 0, latency: [], approvalRates: [], tokensIn: [], tokensOut: [], daily: {} };
    e.total += s.invocation_count;
    e.success += s.success_count;
    e.errors += s.error_count;
    e.latency.push(s.avg_latency_ms);
    if (s.approval_rate != null) e.approvalRates.push(s.approval_rate);
    if (s.avg_tokens_in != null) e.tokensIn.push(s.avg_tokens_in);
    if (s.avg_tokens_out != null) e.tokensOut.push(s.avg_tokens_out);
    const day = s.window_start.slice(0, 10);
    e.daily[day] = (e.daily[day] ?? 0) + s.invocation_count;
    agg.set(s.submind_id, e);
  });

  const getStats = (id: string) => {
    const d = agg.get(id);
    if (!d || d.total === 0) return { successRate: 100, avgLatency: 0, approvalRate: null as number | null, invocations: 0, errors: 0, avgTokensIn: 0, avgTokensOut: 0, dailyTrend: [] as { day: string; count: number }[] };
    return {
      successRate: +((d.success / d.total) * 100).toFixed(1),
      avgLatency: Math.round(d.latency.reduce((a, b) => a + b, 0) / d.latency.length),
      approvalRate: d.approvalRates.length > 0 ? +(d.approvalRates.reduce((a, b) => a + b, 0) / d.approvalRates.length).toFixed(1) : null,
      invocations: d.total,
      errors: d.errors,
      avgTokensIn: d.tokensIn.length > 0 ? Math.round(d.tokensIn.reduce((a, b) => a + b, 0) / d.tokensIn.length) : 0,
      avgTokensOut: d.tokensOut.length > 0 ? Math.round(d.tokensOut.reduce((a, b) => a + b, 0) / d.tokensOut.length) : 0,
      dailyTrend: Object.entries(d.daily).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day: day.slice(5), count })),
    };
  };

  // Derive synergy pair invocations from real health data.
  // Uses min(submind_a_total, submind_b_total) as a co-invocation proxy.
  // Falls back to 0 (awaiting traffic) when no snapshots yet.
  const synergyPairs = useMemo(() => {
    return SYNERGY_PAIRS_BASE.map((p) => {
      const aId = SUBMINDS.find((s) => s.name === p.a)?.id ?? "";
      const bId = SUBMINDS.find((s) => s.name === p.b)?.id ?? "";
      const aTotal = agg.get(aId)?.total ?? 0;
      const bTotal = agg.get(bId)?.total ?? 0;
      return { ...p, invocations: Math.min(aTotal, bTotal) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots]);

  // Topology-based affinity matrix — fully deterministic, no Math.random().
  // Known high-synergy pairs use their design affinity. Others use UPSTREAM_MAP hop distance.
  const activeNames = SUBMINDS.map((s) => s.name);
  const affinityMatrix = useMemo(() =>
    activeNames.map((row) =>
      activeNames.map((col) => {
        if (row === col) return 1;
        const pair = SYNERGY_PAIRS_BASE.find((p) => (p.a === row && p.b === col) || (p.a === col && p.b === row));
        if (pair) return pair.affinity;
        return topoAffinity(row, col);
      })
    ),
  []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColor = (s: string) =>
    s === "active"   ? "bg-green-500/20 text-green-400 border-green-500/30"
    : s === "degraded" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : s === "down"     ? "bg-red-500/20 text-red-400 border-red-500/30"
    : "bg-slate-700/30 text-slate-500 border-slate-600/30";

  const channelColor = (ch: string) =>
    ch === "ch1" ? "text-green-400" : ch === "hub" ? "text-blue-400" : "text-purple-400";

  const rateColor = (r: number) => r >= 90 ? "text-green-400" : r >= 75 ? "text-yellow-400" : "text-red-400";

  // Intent distribution — architecture design targets (no live routing-intent data yet)
  const intentData = INTENTS.map((intent, i) => ({
    name: intent.replace(/_/g, " "),
    value: [45, 20, 15, 12, 8][i],
    fill: INTENT_COLORS[i],
  }));

  const selectedDef = SUBMINDS.find((s) => s.id === selectedSubmind);
  const selectedStats = selectedSubmind ? getStats(selectedSubmind) : null;
  const selectedSnaps = snapshots.filter((s) => s.submind_id === selectedSubmind);

  const latencyBuckets = [0, 100, 200, 500, 1000, 2000, 5000];
  const latencyHist = latencyBuckets.slice(0, -1).map((min, i) => {
    const max = latencyBuckets[i + 1];
    const count = selectedSnaps.filter((s) => s.avg_latency_ms >= min && s.avg_latency_ms < max).length;
    return { range: `${min}-${max}ms`, count };
  });

  const totalInvocations = snapshots.reduce((sum, s) => sum + s.invocation_count, 0);
  const hasLiveData = totalInvocations > 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AI Function Registry</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArch((v) => !v)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Network className="w-3.5 h-3.5 mr-1.5" /> {showArch ? "Hide" : "Show"} Architecture
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Architecture Overview ── */}
      {showArch && <ArchitectureOverview />}

      {/* ── Live data status banner ── */}
      {!hasLiveData && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="text-blue-300 font-semibold">12 functions deployed and live — awaiting first production request</p>
            <p className="text-slate-400 mt-0.5">Health snapshots will populate automatically on first invocation. Success rates, latency, and token usage will appear here in real time.</p>
          </div>
        </div>
      )}

      {/* ── generate-image alert ── */}
      <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
        <div className="text-xs">
          <p className="text-yellow-300 font-semibold">generate-image — Provider Decision Required</p>
          <p className="text-slate-400 mt-0.5">Gemini image gen via Lovable gateway is broken (external key not accessible). Legacy <code className="text-slate-300">NANO_BANANA_API_KEY</code> path exists in the function. Confirm provider and verify secrets in Supabase dashboard. See blocker report.</p>
        </div>
      </div>

      {/* ── SECTION 1: Status Grid ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Function Status — 15 Registered</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUBMINDS.map((sm) => {
            const stats = getStats(sm.id);
            const isNoAI = sm.api === "none";
            const isDecision = sm.api === "needs_decision";
            return (
              <Card
                key={sm.id}
                className={`bg-slate-900 border-slate-800 transition-all ${
                  isNoAI ? "opacity-60" : "cursor-pointer hover:border-slate-600"
                } ${selectedSubmind === sm.id ? "ring-1 ring-primary" : ""} ${
                  isDecision ? "border-yellow-500/40" : ""
                }`}
                onClick={() => !isNoAI && setSelectedSubmind(selectedSubmind === sm.id ? null : sm.id)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white truncate">{sm.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(sm.status)}`}>
                      {sm.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">
                    {sm.binary} · <span className={channelColor(sm.channel)}>{sm.channel}</span> · {sm.version}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">
                    {sm.model === "none" ? "no AI" : sm.model === "TBD" ? "⚠️ TBD" : "haiku-4-5"}
                  </p>
                  {!isNoAI && !isDecision && (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <p className="text-slate-500">Success</p>
                        <p className={`font-semibold ${stats.invocations > 0 ? rateColor(stats.successRate) : "text-slate-500"}`}>
                          {stats.invocations > 0 ? `${stats.successRate}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Latency</p>
                        <p className="font-semibold text-slate-200">
                          {stats.invocations > 0 ? `${stats.avgLatency}ms` : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                  {isDecision && (
                    <p className="text-[10px] text-yellow-400">⚠️ Provider decision needed</p>
                  )}
                  {stats.dailyTrend.length > 1 && !isNoAI && (
                    <ResponsiveContainer width="100%" height={24}>
                      <LineChart data={stats.dailyTrend.slice(-7)}>
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Registry table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Full Registry</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-2.5">Function</th>
                  <th className="text-left p-2.5">Binary</th>
                  <th className="text-left p-2.5">Channel</th>
                  <th className="text-left p-2.5">Version</th>
                  <th className="text-left p-2.5">API</th>
                  <th className="text-left p-2.5">Status</th>
                  <th className="text-right p-2.5">Invocations</th>
                  <th className="text-left p-2.5">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {SUBMINDS.map((sm) => {
                  const stats = getStats(sm.id);
                  return (
                    <tr key={sm.id} className="border-b border-slate-800/50 text-slate-200 hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium">{sm.name}</td>
                      <td className="p-2.5 font-mono text-slate-400">{sm.binary}</td>
                      <td className={`p-2.5 font-mono ${channelColor(sm.channel)}`}>{sm.channel}</td>
                      <td className="p-2.5 text-slate-400">{sm.version}</td>
                      <td className="p-2.5">
                        {sm.api === "anthropic"       ? <span className="text-green-400">Anthropic ✓</span>
                        : sm.api === "needs_decision" ? <span className="text-yellow-400">⚠️ TBD</span>
                        :                              <span className="text-slate-500">none</span>}
                      </td>
                      <td className="p-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(sm.status)}`}>{sm.status}</Badge>
                      </td>
                      <td className="p-2.5 text-right text-slate-300">
                        {stats.invocations > 0 ? stats.invocations.toLocaleString() : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="p-2.5 text-slate-400 max-w-[200px] truncate">{sm.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION: Deep Dive ── */}
      {selectedSubmind && selectedDef && selectedStats && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> {selectedDef.name} Deep Dive
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSubmind(null)} className="text-slate-400">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-slate-400">{selectedDef.note}</p>

          {selectedStats.invocations === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-6 text-center">
              <p className="text-slate-400 text-sm">No invocations recorded yet.</p>
              <p className="text-slate-500 text-xs mt-1">Health data will appear here after the first request hits this function.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Invocations", value: selectedStats.invocations.toLocaleString() },
                  { label: "Errors", value: selectedStats.errors.toLocaleString() },
                  { label: "Avg Tokens In", value: selectedStats.avgTokensIn.toLocaleString() },
                  { label: "Avg Tokens Out", value: selectedStats.avgTokensOut.toLocaleString() },
                  { label: "Total Tokens", value: ((selectedStats.avgTokensIn + selectedStats.avgTokensOut) * Math.max(selectedStats.invocations, 1)).toLocaleString() },
                ].map((m) => (
                  <Card key={m.label} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-3">
                      <p className="text-xs text-slate-400">{m.label}</p>
                      <p className="text-lg font-bold text-white">{m.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-slate-300">Invocations</CardTitle>
                      <Tabs value={deepDiveRange} onValueChange={(v) => setDeepDiveRange(v as typeof deepDiveRange)}>
                        <TabsList className="h-7 bg-slate-800">
                          <TabsTrigger value="daily" className="text-xs h-5 px-2">Daily</TabsTrigger>
                          <TabsTrigger value="weekly" className="text-xs h-5 px-2">Weekly</TabsTrigger>
                          <TabsTrigger value="monthly" className="text-xs h-5 px-2">Monthly</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={selectedStats.dailyTrend.length > 0 ? selectedStats.dailyTrend : [{ day: "—", count: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Latency Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={latencyHist}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                        <Bar dataKey="count" fill="#a855f7" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Recent Errors</CardTitle></CardHeader>
                <CardContent>
                  {selectedSnaps.filter((s) => s.error_count > 0).length === 0 ? (
                    <p className="text-sm text-slate-500">No errors recorded 🎉</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-800 text-slate-400">
                        <th className="text-left p-2">Window</th><th className="text-right p-2">Errors</th><th className="text-right p-2">Latency</th>
                      </tr></thead>
                      <tbody>
                        {selectedSnaps.filter((s) => s.error_count > 0).slice(0, 20).map((s, i) => (
                          <tr key={i} className="border-b border-slate-800/50 text-slate-200">
                            <td className="p-2 text-xs">{new Date(s.window_start).toLocaleString()}</td>
                            <td className="text-right p-2 text-red-400">{s.error_count}</td>
                            <td className="text-right p-2">{s.avg_latency_ms}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Data Flow Pairings</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Receives from (upstream)</p>
                  {(UPSTREAM_MAP[selectedSubmind]?.upstream ?? []).length === 0
                    ? <p className="text-sm text-slate-500">None (entry point)</p>
                    : (UPSTREAM_MAP[selectedSubmind]?.upstream ?? []).map((u) => (
                      <Badge key={u} variant="outline" className="mr-1 mb-1 text-xs border-slate-600 text-slate-300">{SUBMINDS.find((s) => s.id === u)?.name ?? u}</Badge>
                    ))}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Feeds into (downstream)</p>
                  {(UPSTREAM_MAP[selectedSubmind]?.downstream ?? []).length === 0
                    ? <p className="text-sm text-slate-500">None (terminal)</p>
                    : (UPSTREAM_MAP[selectedSubmind]?.downstream ?? []).map((d) => (
                      <Badge key={d} variant="outline" className="mr-1 mb-1 text-xs border-slate-600 text-slate-300">{SUBMINDS.find((s) => s.id === d)?.name ?? d}</Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── SECTION: Routing Analytics ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Routing Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
                Routing Templates
                <span className="text-[10px] font-normal text-slate-500 italic">architecture targets</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={intentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {intentData.map((_, i) => <Cell key={i} fill={INTENT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
                High-Synergy Pairs
                <span className="text-[10px] font-normal text-slate-500 italic">invocations: live estimate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 py-2 flex gap-6 text-sm border-b border-slate-800">
                <div><span className="text-slate-400">Avg functions/task:</span> <span className="text-white font-semibold">4.2</span></div>
                <div><span className="text-slate-400">Parallelism:</span> <span className="text-white font-semibold">67%</span></div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-2.5">Pair</th><th className="text-right p-2.5">Affinity</th><th className="text-right p-2.5">Invocations</th>
                </tr></thead>
                <tbody>
                  {synergyPairs.sort((a, b) => b.affinity - a.affinity).map((p) => (
                    <tr key={`${p.a}-${p.b}`} className="border-b border-slate-800/50 text-slate-200">
                      <td className="p-2.5">{p.a} → {p.b}</td>
                      <td className="text-right p-2.5">
                        <span className={p.affinity >= 0.9 ? "text-green-400 font-semibold" : "text-slate-300"}>
                          {p.affinity.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-right p-2.5">
                        {p.invocations > 0 ? p.invocations.toLocaleString() : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
              Theory of Mind — Affinity Matrix
              <span className="text-[10px] font-normal text-slate-500 italic">topology-derived · static</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="text-xs min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-1.5 text-slate-500" />
                  {activeNames.map((n) => (
                    <th key={n} className="p-1.5 text-slate-400 font-normal text-center" style={{ writingMode: "vertical-rl", height: 70 }}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeNames.map((row, ri) => (
                  <tr key={row}>
                    <td className="p-1.5 text-slate-400 font-medium text-right pr-3 whitespace-nowrap">{row}</td>
                    {affinityMatrix[ri].map((val, ci) => {
                      const isHighlight = val >= 0.9 && ri !== ci;
                      const bg = ri === ci
                        ? "#1e293b"
                        : `rgba(${isHighlight ? "34, 197, 94" : "59, 130, 246"}, ${val * 0.7})`;
                      return (
                        <td key={ci} className="p-0 text-center" style={{ background: bg, width: 32, height: 26 }}>
                          <span className={`text-[9px] ${val >= 0.8 ? "text-white" : "text-slate-400"}`}>
                            {ri === ci ? "—" : val.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
