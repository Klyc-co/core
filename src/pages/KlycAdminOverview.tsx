import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, DollarSign, TrendingUp, TrendingDown, Percent, Zap,
  AlertTriangle, AlertCircle, Info, ShieldAlert,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ──

interface DailyMetric {
  date: string;
  total_clients: number;
  clients_by_tier: Record<string, number> | null;
  total_campaigns: number;
  total_tokens_used: number;
  total_tokens_saved: number;
  avg_compression_ratio: number | null;
  api_cost_actual: number | null;
  api_cost_without_compression: number | null;
  mrr: number | null;
}

interface Alert {
  id: string;
  severity: "CRITICAL" | "ALARM" | "WARNING" | "INFO";
  metric: string;
  currentValue: string;
  threshold: string;
  since: string;
}

// ── Helpers ──

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const num = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

const TIER_COLORS: Record<string, string> = {
  starter: "#6366f1",
  growth: "#22d3ee",
  pro: "#f59e0b",
  enterprise: "#ec4899",
};

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, ALARM: 1, WARNING: 2, INFO: 3 };
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  ALARM: "bg-orange-500 text-white",
  WARNING: "bg-yellow-500 text-black",
  INFO: "bg-blue-500 text-white",
};
const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  CRITICAL: <ShieldAlert className="w-3 h-3" />,
  ALARM: <AlertCircle className="w-3 h-3" />,
  WARNING: <AlertTriangle className="w-3 h-3" />,
  INFO: <Info className="w-3 h-3" />,
};

// ── Threshold-based alert computation ──

function computeAlerts(latest: DailyMetric | null): Alert[] {
  if (!latest) return [];
  const alerts: Alert[] = [];
  const now = latest.date;

  const compression = latest.avg_compression_ratio ?? 0;
  if (compression < 0.3) {
    alerts.push({ id: "comp-crit", severity: "CRITICAL", metric: "Compression Ratio", currentValue: pct(compression * 100), threshold: "> 30%", since: now });
  } else if (compression < 0.5) {
    alerts.push({ id: "comp-warn", severity: "WARNING", metric: "Compression Ratio", currentValue: pct(compression * 100), threshold: "> 50%", since: now });
  }

  const costActual = latest.api_cost_actual ?? 0;
  const costWithout = latest.api_cost_without_compression ?? 1;
  const margin = costWithout > 0 ? ((costWithout - costActual) / costWithout) * 100 : 100;
  if (margin < 60) {
    alerts.push({ id: "margin-alarm", severity: "ALARM", metric: "Gross Margin", currentValue: pct(margin), threshold: "> 60%", since: now });
  } else if (margin < 70) {
    alerts.push({ id: "margin-warn", severity: "WARNING", metric: "Gross Margin", currentValue: pct(margin), threshold: "> 70%", since: now });
  }

  if (latest.total_tokens_used > 10_000_000) {
    alerts.push({ id: "tokens-warn", severity: "WARNING", metric: "Daily Token Usage", currentValue: num(latest.total_tokens_used), threshold: "< 10M", since: now });
  }

  return alerts.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
}

// ── Month label helper ──
function monthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ── Component ──

