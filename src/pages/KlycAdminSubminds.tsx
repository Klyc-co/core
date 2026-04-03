import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, X, ArrowRight, ArrowLeft, Zap,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const SUBMINDS = [
  { id: "research", name: "Research", binary: "0001", status: "active", model: "Gemini 2.5 Pro" },
  { id: "product", name: "Product", binary: "0010", status: "active", model: "GPT-5 Mini" },
  { id: "narrative", name: "Narrative", binary: "0011", status: "active", model: "Gemini 2.5 Pro" },
  { id: "creative", name: "Creative", binary: "0100", status: "active", model: "GPT-5 Mini" },
  { id: "social", name: "Social", binary: "0101", status: "active", model: "Gemini 2.5 Flash" },
  { id: "image", name: "Image", binary: "0110", status: "active", model: "Gemini 2.5 Flash" },
  { id: "approval", name: "Approval", binary: "0111", status: "active", model: "GPT-5 Nano" },
  { id: "viral", name: "Viral", binary: "1000", status: "stub", model: "—" },
  { id: "analytics", name: "Analytics", binary: "1001", status: "stub", model: "—" },
  { id: "learning", name: "Learning Engine", binary: "1010", status: "stub", model: "—" },
];

const INTENTS = ["CAMPAIGN_NEW", "TREND_ANALYSIS", "PERFORMANCE_REVIEW", "CONTENT_REVISION", "LEARNING_REPORT"];
const INTENT_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ef4444"];

const SYNERGY_PAIRS = [
  { a: "Research", b: "Narrative", affinity: 0.92, invocations: 847 },
  { a: "Product", b: "Creative", affinity: 0.89, invocations: 723 },
  { a: "Creative", b: "Social", affinity: 0.94, invocations: 912 },
  { a: "Narrative", b: "Creative", affinity: 0.88, invocations: 681 },
  { a: "Social", b: "Image", affinity: 0.91, invocations: 804 },
  { a: "Research", b: "Product", affinity: 0.85, invocations: 592 },
  { a: "Image", b: "Approval", affinity: 0.87, invocations: 534 },
];

