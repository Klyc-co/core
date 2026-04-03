import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw, BookOpen, Zap, Users, CheckCircle, AlertTriangle, TrendingUp,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const fmt = (n: number) => n.toLocaleString("en-US");

const LAYER_COLORS = ["#3b82f6", "#a855f7", "#22c55e", "#eab308"];

interface DailyMetric {
  date: string;
  avg_compression_ratio: number | null;
  dictionary_size: number | null;
  dictionary_hit_rate: number | null;
  total_tokens_used: number | null;
  total_tokens_saved: number | null;
  total_clients: number;
}

const MILESTONES = [
  { label: "Baseline", target: 68, month: 0 },
  { label: "Runtime Learning", target: 86, month: 1 },
  { label: "Compound Hashes", target: 102, month: 3 },
  { label: "Cross-Client Patterns", target: 143, month: 6 },
  { label: "Semantic Clustering", target: 215, month: 9 },
  { label: "Full Maturity", target: 316, month: 12 },
];

export default function KlycAdminCompression() {
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_metrics_daily")
      .select("date, avg_compression_ratio, dictionary_size, dictionary_hit_rate, total_tokens_used, total_tokens_saved, total_clients")
      .order("date", { ascending: true })
      .limit(365);
    setMetrics((data as DailyMetric[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const last30 = metrics.slice(-30);

  // Dictionary layers (simulated breakdown)
  const dictSize = latest?.dictionary_size ?? 0;
  const layers = [
    { name: "Wikipedia Base", count: Math.round(dictSize * 0.35), pctLookups: 42, growthDay: 0 },
    { name: "KLYC Research", count: Math.round(dictSize * 0.25), pctLookups: 28, growthDay: 12 },
    { name: "Runtime Learned", count: Math.round(dictSize * 0.28), pctLookups: 22, growthDay: 45 },
    { name: "Client-Specific", count: Math.round(dictSize * 0.12), pctLookups: 8, growthDay: 18 },
  ];
  const totalTerms = layers.reduce((a, l) => a + l.count, 0) || 1;

  const donutData = layers.map((l, i) => ({ name: l.name, value: l.count, fill: LAYER_COLORS[i] }));

  const hitRate = (latest?.dictionary_hit_rate ?? 0) * 100;
  const collisionRate = 0.04; // simulated
  const growthRate = last30.length > 1
    ? ((last30[last30.length - 1]?.dictionary_size ?? 0) - (last30[0]?.dictionary_size ?? 0)) / Math.max(last30.length, 1)
    : 0;
  const pollutionRisk = growthRate > 100 && hitRate < 60 ? "High" : growthRate > 50 && hitRate < 75 ? "Medium" : "Low";

  // Compression perf charts
  const perfData = last30.map((m) => {
    const ratio = m.avg_compression_ratio ?? 0;
    const totalTokens = m.total_tokens_used ?? 0;
    const saved = m.total_tokens_saved ?? 0;
    const packetSize = ratio > 0 ? Math.round(totalTokens / Math.max(ratio * 10, 1)) : totalTokens;
    return {
      date: m.date.slice(5),
      packetSize,
      channelA: Math.round(totalTokens * 0.3),
      channelB: Math.round(totalTokens * 0.7),
      ratio: +(ratio * 100).toFixed(1),
      hitRate: +((m.dictionary_hit_rate ?? 0) * 100).toFixed(1),
    };
  });

  const fallback = [{ date: "—", packetSize: 0, channelA: 0, channelB: 0, ratio: 0, hitRate: 0 }];
  const chartData = perfData.length > 0 ? perfData : fallback;

  // New hash creation (simulated declining)
  const hashCreation = last30.map((m, i) => ({
    date: m.date.slice(5),
    newHashes: Math.max(80 - i * 2 + Math.round(Math.random() * 10), 5),
  }));

  // Per-client compression (simulated from total_clients)
  const clientCount = latest?.total_clients ?? 0;
  const avgRatio = (latest?.avg_compression_ratio ?? 0.5) * 100;
  const stdDev = 8;
  const perClientData = Array.from({ length: Math.min(clientCount || 5, 20) }, (_, i) => {
    const ratio = avgRatio + (Math.random() - 0.5) * 30;
    const isOutlier = ratio < avgRatio - 2 * stdDev;
    return {
      id: `client-${i + 1}`,
      name: `Client ${String.fromCharCode(65 + (i % 26))}${i > 25 ? i - 25 : ""}`,
      tier: ["Starter", "Growth", "Pro", "Enterprise"][i % 4],
      ratio: +ratio.toFixed(1),
      dictSize: Math.round(200 + Math.random() * 800),
      hitRate: +(60 + Math.random() * 35).toFixed(1),
      status: isOutlier ? "outlier" : ratio < avgRatio - stdDev ? "below_avg" : "healthy",
    };
  }).sort((a, b) => b.ratio - a.ratio);

  // Milestone progress
  const currentRatioX = (latest?.avg_compression_ratio ?? 0.5) * 100;
  const launchDate = metrics.length > 0 ? new Date(metrics[0].date) : new Date();
  const monthsSinceLaunch = Math.max(
    (Date.now() - launchDate.getTime()) / (30 * 86400000),
    0
  );

  const statusColor = (s: string) =>
    s === "healthy" ? "bg-green-500/20 text-green-400 border-green-500/30"
    : s === "below_avg" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Compression Analytics</h1>
        <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── SECTION 1: Dictionary Health ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Dictionary Health</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Dictionary Size</p>
              <p className="text-2xl font-bold text-white">{fmt(dictSize)}</p>
              <p className="text-xs text-slate-500 mt-1">+{growthRate.toFixed(0)}/day</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Hit Rate</p>
              <p className="text-2xl font-bold text-green-400">{hitRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Hash Collisions</p>
              <p className={`text-2xl font-bold ${collisionRate < 0.1 ? "text-green-400" : "text-red-400"}`}>{collisionRate}%</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Pollution Risk</p>
              <Badge variant="outline" className={`text-sm ${pollutionRisk === "Low" ? "border-green-500 text-green-400" : pollutionRisk === "Medium" ? "border-yellow-500 text-yellow-400" : "border-red-500 text-red-400"}`}>
                {pollutionRisk}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Layer Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {donutData.map((_, i) => <Cell key={i} fill={LAYER_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Per-Layer Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-2.5">Layer</th><th className="text-right p-2.5">Terms</th><th className="text-right p-2.5">% Total</th><th className="text-right p-2.5">% Lookups</th><th className="text-right p-2.5">+/Day</th>
                </tr></thead>
                <tbody>
                  {layers.map((l, i) => (
                    <tr key={l.name} className="border-b border-slate-800/50 text-slate-200">
                      <td className="p-2.5 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[i] }} />{l.name}</td>
                      <td className="text-right p-2.5">{fmt(l.count)}</td>
                      <td className="text-right p-2.5">{((l.count / totalTerms) * 100).toFixed(1)}%</td>
                      <td className="text-right p-2.5">{l.pctLookups}%</td>
                      <td className="text-right p-2.5">{l.growthDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 2: Compression Performance ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Zap className="w-5 h-5" /> Compression Performance</h2>

        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Avg Packet Size (tokens)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Line type="monotone" dataKey="packetSize" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Channel A (algorithmic) vs Channel B (hash/pointer)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Line type="monotone" dataKey="channelA" stroke="#ef4444" strokeWidth={2} dot={false} name="Channel A" />
                  <Line type="monotone" dataKey="channelB" stroke="#22c55e" strokeWidth={2} dot={false} name="Channel B" />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Compression Ratio (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="ratio" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Dictionary Hit Rate Trend</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400 mb-2">{hitRate.toFixed(1)}%</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} domain={[0, 100]} />
                  <Line type="monotone" dataKey="hitRate" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">New Hash Creation Rate</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={hashCreation.length > 0 ? hashCreation : [{ date: "—", newHashes: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Bar dataKey="newHashes" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 3: Per-Client Compression ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Users className="w-5 h-5" /> Per-Client Compression</h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Client</th><th className="text-left p-3">Tier</th><th className="text-right p-3">Ratio</th><th className="text-right p-3">Dict Size</th><th className="text-right p-3">Hit Rate</th><th className="text-center p-3">Status</th>
              </tr></thead>
              <tbody>
                {perClientData.map((c) => (
                  <tr key={c.id} className={`border-b border-slate-800/50 text-slate-200 ${c.status === "outlier" ? "bg-red-950/20" : ""}`}>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs border-slate-600 text-slate-300">{c.tier}</Badge></td>
                    <td className="text-right p-3 font-mono">{c.ratio}%</td>
                    <td className="text-right p-3">{fmt(c.dictSize)}</td>
                    <td className="text-right p-3">{c.hitRate}%</td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className={`text-xs ${statusColor(c.status)}`}>
                        {c.status === "healthy" ? "Healthy" : c.status === "below_avg" ? "Below Avg" : "Outlier"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 4: Milestones ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Compression Milestones</h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="relative ml-4">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-700" />

              {MILESTONES.map((m, i) => {
                const achieved = currentRatioX >= m.target;
                const isCurrent = !achieved && (i === 0 || currentRatioX >= MILESTONES[i - 1].target);
                return (
                  <div key={m.label} className="relative flex items-start gap-4 pb-8 last:pb-0">
                    {/* Dot */}
                    <div className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      achieved ? "bg-green-500 border-green-500" : isCurrent ? "bg-primary border-primary animate-pulse" : "bg-slate-800 border-slate-600"
                    }`}>
                      {achieved && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    {/* Content */}
                    <div className={`flex-1 ${isCurrent ? "bg-slate-800/50 -m-2 p-2 rounded-lg border border-primary/30" : ""}`}>
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${achieved ? "text-green-400" : isCurrent ? "text-white" : "text-slate-500"}`}>
                          {m.label}
                        </p>
                        <span className={`text-sm font-mono ${achieved ? "text-green-400" : "text-slate-500"}`}>{m.target}x</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {m.month === 0 ? "Day 1" : `Month ${m.month}`}
                        {achieved && " — ✓ Achieved"}
                        {isCurrent && ` — Current: ${currentRatioX.toFixed(0)}x`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Moat Strength</p>
                <p className="text-lg font-bold text-white">
                  {currentRatioX > 0
                    ? `${currentRatioX.toFixed(0)}x actual vs ${MILESTONES.find((_, i) => monthsSinceLaunch < MILESTONES[Math.min(i + 1, MILESTONES.length - 1)].month)?.target ?? MILESTONES[0].target}x projected`
                    : "Awaiting data"}
                </p>
              </div>
              <Badge variant="outline" className={`text-sm ${currentRatioX > 68 ? "border-green-500 text-green-400" : "border-yellow-500 text-yellow-400"}`}>
                {currentRatioX > 68 ? "Above Baseline" : "Building"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