export default function KlycAdminOverview() {
  const { logAction } = useAdminAuth();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("platform_metrics_daily")
      .select("*")
      .order("date", { ascending: true })
      .limit(365);
    setMetrics((data as DailyMetric[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    logAction("admin_overview_view");
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData, logAction]);

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const prevMonth = metrics.length > 1 ? metrics[metrics.length - 2] : null;

  // KPI computations
  const totalClients = latest?.total_clients ?? 0;
  const clientsTrend = prevMonth ? totalClients - (prevMonth.total_clients ?? 0) : 0;
  const mrr = latest?.mrr ?? 0;
  const prevMrr = prevMonth?.mrr ?? 0;
  const mrrChange = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;
  const arr = mrr * 12;
  const costActual = latest?.api_cost_actual ?? 0;
  const costWithout = latest?.api_cost_without_compression ?? 1;
  const grossMargin = costWithout > 0 ? ((costWithout - costActual) / costWithout) * 100 : 100;
  const compression = (latest?.avg_compression_ratio ?? 0) * 100;
  const prevCompression = (prevMonth?.avg_compression_ratio ?? 0) * 100;
  const compressionTrend = compression - prevCompression;

  const marginColor = grossMargin >= 80 ? "text-emerald-400" : grossMargin >= 70 ? "text-yellow-400" : "text-red-400";

  // Chart data — last 12 months
  const chartData = metrics.slice(-12).map((m) => ({
    month: monthLabel(m.date),
    starter: (m.clients_by_tier as any)?.starter ?? 0,
    growth: (m.clients_by_tier as any)?.growth ?? 0,
    pro: (m.clients_by_tier as any)?.pro ?? 0,
    enterprise: (m.clients_by_tier as any)?.enterprise ?? 0,
    mrr: m.mrr ?? 0,
    revenue: m.api_cost_without_compression ?? 0,
    cost: m.api_cost_actual ?? 0,
  }));

  const alerts = computeAlerts(latest);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">Loading metrics…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Active Clients"
          value={num(totalClients)}
          trend={clientsTrend}
          trendLabel="vs last period"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5" />}
          label="MRR"
          value={usd(mrr)}
          trend={mrrChange}
          trendLabel={`${mrrChange >= 0 ? "+" : ""}${pct(mrrChange)} MoM`}
          trendIsPct
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5" />}
          label="ARR Projection"
          value={usd(arr)}
        />
        <KpiCard
          icon={<Percent className="w-5 h-5" />}
          label="Gross Margin"
          value={pct(grossMargin)}
          valueClassName={marginColor}
        />
        <KpiCard
          icon={<Zap className="w-5 h-5" />}
          label="Compression Ratio"
          value={pct(compression)}
          trend={compressionTrend}
          trendLabel="vs last period"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Client Growth by Tier */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Client Growth by Tier</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {Object.entries(TIER_COLORS).map(([tier, color]) => (
                  <Area key={tier} type="monotone" dataKey={tier} stackId="1" fill={color} stroke={color} fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR by Tier */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">MRR by Tier</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {Object.entries(TIER_COLORS).map(([tier, color]) => (
                  <Bar key={tier} dataKey={tier} stackId="1" fill={color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue vs Cost */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Revenue vs Cost</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} name="Revenue" />
                <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Active Alerts */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No active alerts — all systems nominal.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="text-left py-2 px-2">Severity</th>
                    <th className="text-left py-2 px-2">Metric</th>
                    <th className="text-left py-2 px-2">Current</th>
                    <th className="text-left py-2 px-2">Threshold</th>
                    <th className="text-left py-2 px-2">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-slate-800 text-slate-200">
                      <td className="py-2 px-2">
                        <Badge className={`${SEVERITY_COLORS[alert.severity]} text-[10px] gap-1`}>
                          {SEVERITY_ICONS[alert.severity]}
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 font-medium">{alert.metric}</td>
                      <td className="py-2 px-2 font-mono">{alert.currentValue}</td>
                      <td className="py-2 px-2 text-slate-400">{alert.threshold}</td>
                      <td className="py-2 px-2 text-slate-400">{alert.since}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {metrics.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg font-medium">No metrics data yet</p>
          <p className="text-sm mt-1">Metrics will populate as the platform collects daily snapshots.</p>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──

function KpiCard({
  icon, label, value, trend, trendLabel, trendIsPct, valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  trendIsPct?: boolean;
  valueClassName?: string;
}) {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${valueClassName ?? "text-white"}`}>{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trendIsPct ? trendLabel : `${isPositive ? "+" : ""}${trend} ${trendLabel ?? ""}`}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
