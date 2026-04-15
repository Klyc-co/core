import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Activity, DollarSign, Zap, Clock, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AiActivityRow {
  id: string;
  function_name: string;
  model_used: string;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  timestamp: string;
  user_id?: string;
  client_id?: string;
  metadata?: Record<string, unknown>;
}

interface FnSummary {
  function_name: string;
  model_used: string;
  total_input: number;
  total_output: number;
  total_tokens: number;
  total_cost: number;
  calls: number;
  avg_per_call: number;
  last_called: string;
}

interface HourlyStat {
  hour: string;
  calls: number;
  tokens: number;
  cost: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FN_COLORS: Record<string, string> = {
  "generate-image":    "#00E5B0",
  "campaign-pipeline": "#4F8EF7",
  "klyc-orchestrator": "#FFB547",
  "knowledge-search":  "#a855f7",
  "social":            "#ef4444",
  "klyc-chat":         "#22c55e",
};
const DEFAULT_COLOR = "#64748b";

const fmtCost = (n: number) =>
  n === 0 ? "$0.00" :
  n < 0.0001 ? `$${n.toFixed(6)}` :
  n < 0.01   ? `$${n.toFixed(4)}` :
  n < 1      ? `$${n.toFixed(3)}` :
               `$${n.toFixed(2)}`;

const fmtNum = (n: number) => n.toLocaleString("en-US");

const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)   return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function KlycAdminAiTesting() {
  const [rows, setRows] = useState<AiActivityRow[]>([]);
  const [summaries, setSummaries] = useState<FnSummary[]>([]);
  const [hourly, setHourly] = useState<HourlyStat[]>([]);
  const [recent, setRecent] = useState<AiActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch last 7 days of activity
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("ai_activity_log")
      .select("id, function_name, model_used, tokens_in, tokens_out, cost_estimate, timestamp, user_id, client_id")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(5000);

    const all = (data ?? []) as AiActivityRow[];
    setRows(all);
    setRecent(all.slice(0, 25));

    // Aggregate by function + model
    const fnMap = new Map<string, FnSummary>();
    all.forEach((r) => {
      const key = `${r.function_name}||${r.model_used}`;
      const existing = fnMap.get(key);
      const tokens = (r.tokens_in || 0) + (r.tokens_out || 0);
      if (existing) {
        existing.total_input  += r.tokens_in || 0;
        existing.total_output += r.tokens_out || 0;
        existing.total_tokens += tokens;
        existing.total_cost   += r.cost_estimate || 0;
        existing.calls        += 1;
        if (r.timestamp > existing.last_called) existing.last_called = r.timestamp;
      } else {
        fnMap.set(key, {
          function_name: r.function_name,
          model_used:    r.model_used || "—",
          total_input:   r.tokens_in || 0,
          total_output:  r.tokens_out || 0,
          total_tokens:  tokens,
          total_cost:    r.cost_estimate || 0,
          calls:         1,
          avg_per_call:  0,
          last_called:   r.timestamp,
        });
      }
    });
    const sums = Array.from(fnMap.values())
      .map((s) => ({ ...s, avg_per_call: s.calls > 0 ? Math.round(s.total_tokens / s.calls) : 0 }))
      .sort((a, b) => b.total_cost - a.total_cost);
    setSummaries(sums);

    // Hourly bucketing — last 24h
    const last24h = all.filter((r) => Date.now() - new Date(r.timestamp).getTime() < 86400000);
    const hourMap = new Map<string, HourlyStat>();
    last24h.forEach((r) => {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
      const e = hourMap.get(key) ?? { hour: key, calls: 0, tokens: 0, cost: 0 };
      e.calls  += 1;
      e.tokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      e.cost   += r.cost_estimate || 0;
      hourMap.set(key, e);
    });
    const hrs = Array.from(hourMap.values()).sort((a, b) => a.hour.localeCompare(b.hour));
    setHourly(hrs);

    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s if toggled
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const totalCost    = summaries.reduce((s, f) => s + f.total_cost, 0);
  const totalTokens  = summaries.reduce((s, f) => s + f.total_tokens, 0);
  const totalCalls   = summaries.reduce((s, f) => s + f.calls, 0);
  const pipelineCalls = summaries.find((f) => f.function_name === "campaign-pipeline")?.calls ?? 0;
  const avgCostPerCampaign = pipelineCalls > 0 ? totalCost / pipelineCalls : 0;
  const hasData = rows.length > 0;

  // Model breakdown for pie chart
  const modelMap = new Map<string, number>();
  summaries.forEach((s) => {
    const existing = modelMap.get(s.model_used) ?? 0;
    modelMap.set(s.model_used, existing + s.total_tokens);
  });
  const modelPie = Array.from(modelMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const MODEL_COLORS = ["#00E5B0", "#4F8EF7", "#FFB547", "#a855f7", "#ef4444", "#22c55e"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Usage Monitor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Live data from <code className="text-slate-400">ai_activity_log</code> · last 7 days ·
            refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`border-slate-700 text-slate-300 hover:bg-slate-800 ${autoRefresh ? "border-emerald-600 text-emerald-400" : ""}`}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <Card className="bg-slate-900 border-slate-700 border-dashed">
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-slate-500" />
            <p className="text-slate-300 font-medium">No activity logged yet</p>
            <p className="text-slate-500 text-sm max-w-md">
              The <code className="text-slate-400">ai_activity_log</code> table is empty. Data will populate automatically
              as users run campaigns through the platform. Ensure <code className="text-slate-400">generate-image v22</code> and
              other edge functions are inserting rows.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total AI Cost (7d)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{fmtCost(totalCost)}</p>
            <p className="text-xs text-slate-500 mt-1">{fmtNum(totalCalls)} total calls</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Total Tokens (7d)</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{totalTokens >= 1000000 ? `${(totalTokens / 1000000).toFixed(2)}M` : `${(totalTokens / 1000).toFixed(1)}k`}</p>
            <p className="text-xs text-slate-500 mt-1">{summaries.length} active functions</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> $ / Campaign</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{avgCostPerCampaign > 0 ? fmtCost(avgCostPerCampaign) : "—"}</p>
            <p className="text-xs text-slate-500 mt-1">{pipelineCalls} campaigns run</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Most Active Function</p>
            <p className="text-lg font-black text-purple-400 mt-1 truncate">
              {summaries.length > 0 ? summaries.sort((a, b) => b.calls - a.calls)[0]?.function_name : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summaries.length > 0 ? `${fmtNum(summaries.sort((a, b) => b.calls - a.calls)[0]?.calls ?? 0)} calls` : "no data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Per-Function Table ── */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Per-Function Usage — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                <th className="text-left p-3">Function</th>
                <th className="text-left p-3">Model</th>
                <th className="text-right p-3">Calls</th>
                <th className="text-right p-3">Tokens In</th>
                <th className="text-right p-3">Tokens Out</th>
                <th className="text-right p-3">Avg / Call</th>
                <th className="text-right p-3">Total Cost</th>
                <th className="text-right p-3">Last Called</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length > 0 ? summaries.map((fn, idx) => (
                <tr key={`${fn.function_name}-${fn.model_used}`} className="border-b border-slate-800/50 text-slate-200 hover:bg-slate-800/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: FN_COLORS[fn.function_name] ?? DEFAULT_COLOR }} />
                      <span className="font-medium text-white">{fn.function_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 text-xs font-mono">{fn.model_used}</td>
                  <td className="p-3 text-right font-mono">{fmtNum(fn.calls)}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{fmtNum(fn.total_input)}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{fmtNum(fn.total_output)}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{fmtNum(fn.avg_per_call)}</td>
                  <td className="p-3 text-right font-bold" style={{ color: FN_COLORS[fn.function_name] ?? "#94a3b8" }}>
                    {fmtCost(fn.total_cost)}
                  </td>
                  <td className="p-3 text-right text-slate-500 text-xs">{relTime(fn.last_called)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-600 italic">No data yet — rows appear as AI functions are called</td>
                </tr>
              )}
              {summaries.length > 0 && (
                <tr className="bg-slate-800/60 font-bold border-t border-slate-700">
                  <td colSpan={2} className="p-3 text-emerald-400">TOTAL</td>
                  <td className="p-3 text-right text-emerald-400">{fmtNum(totalCalls)}</td>
                  <td colSpan={3} />
                  <td className="p-3 text-right text-emerald-400">{fmtCost(totalCost)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Charts row ── */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Calls by function — bar */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Calls by Function</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summaries.map((f) => ({ name: f.function_name.replace("campaign-pipeline", "pipeline").replace("klyc-orchestrator", "orchestrator").replace("generate-image", "gen-image").replace("knowledge-search", "knowledge"), calls: f.calls }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                  <Bar dataKey="calls" radius={[3, 3, 0, 0]}>
                    {summaries.map((f, i) => (
                      <Cell key={i} fill={FN_COLORS[f.function_name] ?? DEFAULT_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model token share — pie */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Token Share by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={modelPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {modelPie.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} formatter={(v: number) => fmtNum(v) + " tokens"} />
                  <Legend wrapperStyle={{ color: "#64748b", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly calls — last 24h */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Calls — Last 24 Hours (by hour)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => v.slice(11, 16)} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} labelFormatter={(l) => l} />
                  <Line type="monotone" dataKey="calls" stroke="#00E5B0" strokeWidth={2} dot={false} name="Calls" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly cost — last 24h */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Cost — Last 24 Hours (by hour)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => v.slice(11, 16)} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} formatter={(v: number) => fmtCost(v)} />
                  <Bar dataKey="cost" fill="#4F8EF7" radius={[2, 2, 0, 0]} name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Recent Activity Feed ── */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Recent Activity (last 25 calls)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 bg-slate-800/30">
                <th className="text-left p-2.5">Function</th>
                <th className="text-left p-2.5">Model</th>
                <th className="text-right p-2.5">Tokens In</th>
                <th className="text-right p-2.5">Tokens Out</th>
                <th className="text-right p-2.5">Cost</th>
                <th className="text-right p-2.5">When</th>
              </tr>
            </thead>
            <tbody>
              {recent.length > 0 ? recent.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/40 text-slate-300 hover:bg-slate-800/20">
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: FN_COLORS[r.function_name] ?? DEFAULT_COLOR }} />
                      {r.function_name}
                    </div>
                  </td>
                  <td className="p-2.5 text-slate-500 font-mono">{r.model_used || "—"}</td>
                  <td className="p-2.5 text-right font-mono">{fmtNum(r.tokens_in || 0)}</td>
                  <td className="p-2.5 text-right font-mono">{fmtNum(r.tokens_out || 0)}</td>
                  <td className="p-2.5 text-right font-mono" style={{ color: FN_COLORS[r.function_name] ?? "#94a3b8" }}>
                    {fmtCost(r.cost_estimate || 0)}
                  </td>
                  <td className="p-2.5 text-right text-slate-500">{relTime(r.timestamp)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-600 italic">No recent calls</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* KNP validation summary */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 text-sm">
        <p className="text-white font-semibold mb-2">KNP Validation Targets</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-400">
          <div><span className="text-emerald-400 font-bold">97.1×</span><br />yield efficiency target</div>
          <div><span className="text-blue-400 font-bold">23.27:1</span><br />compression ratio target</div>
          <div><span className="text-amber-400 font-bold">$0.031</span><br />cost per campaign target</div>
          <div><span className="text-purple-400 font-bold">&lt;60s</span><br />end-to-end time target</div>
        </div>
        <p className="text-slate-600 text-xs mt-3">
          Live numbers above update as campaigns run. For compression ratio deep-dive → <a href="/klyc_admin/compression" className="text-blue-400 hover:underline">KNP Compression Analytics</a>
        </p>
      </div>
    </div>
  );
}
