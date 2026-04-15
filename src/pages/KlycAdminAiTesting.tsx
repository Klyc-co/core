import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Activity, DollarSign, Zap, Clock, TrendingUp, AlertCircle,
  Image, Layers, ArrowDown, CheckCircle2, FlaskConical, Cpu,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = "https://wkqiielsazzbxziqmgdb.supabase.co/functions/v1";

const FUNCTION_VERSIONS: Record<string, string> = {
  "generate-image":    "v31",
  "normalize-input":   "v3",
  "klyc-orchestrator": "v4",
  "campaign-pipeline": "v7",
};

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

interface AiMetricsSummary {
  calls: { total: number; success: number; errors: number; success_rate: number };
  tokens: { total_in: number; total_out: number; grand_total: number; avg_per_call: number };
  batch: { total_batch_calls: number; avg_batch_size: number; avg_tokens_per_image: number };
  compression: { total_compressed_calls: number; avg_compression_ratio: number };
  by_function: Record<string, { calls: number; tokens: number; cost: number }>;
}

interface BenchmarkRow {
  id: string;
  timestamp: string;
  batch_size: number;
  raw_bytes: number;
  compressed_bytes: number;
  savings_pct: number;
  compression_ratio: number;
  gemini_calls: number;
  returned_count: number;
}

interface ImageTestResult {
  success: boolean;
  gemini_calls?: number;
  returned_count?: number;
  batch_count?: number;
  images?: Array<{
    platform: string;
    url: string;
    original_bytes?: number;
    compressed_bytes?: number;
    compression_ratio?: number;
    elapsed_ms?: number;
  }>;
  raw_url?: string;
  raw_bytes?: number;
  knp?: string;
  error?: string;
  elapsed_ms?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FN_COLORS: Record<string, string> = {
  "generate-image":    "#00E5B0",
  "campaign-pipeline": "#4F8EF7",
  "klyc-orchestrator": "#FFB547",
  "knowledge-search":  "#a855f7",
  "social":            "#ef4444",
  "klyc-chat":         "#22c55e",
  "normalize-input":   "#f97316",
};
const DEFAULT_COLOR = "#64748b";

const fmtCost = (n: number) =>
  n === 0 ? "$0.00" :
  n < 0.0001 ? `$${n.toFixed(6)}` :
  n < 0.01   ? `$${n.toFixed(4)}` :
  n < 1      ? `$${n.toFixed(3)}` :
               `$${n.toFixed(2)}`;

const fmtNum = (n: number) => n.toLocaleString("en-US");

const fmtBytes = (b: number) =>
  b < 1024 ? `${b}B` :
  b < 1048576 ? `${(b / 1024).toFixed(1)}KB` :
  `${(b / 1048576).toFixed(2)}MB`;

const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000)  return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