const UPSTREAM_MAP: Record<string, { upstream: string[]; downstream: string[] }> = {
  research: { upstream: [], downstream: ["product", "narrative"] },
  product: { upstream: ["research"], downstream: ["creative", "narrative"] },
  narrative: { upstream: ["research", "product"], downstream: ["creative", "social"] },
  creative: { upstream: ["narrative", "product"], downstream: ["social", "image"] },
  social: { upstream: ["creative", "narrative"], downstream: ["image", "approval"] },
  image: { upstream: ["creative", "social"], downstream: ["approval"] },
  approval: { upstream: ["image", "social"], downstream: [] },
  viral: { upstream: ["creative"], downstream: ["approval"] },
  analytics: { upstream: ["approval"], downstream: ["learning"] },
  learning: { upstream: ["analytics"], downstream: ["research"] },
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

export default function KlycAdminSubminds() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmind, setSelectedSubmind] = useState<string | null>(null);
  const [deepDiveRange, setDeepDiveRange] = useState<"daily" | "weekly" | "monthly">("daily");

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

  // Aggregate per submind
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

  const statusColor = (s: string) =>
    s === "active" ? "bg-green-500/20 text-green-400 border-green-500/30"
    : s === "degraded" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : s === "down" ? "bg-red-500/20 text-red-400 border-red-500/30"
    : "bg-slate-700/30 text-slate-500 border-slate-600/30";

  const rateColor = (r: number) => r >= 90 ? "text-green-400" : r >= 75 ? "text-yellow-400" : "text-red-400";

  // Routing pie data
  const intentData = INTENTS.map((intent, i) => ({
    name: intent.replace(/_/g, " "),
    value: [45, 20, 15, 12, 8][i],
    fill: INTENT_COLORS[i],
  }));

  // Affinity heatmap data
  const activeNames = SUBMINDS.map((s) => s.name);
  const affinityMatrix = activeNames.map((row) =>
    activeNames.map((col) => {
      if (row === col) return 1;
      const pair = SYNERGY_PAIRS.find((p) => (p.a === row && p.b === col) || (p.a === col && p.b === row));
      return pair?.affinity ?? +(0.3 + Math.random() * 0.4).toFixed(2);
    })
  );

  // Deep dive data
  const selectedDef = SUBMINDS.find((s) => s.id === selectedSubmind);
  const selectedStats = selectedSubmind ? getStats(selectedSubmind) : null;
  const selectedSnaps = snapshots.filter((s) => s.submind_id === selectedSubmind);

  // Latency histogram
  const latencyBuckets = [0, 100, 200, 500, 1000, 2000, 5000];
  const latencyHist = latencyBuckets.slice(0, -1).map((min, i) => {
    const max = latencyBuckets[i + 1];
    const count = selectedSnaps.filter((s) => s.avg_latency_ms >= min && s.avg_latency_ms < max).length;
    return { range: `${min}-${max}ms`, count };
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Submind Health Monitor</h1>
        <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── SECTION 1: Status Grid ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Submind Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUBMINDS.map((sm) => {
            const stats = getStats(sm.id);
            const isStub = sm.status === "stub";
            return (
              <Card
                key={sm.id}
                className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-slate-600 ${selectedSubmind === sm.id ? "ring-1 ring-primary" : ""} ${isStub ? "opacity-50" : ""}`}
                onClick={() => !isStub && setSelectedSubmind(selectedSubmind === sm.id ? null : sm.id)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white truncate">{sm.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(sm.status)}`}>
                      {sm.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">{sm.binary} · {sm.model}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <p className="text-slate-500">Success</p>
                      <p className={`font-semibold ${rateColor(stats.successRate)}`}>{stats.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Latency</p>
                      <p className="font-semibold text-slate-200">{stats.avgLatency}ms</p>
                    </div>
                  </div>
                  {stats.approvalRate !== null && (
                    <div className="text-xs">
                      <p className="text-slate-500">Approval</p>
                      <p className="font-semibold text-slate-200">{stats.approvalRate}%</p>
                    </div>
                  )}
                  {/* Mini sparkline */}
                  {stats.dailyTrend.length > 1 && (
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
      </section>

      {/* ── SECTION 3: Deep Dive (shown when card selected) ── */}
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

          {/* KPIs */}
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
            {/* Invocation trend */}
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

            {/* Latency histogram */}
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

          {/* Upstream / Downstream */}
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

          {/* Error log */}
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
        </section>
      )}

      {/* ── SECTION 2: Routing Analytics ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Routing Analytics</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Intent distribution */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Routing Templates</CardTitle></CardHeader>
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

          {/* Metrics + Synergy Table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">High-Synergy Pairs</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="px-4 py-2 flex gap-6 text-sm border-b border-slate-800">
                <div><span className="text-slate-400">Avg subminds/task:</span> <span className="text-white font-semibold">4.2</span></div>
                <div><span className="text-slate-400">Parallelism:</span> <span className="text-white font-semibold">67%</span></div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-2.5">Pair</th><th className="text-right p-2.5">Affinity</th><th className="text-right p-2.5">Invocations</th>
                </tr></thead>
                <tbody>
                  {SYNERGY_PAIRS.sort((a, b) => b.affinity - a.affinity).map((p) => (
                    <tr key={`${p.a}-${p.b}`} className="border-b border-slate-800/50 text-slate-200">
                      <td className="p-2.5">{p.a} → {p.b}</td>
                      <td className="text-right p-2.5">
                        <span className={p.affinity >= 0.9 ? "text-green-400 font-semibold" : "text-slate-300"}>
                          {p.affinity.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-right p-2.5">{p.invocations.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Affinity Heatmap */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Theory of Mind — Affinity Matrix</CardTitle></CardHeader>
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
                      const intensity = Math.round(val * 255);
                      const bg = ri === ci
                        ? "#1e293b"
                        : `rgba(${isHighlight ? "34, 197, 94" : "59, 130, 246"}, ${val * 0.7})`;
                      return (
                        <td key={ci} className="p-0 text-center" style={{ background: bg, width: 36, height: 28 }}>
                          <span className={`text-[10px] ${val >= 0.8 ? "text-white" : "text-slate-400"}`}>
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
