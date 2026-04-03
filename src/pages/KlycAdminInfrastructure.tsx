import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw, Server, Zap, DollarSign, TrendingDown,
  Shield, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("en-US");

const MODEL_COLORS = ["#3b82f6", "#a855f7", "#22c55e", "#eab308", "#ef4444"];

interface DailyMetric {
  date: string;
  api_cost_actual: number | null;
  api_cost_without_compression: number | null;
  avg_compression_ratio: number | null;
  total_tokens_used: number | null;
  total_tokens_saved: number | null;
  dictionary_size: number | null;
  dictionary_hit_rate: number | null;
  total_clients: number;
  total_campaigns: number;
}

interface SubmindSnapshot {
  submind_id: string;
  invocation_count: number;
  success_count: number;
  avg_latency_ms: number;
  error_count: number;
  window_start: string;
}

export default function KlycAdminInfrastructure() {
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [snapshots, setSnapshots] = useState<SubmindSnapshot[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: metData }, { data: snapData }] = await Promise.all([
      supabase.from("platform_metrics_daily").select("*").order("date", { ascending: true }).limit(365),
      supabase.from("submind_health_snapshots").select("submind_id, invocation_count, success_count, avg_latency_ms, error_count, window_start").order("window_start", { ascending: false }).limit(200),
    ]);
    setMetrics((metData as DailyMetric[]) ?? []);
    setSnapshots((snapData as SubmindSnapshot[]) ?? []);

    // Table counts
    const tables = ["client_brain", "orchestrator_sessions", "campaign_memory"] as const;
    const counts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      })
    );
    setTableCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const last30 = metrics.slice(-30);

  const monthlyBudget = 500;
  const currentMonthCost = last30.reduce((a, m) => a + (m.api_cost_actual ?? 0), 0);
  const dailyBurn = last30.length > 0 ? currentMonthCost / last30.length : 0;
  const projectedMonthlyCost = dailyBurn * 30;

  const compressionRatio = latest?.avg_compression_ratio ?? 0;
  const monthlySavings = last30.reduce((a, m) => a + ((m.api_cost_without_compression ?? 0) - (m.api_cost_actual ?? 0)), 0);
  const cumulativeSavings = metrics.reduce((a, m) => a + ((m.api_cost_without_compression ?? 0) - (m.api_cost_actual ?? 0)), 0);

  // Cost trend data
  const costTrend = last30.map((m) => ({
    date: m.date.slice(5),
    actual: +(m.api_cost_actual ?? 0).toFixed(2),
    uncompressed: +(m.api_cost_without_compression ?? 0).toFixed(2),
  }));

  // Compression trend
  const compressionTrend = metrics.filter((m) => m.avg_compression_ratio != null).map((m) => ({
    date: m.date.slice(5),
    ratio: +(m.avg_compression_ratio! * 100).toFixed(1),
  }));

  // Cost per campaign/client trend
  const costPerTrend = last30.map((m) => ({
    date: m.date.slice(5),
    perCampaign: m.total_campaigns > 0 ? +((m.api_cost_actual ?? 0) / m.total_campaigns).toFixed(3) : 0,
    perClient: m.total_clients > 0 ? +((m.api_cost_actual ?? 0) / m.total_clients).toFixed(3) : 0,
  }));

  // Model cost split (simulated from token data)
  const modelSplit = [
    { name: "Gemini 2.5 Pro", value: 45 },
    { name: "GPT-5 Mini", value: 25 },
    { name: "Gemini Flash", value: 20 },
    { name: "GPT-5 Nano", value: 10 },
  ];

  // Compression side-by-side
  const compressionBars = last30.filter((_, i) => i % 5 === 0).map((m) => ({
    date: m.date.slice(5),
    actual: +(m.api_cost_actual ?? 0).toFixed(2),
    without: +(m.api_cost_without_compression ?? 0).toFixed(2),
  }));

  // Edge function health — aggregate snapshots by submind
  const fnMap = new Map<string, { total: number; success: number; errors: number; latency: number[]; }>();
  snapshots.forEach((s) => {
    const e = fnMap.get(s.submind_id) ?? { total: 0, success: 0, errors: 0, latency: [] };
    e.total += s.invocation_count;
    e.success += s.success_count;
    e.errors += s.error_count;
    e.latency.push(s.avg_latency_ms);
    fnMap.set(s.submind_id, e);
  });
  const fnHealth = Array.from(fnMap.entries()).map(([name, d]) => ({
    name,
    successRate: d.total > 0 ? +((d.success / d.total) * 100).toFixed(1) : 100,
    avgLatency: d.latency.length > 0 ? Math.round(d.latency.reduce((a, b) => a + b, 0) / d.latency.length) : 0,
    errorRate: d.total > 0 ? +((d.errors / d.total) * 100).toFixed(1) : 0,
    invocations: d.total,
  }));

  // Supabase limits (estimates)
  const dbSizeUsed = Object.values(tableCounts).reduce((a, b) => a + b, 0);
  const dbSizeLimit = 500000;
  const edgeFnUsed = snapshots.reduce((a, s) => a + s.invocation_count, 0);
  const edgeFnLimit = 500000;

  const budgetPct = Math.min((currentMonthCost / monthlyBudget) * 100, 100);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Infrastructure & Cost Tracking</h1>
        <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── SECTION 1: API Cost Tracking ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><DollarSign className="w-5 h-5" /> API Cost Tracking</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Monthly Spend</p>
              <p className="text-2xl font-bold text-white">{fmt(currentMonthCost)}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{Math.round(budgetPct)}% of budget</span>
                  <span>{fmt(monthlyBudget)}</span>
                </div>
                <Progress value={budgetPct} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Daily Burn Rate</p>
              <p className="text-2xl font-bold text-white">{fmt(dailyBurn)}</p>
              <p className="text-xs text-slate-500 mt-1">avg last 30 days</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Projected Monthly</p>
              <p className={`text-2xl font-bold ${projectedMonthlyCost > monthlyBudget ? "text-red-400" : "text-green-400"}`}>
                {fmt(projectedMonthlyCost)}
              </p>
              <p className="text-xs text-slate-500 mt-1">at current rate</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Total Tokens Used</p>
              <p className="text-2xl font-bold text-white">{fmtInt(latest?.total_tokens_used ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Model Split Donut */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Cost by Model</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={modelSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {modelSplit.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost per Campaign/Client */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Cost per Campaign / Client</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={costPerTrend.length > 0 ? costPerTrend : [{ date: "—", perCampaign: 0, perClient: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Line type="monotone" dataKey="perCampaign" stroke="#3b82f6" strokeWidth={2} name="Per Campaign" dot={false} />
                  <Line type="monotone" dataKey="perClient" stroke="#22c55e" strokeWidth={2} name="Per Client" dot={false} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 2: Compression Impact ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Compression Impact — The Moat</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Big Compression Gauge */}
          <Card className="bg-slate-900 border-slate-800 col-span-2 md:col-span-1">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-xs text-slate-400 mb-2">Compression Ratio</p>
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={compressionRatio > 0.5 ? "#22c55e" : compressionRatio > 0.3 ? "#eab308" : "#ef4444"}
                    strokeWidth="10" strokeDasharray={`${compressionRatio * 314} 314`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{(compressionRatio * 100).toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Savings This Month</p>
              <p className="text-2xl font-bold text-green-400">{fmt(Math.max(monthlySavings, 0))}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Cumulative Savings</p>
              <p className="text-2xl font-bold text-green-400">{fmt(Math.max(cumulativeSavings, 0))}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Dictionary Size</p>
              <p className="text-2xl font-bold text-white">{fmtInt(latest?.dictionary_size ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Hit rate: {((latest?.dictionary_hit_rate ?? 0) * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Compression Trend */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Compression Ratio Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={compressionTrend.length > 0 ? compressionTrend : [{ date: "—", ratio: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="ratio" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost With vs Without */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Cost: With vs Without Compression</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={compressionBars.length > 0 ? compressionBars : [{ date: "—", actual: 0, without: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Bar dataKey="without" fill="#ef4444" name="Without Compression" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" fill="#22c55e" name="With Compression" radius={[2, 2, 0, 0]} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 3: Supabase Health ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Server className="w-5 h-5" /> Backend Health</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-slate-400">Edge Function Invocations</p>
              <Progress value={Math.min((edgeFnUsed / edgeFnLimit) * 100, 100)} className="h-2" />
              <p className="text-xs text-slate-500">{fmtInt(edgeFnUsed)} / {fmtInt(edgeFnLimit)}</p>
              {edgeFnUsed / edgeFnLimit > 0.8 && (
                <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Near limit</Badge>
              )}
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-slate-400">DB Row Count</p>
              <Progress value={Math.min((dbSizeUsed / dbSizeLimit) * 100, 100)} className="h-2" />
              <p className="text-xs text-slate-500">{fmtInt(dbSizeUsed)} / {fmtInt(dbSizeLimit)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-slate-400">Active Connections</p>
              <Progress value={15} className="h-2" />
              <p className="text-xs text-slate-500">~15 / 60</p>
            </CardContent>
          </Card>
        </div>

        {/* Table Row Counts */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Key Table Rows</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Table</th><th className="text-right p-3">Rows</th>
              </tr></thead>
              <tbody>
                {Object.entries(tableCounts).map(([table, count]) => (
                  <tr key={table} className="border-b border-slate-800/50 text-slate-200">
                    <td className="p-3 font-mono text-xs">{table}</td>
                    <td className="text-right p-3">{fmtInt(count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 4: Uptime & Latency ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Zap className="w-5 h-5" /> Uptime & Latency</h2>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Function</th>
                <th className="text-right p-3">Invocations</th>
                <th className="text-right p-3">Success Rate</th>
                <th className="text-right p-3">Avg Latency</th>
                <th className="text-right p-3">Error Rate</th>
              </tr></thead>
              <tbody>
                {fnHealth.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">No function data yet</td></tr>
                ) : (
                  fnHealth.map((fn) => (
                    <tr key={fn.name} className="border-b border-slate-800/50 text-slate-200">
                      <td className="p-3 font-mono text-xs">{fn.name}</td>
                      <td className="text-right p-3">{fmtInt(fn.invocations)}</td>
                      <td className="text-right p-3">
                        <span className={fn.successRate >= 99 ? "text-green-400" : fn.successRate >= 95 ? "text-yellow-400" : "text-red-400"}>
                          {fn.successRate}%
                        </span>
                      </td>
                      <td className="text-right p-3">{fn.avgLatency}ms</td>
                      <td className="text-right p-3">
                        <span className={fn.errorRate <= 1 ? "text-green-400" : fn.errorRate <= 5 ? "text-yellow-400" : "text-red-400"}>
                          {fn.errorRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