async function callAiMetrics(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE_URL}/ai-metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function KlycAdminAiTesting() {
  const [rows, setRows]           = useState<AiActivityRow[]>([]);
  const [summaries, setSummaries] = useState<FnSummary[]>([]);
  const [hourly, setHourly]       = useState<HourlyStat[]>([]);
  const [recent, setRecent]       = useState<AiActivityRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // KNP/Compression state
  const [aiMetrics, setAiMetrics]         = useState<AiMetricsSummary | null>(null);
  const [benchmarkRows, setBenchmarkRows] = useState<BenchmarkRow[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Image test state
  const [testRunning, setTestRunning]   = useState(false);
  const [testResult, setTestResult]     = useState<ImageTestResult | null>(null);
  const [testBatchSize, setTestBatchSize] = useState(3);
  const [testRawVsKnp, setTestRawVsKnp]  = useState(true);
  const [activeTab, setActiveTab]         = useState<"monitor" | "compression" | "test">("monitor");

  const loadAiMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const [summaryData, benchData] = await Promise.all([
        callAiMetrics("summary"),
        callAiMetrics("benchmark", { limit: 10 }),
      ]);
      if (summaryData.summary) setAiMetrics(summaryData.summary);
      if (benchData.benchmark) setBenchmarkRows(benchData.benchmark);
    } catch (e) {
      console.error("ai-metrics error:", e);
    }
    setMetricsLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("ai_activity_log")
      .select("id, function_name, model_used, tokens_in, tokens_out, cost_estimate, timestamp, user_id, client_id, metadata")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(5000);

    const all = (data ?? []) as AiActivityRow[];
    setRows(all);
    setRecent(all.slice(0, 25));

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
    setHourly(Array.from(hourMap.values()).sort((a, b) => a.hour.localeCompare(b.hour)));

    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); loadAiMetrics(); }, [load, loadAiMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { load(); loadAiMetrics(); }, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, load, loadAiMetrics]);

  // ── Image Test Runner ─────────────────────────────────────────────────────
  const runImageTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    const t0 = Date.now();
    try {
      const payload: Record<string, unknown> = {
        brief: "Test image: vibrant product shot with bold colors",
        batch_count: testBatchSize,
        platforms: Array.from({ length: testBatchSize }, (_, i) =>
          ["tiktok", "instagram", "facebook"][i % 3]
        ),
        raw_vs_compressed: testRawVsKnp,
      };
      const res = await fetch(`${BASE_URL}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResult({
        success: res.ok,
        gemini_calls: data.gemini_calls,
        returned_count: data.returned_count,
        batch_count: data.batch_count,
        images: data.images ?? data.batch_detail,
        raw_url: data.raw_url,
        raw_bytes: data.raw_bytes,
        knp: data.knp,
        error: data.error,
        elapsed_ms: Date.now() - t0,
      });
    } catch (e: unknown) {
      setTestResult({ success: false, error: String(e), elapsed_ms: Date.now() - t0 });
    }
    setTestRunning(false);
    // Refresh metrics after test
    setTimeout(loadAiMetrics, 2000);
  };

  // ── Derived totals ──────────────────────────────────────────────────────────
  const totalCost     = summaries.reduce((s, f) => s + f.total_cost, 0);
  const totalTokens   = summaries.reduce((s, f) => s + f.total_tokens, 0);
  const totalCalls    = summaries.reduce((s, f) => s + f.calls, 0);
  const pipelineCalls = summaries.find((f) => f.function_name === "campaign-pipeline")?.calls ?? 0;
  const avgCostPerCampaign = pipelineCalls > 0 ? totalCost / pipelineCalls : 0;
  const hasData = rows.length > 0;

  const modelMap = new Map<string, number>();
  summaries.forEach((s) => {
    modelMap.set(s.model_used, (modelMap.get(s.model_used) ?? 0) + s.total_tokens);
  });
  const modelPie = Array.from(modelMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const MODEL_COLORS = ["#00E5B0", "#4F8EF7", "#FFB547", "#a855f7", "#ef4444", "#22c55e"];

  // Compression stats from ai-metrics
  const avgRatio   = aiMetrics?.compression?.avg_compression_ratio ?? 0;
  const compCalls  = aiMetrics?.compression?.total_compressed_calls ?? 0;
  const batchAvg   = aiMetrics?.batch?.avg_batch_size ?? 0;
  const tpiAvg     = aiMetrics?.batch?.avg_tokens_per_image ?? 0;
  const batchCalls = aiMetrics?.batch?.total_batch_calls ?? 0;

  // by_function chart data from ai-metrics
  const byFnData = aiMetrics?.by_function
    ? Object.entries(aiMetrics.by_function).map(([name, v]) => ({
        name: name.replace("campaign-pipeline", "pipeline").replace("klyc-orchestrator", "orchestrator")
                   .replace("generate-image", "gen-img").replace("normalize-input", "normalizer"),
        calls: v.calls,
        tokens: v.tokens,
        cost: v.cost,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Testing & Metrics</h1>
          <p className="text-xs text-slate-500 mt-1">
            KNP Ψ3 · generate-image v31 · normalize-input v3 · refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`border-slate-700 text-slate-300 hover:bg-slate-800 ${autoRefresh ? "border-emerald-600 text-emerald-400" : ""}`}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { load(); loadAiMetrics(); }}
            className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Version Badge Strip ── */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(FUNCTION_VERSIONS).map(([fn, ver]) => (
          <div key={fn} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-300 font-mono">{fn}</span>
            <Badge variant="outline" className="text-[10px] border-emerald-700 text-emerald-400 px-1.5 py-0">{ver}</Badge>
          </div>
        ))}
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
          <Cpu className="w-3 h-3 text-amber-400" />
          <span className="text-xs text-amber-300 font-mono">gemini-2.5-flash-image</span>
          <Badge variant="outline" className="text-[10px] border-amber-700 text-amber-400 px-1.5 py-0">WASM 72%</Badge>
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex gap-1 border-b border-slate-800">
        {(["monitor", "compression", "test"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors
              ${activeTab === tab
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-500 hover:text-slate-300"}`}
          >
            {tab === "monitor" && "📊 Usage Monitor"}
            {tab === "compression" && "⚡ KNP Compression"}
            {tab === "test" && "🧪 Live Test"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: USAGE MONITOR
      ══════════════════════════════════════════ */}
      {activeTab === "monitor" && (
        <div className="space-y-6">
          {!hasData && (
            <Card className="bg-slate-900 border-slate-700 border-dashed">
              <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="w-8 h-8 text-slate-500" />
                <p className="text-slate-300 font-medium">No activity logged yet</p>
                <p className="text-slate-500 text-sm max-w-md">
                  Data populates as campaigns run. Ensure <code className="text-slate-400">generate-image v31</code> and
                  other edge functions are inserting rows into <code className="text-slate-400">ai_activity_log</code>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* KPI Row */}
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
                <p className="text-2xl font-black text-blue-400 mt-1">
                  {totalTokens >= 1000000 ? `${(totalTokens / 1000000).toFixed(2)}M` : `${(totalTokens / 1000).toFixed(1)}k`}
                </p>
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
                <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Most Active</p>
                <p className="text-lg font-black text-purple-400 mt-1 truncate">
                  {summaries.length > 0 ? [...summaries].sort((a, b) => b.calls - a.calls)[0]?.function_name : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {summaries.length > 0 ? `${fmtNum([...summaries].sort((a, b) => b.calls - a.calls)[0]?.calls ?? 0)} calls` : "no data"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Per-Function Table */}
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
                  {summaries.length > 0 ? summaries.map((fn) => (
                    <tr key={`${fn.function_name}-${fn.model_used}`} className="border-b border-slate-800/50 text-slate-200 hover:bg-slate-800/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: FN_COLORS[fn.function_name] ?? DEFAULT_COLOR }} />
                          <span className="font-medium text-white">{fn.function_name}</span>
                          {FUNCTION_VERSIONS[fn.function_name] && (
                            <span className="text-[10px] text-slate-500 font-mono">{FUNCTION_VERSIONS[fn.function_name]}</span>
                          )}
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

          {/* Charts */}
          {hasData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Calls by Function</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={summaries.map((f) => ({
                      name: f.function_name.replace("campaign-pipeline","pipeline").replace("klyc-orchestrator","orchestrator").replace("generate-image","gen-img").replace("normalize-input","normalizer"),
                      calls: f.calls,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                      <Bar dataKey="calls" radius={[3, 3, 0, 0]}>
                        {summaries.map((f, i) => <Cell key={i} fill={FN_COLORS[f.function_name] ?? DEFAULT_COLOR} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Calls — Last 24 Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={hourly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => v.slice(11, 16)} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                      <Line type="monotone" dataKey="calls" stroke="#00E5B0" strokeWidth={2} dot={false} name="Calls" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Cost — Last 24 Hours</CardTitle>
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

          {/* Recent Activity Feed */}
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
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: KNP COMPRESSION
      ══════════════════════════════════════════ */}
      {activeTab === "compression" && (
        <div className="space-y-6">
          {metricsLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading ai-metrics…
            </div>
          )}

          {/* Compression KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Avg Compression Ratio</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {avgRatio > 0 ? `${avgRatio.toFixed(2)}×` : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG → JPEG @ 72% quality</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-orange-500">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 flex items-center gap-1"><Image className="w-3 h-3" /> Compressed Uploads</p>
                <p className="text-2xl font-black text-orange-400 mt-1">{fmtNum(compCalls)}</p>
                <p className="text-xs text-slate-500 mt-1">via normalize-input v3</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-blue-500">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 flex items-center gap-1"><Layers className="w-3 h-3" /> Avg Batch Size</p>
                <p className="text-2xl font-black text-blue-400 mt-1">
                  {batchAvg > 0 ? batchAvg.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">images per Gemini call</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 border-t-2 border-t-purple-500">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Tokens / Image</p>
                <p className="text-2xl font-black text-purple-400 mt-1">
                  {tpiAvg > 0 ? fmtNum(Math.round(tpiAvg)) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">amortized across batch</p>
              </CardContent>
            </Card>
          </div>

          {/* Single-call batch proof */}
          <Card className="bg-slate-900 border-slate-800 border border-emerald-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Single-Call Batch Proof — KNP Ψ3
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                  <p className="text-3xl font-black text-emerald-400">1</p>
                  <p className="text-xs text-slate-400 mt-1">Gemini API call</p>
                  <p className="text-xs text-slate-600">for up to 10 images</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                  <p className="text-3xl font-black text-blue-400">{batchCalls > 0 ? fmtNum(batchCalls) : "—"}</p>
                  <p className="text-xs text-slate-400 mt-1">batch runs logged</p>
                  <p className="text-xs text-slate-600">via ai_activity_log</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                  <p className="text-3xl font-black text-amber-400">
                    {batchAvg > 1 ? `${(batchAvg - 1).toFixed(0)}×` : "—"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">calls saved per batch</p>
                  <p className="text-xs text-slate-600">vs parallel approach</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 border-t border-slate-800 pt-3">
                generate-image v31 sends <strong className="text-slate-300">one</strong> Gemini request per batch —
                all N images come back as <code className="text-slate-400">inlineData</code> parts in a single response.
                Token overhead is paid once and amortized. Rate limit risk eliminated.
              </p>
            </CardContent>
          </Card>

          {/* by_function from ai-metrics */}
          {byFnData.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Token Distribution by Function (ai-metrics)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byFnData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                    <Bar dataKey="tokens" name="Tokens" radius={[3, 3, 0, 0]} fill="#4F8EF7" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* RAW vs KNP Benchmark table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-300">RAW vs KNP Benchmark — Last 10 Test Runs</CardTitle>
                <Button variant="outline" size="sm" onClick={loadAiMetrics}
                  className="border-slate-700 text-slate-400 hover:bg-slate-800 text-xs h-7">
                  <RefreshCw className="w-3 h-3 mr-1" /> Reload
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 bg-slate-800/30">
                    <th className="text-left p-2.5">When</th>
                    <th className="text-right p-2.5">Batch</th>
                    <th className="text-right p-2.5">RAW Size</th>
                    <th className="text-right p-2.5">KNP Size</th>
                    <th className="text-right p-2.5">Saved</th>
                    <th className="text-right p-2.5">Ratio</th>
                    <th className="text-right p-2.5">Gemini Calls</th>
                    <th className="text-right p-2.5">Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkRows.length > 0 ? benchmarkRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-800/40 text-slate-300 hover:bg-slate-800/20">
                      <td className="p-2.5 text-slate-500">{relTime(row.timestamp)}</td>
                      <td className="p-2.5 text-right font-mono">{row.batch_size}</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{fmtBytes(row.raw_bytes)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">{fmtBytes(row.compressed_bytes)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-300">{row.savings_pct.toFixed(1)}%</td>
                      <td className="p-2.5 text-right font-mono text-blue-400">{row.compression_ratio.toFixed(2)}×</td>
                      <td className="p-2.5 text-right font-mono">
                        <span className={row.gemini_calls === 1 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                          {row.gemini_calls}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-300">{row.returned_count}/{row.batch_size}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-600 italic">
                        No benchmark data yet — run a test with RAW vs KNP enabled (Live Test tab)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* KNP Validation targets */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 text-sm">
            <p className="text-white font-semibold mb-2">KNP Ψ3 Validation Targets</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-400">
              <div>
                <span className="text-emerald-400 font-bold">97.1×</span>
                <br />yield efficiency target
              </div>
              <div>
                <span className="text-blue-400 font-bold">
                  {avgRatio > 0 ? `${avgRatio.toFixed(2)}×` : "23.27:1"}
                </span>
                <br />compression ratio {avgRatio > 0 ? "(live)" : "(target)"}
              </div>
              <div>
                <span className="text-amber-400 font-bold">$0.031</span>
                <br />cost per campaign target
              </div>
              <div>
                <span className="text-purple-400 font-bold">1 call</span>
                <br />Gemini API calls per batch (v31 ✓)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: LIVE TEST
      ══════════════════════════════════════════ */}
      {activeTab === "test" && (
        <div className="space-y-6">
          {/* Test config */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-blue-400" />
                Live Image Generation Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-2">Batch Size (images)</label>
                  <div className="flex gap-2">
                    {[1, 3, 5, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setTestBatchSize(n)}
                        className={`px-3 py-1.5 rounded text-sm font-mono transition-colors
                          ${testBatchSize === n
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-2">Test Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTestRawVsKnp(false)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors
                        ${!testRawVsKnp ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                    >
                      KNP only
                    </button>
                    <button
                      onClick={() => setTestRawVsKnp(true)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors
                        ${testRawVsKnp ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                    >
                      RAW + KNP
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 font-mono">
                <span className="text-slate-500">POST</span> /generate-image <br />
                <span className="text-emerald-400">batch_count:</span> {testBatchSize} ·{" "}
                <span className="text-emerald-400">raw_vs_compressed:</span> {String(testRawVsKnp)} ·{" "}
                <span className="text-emerald-400">gemini_calls:</span> 1 (expected)
              </div>

              <Button
                onClick={runImageTest}
                disabled={testRunning}
                className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
              >
                {testRunning ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating {testBatchSize} image{testBatchSize > 1 ? "s" : ""}…</>
                ) : (
                  <><FlaskConical className="w-4 h-4 mr-2" /> Run Test ({testBatchSize} image{testBatchSize > 1 ? "s" : ""})</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card className={`bg-slate-900 border ${testResult.success ? "border-emerald-800" : "border-red-900"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {testResult.success
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <AlertCircle className="w-4 h-4 text-red-400" />}
                  <span className={testResult.success ? "text-emerald-300" : "text-red-300"}>
                    {testResult.success ? "Test Passed" : "Test Failed"}
                  </span>
                  <span className="text-slate-500 text-xs font-normal ml-auto">{testResult.elapsed_ms}ms total</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testResult.error && (
                  <div className="bg-red-950/40 border border-red-900 rounded p-3 text-red-300 text-xs font-mono">
                    {testResult.error}
                  </div>
                )}

                {testResult.success && (
                  <>
                    {/* Single-call proof banner */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-emerald-950/40 border border-emerald-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-emerald-400">{testResult.gemini_calls ?? "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Gemini API call(s)</p>
                      </div>
                      <div className="bg-blue-950/40 border border-blue-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-blue-400">{testResult.returned_count ?? "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">images returned</p>
                      </div>
                      <div className="bg-amber-950/40 border border-amber-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-amber-400">{testResult.batch_count ?? testBatchSize}</p>
                        <p className="text-xs text-slate-400 mt-0.5">batch requested</p>
                      </div>
                      <div className="bg-purple-950/40 border border-purple-900 rounded-lg p-3 text-center">
                        <p className="text-lg font-black text-purple-400 truncate">{testResult.knp ?? "Ψ3"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">KNP tag</p>
                      </div>
                    </div>

                    {/* RAW vs KNP comparison */}
                    {testRawVsKnp && testResult.raw_bytes && (
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wider">RAW vs KNP Comparison</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-500">RAW PNG (direct upload)</p>
                            <p className="text-lg font-bold text-slate-300">{fmtBytes(testResult.raw_bytes)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">KNP JPEG (after normalizer)</p>
                            <p className="text-lg font-bold text-emerald-400">
                              {testResult.images?.[0]?.compressed_bytes
                                ? fmtBytes(testResult.images[0].compressed_bytes * (testResult.images.length || 1))
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Per-image breakdown */}
                    {testResult.images && testResult.images.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Per-Image Results</p>
                        <div className="space-y-2">
                          {testResult.images.map((img, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-800/40 rounded p-2.5">
                              {img.url && (
                                <img
                                  src={img.url}
                                  alt={`Generated ${img.platform}`}
                                  className="w-12 h-12 object-cover rounded flex-shrink-0 border border-slate-700"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-white capitalize">{img.platform}</span>
                                  <span className="text-[10px] text-slate-500">image {i + 1}</span>
                                </div>
                                <div className="flex gap-3 mt-0.5">
                                  {img.original_bytes && (
                                    <span className="text-[10px] text-slate-500">raw: {fmtBytes(img.original_bytes)}</span>
                                  )}
                                  {img.compressed_bytes && (
                                    <span className="text-[10px] text-emerald-400">compressed: {fmtBytes(img.compressed_bytes)}</span>
                                  )}
                                  {img.compression_ratio && (
                                    <span className="text-[10px] text-blue-400">{img.compression_ratio.toFixed(2)}× ratio</span>
                                  )}
                                  {img.elapsed_ms && (
                                    <span className="text-[10px] text-slate-500">{img.elapsed_ms}ms</span>
                                  )}
                                </div>
                              </div>
                              {img.url && (
                                <a href={img.url} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] text-blue-400 hover:text-blue-300 flex-shrink-0">
                                  View ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test instructions */}
          {!testResult && !testRunning && (
            <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-5 text-sm text-slate-500">
              <p className="text-slate-300 font-medium mb-2">How this works</p>
              <p className="leading-relaxed">
                Fires a live call to <code className="text-slate-400">generate-image v31</code> with your chosen batch size.
                v31 sends <strong className="text-white">one</strong> Gemini API request for all N images, parsing
                all <code className="text-slate-400">inlineData</code> parts from the single response.
                With RAW + KNP mode, it also uploads the raw PNG baseline so you can compare bytes directly.
                All compression runs through <code className="text-slate-400">normalize-input v3</code> (WASM PNG→JPEG @ 72%).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
