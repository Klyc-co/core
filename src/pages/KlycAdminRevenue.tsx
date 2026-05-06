import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, TrendingDown, RefreshCw, Calendar,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

const TIER_COLORS: Record<string, string> = {
  starter: "#3b82f6",
  growth: "#22c55e",
  pro: "#a855f7",
  enterprise: "#eab308",
};

const TIER_PRICES: Record<string, number> = {
  starter: 99,
  growth: 350,
  pro: 1000,
  enterprise: 2500,
};

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });

interface Subscription {
  id: string;
  client_id: string;
  tier: string;
  monthly_price: number;
  status: string;
  started_at: string;
  cancelled_at: string | null;
  trial_end: string | null;
}

interface DailyMetric {
  date: string;
  mrr: number | null;
  api_cost_actual: number | null;
  total_clients: number;
  trial_clients: number;
  clients_by_tier: Record<string, number> | null;
}

type Scenario = "conservative" | "moderate" | "aggressive";

export default function KlycAdminRevenue() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [scenario, setScenario] = useState<Scenario>("moderate");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: subData }, { data: metData }] = await Promise.all([
      supabase.from("billing_subscriptions").select("*").order("started_at", { ascending: false }),
      supabase.from("platform_metrics_daily").select("date, mrr, api_cost_actual, total_clients, trial_clients, clients_by_tier").order("date", { ascending: true }).limit(365),
    ]);
    setSubs((subData as Subscription[]) ?? []);
    setMetrics((metData as DailyMetric[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ──

  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trial");
  const tierBreakdown = Object.entries(TIER_PRICES).map(([tier, price]) => {
    const count = activeSubs.filter((s) => s.tier === tier).length;
    const mrr = count * price;
    return { tier, count, price, mrr };
  });
  const totalMRR = tierBreakdown.reduce((a, b) => a + b.mrr, 0);

  const mrrChartData = tierBreakdown.map((t) => ({
    name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1),
    mrr: t.mrr,
    fill: TIER_COLORS[t.tier],
  }));

  const monthlyMRR = metrics
    .filter((m) => m.mrr !== null)
    .reduce<Record<string, number>>((acc, m) => {
      const mo = m.date.slice(0, 7);
      acc[mo] = m.mrr!;
      return acc;
    }, {});
  const mrrMonths = Object.entries(monthlyMRR).sort(([a], [b]) => a.localeCompare(b));
  const mrrGrowthData = mrrMonths.map(([month, mrr], i) => {
    const prev = i > 0 ? mrrMonths[i - 1][1] : mrr;
    const growth = prev > 0 ? ((mrr - prev) / prev) * 100 : 0;
    return { month: month.slice(5), mrr, growth: +growth.toFixed(1) };
  });

  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
  const newMRR = subs
    .filter((s) => (s.status === "active" || s.status === "trial") && new Date(s.started_at) > thirtyAgo)
    .reduce((a, s) => a + s.monthly_price, 0);
  const churnedMRR = subs
    .filter((s) => s.status === "cancelled" && s.cancelled_at && new Date(s.cancelled_at) > thirtyAgo)
    .reduce((a, s) => a + s.monthly_price, 0);
  const netNewMRR = newMRR - churnedMRR;

  // ── Projections ──
  const currentGrowth = mrrGrowthData.length > 1 ? mrrGrowthData[mrrGrowthData.length - 1].growth : 5;
  const multipliers: Record<Scenario, number> = { conservative: 0.5, moderate: 1, aggressive: 1.5 };
  const rate = (currentGrowth / 100) * multipliers[scenario];
  const baseMRR = totalMRR || 1000;
  const projectionData = Array.from({ length: 12 }, (_, i) => {
    const projected = baseMRR * Math.pow(1 + rate, i + 1);
    return { month: `M${i + 1}`, mrr: Math.round(projected), arr: Math.round(projected * 12) };
  });

  // ── Per-Tier Economics ──
  const avgCostPerClient = metrics.length > 0 && metrics[metrics.length - 1].api_cost_actual
    ? (metrics[metrics.length - 1].api_cost_actual! / Math.max(activeSubs.length, 1))
    : 15;
  const tierEconomics = Object.entries(TIER_PRICES).map(([tier, price]) => {
    const cost = tier === "starter" ? avgCostPerClient * 0.6 : tier === "growth" ? avgCostPerClient : tier === "pro" ? avgCostPerClient * 1.5 : avgCostPerClient * 2;
    const margin = price - cost;
    const marginPct = (margin / price) * 100;
    const avgRetention = tier === "starter" ? 6 : tier === "growth" ? 12 : tier === "pro" ? 18 : 24;
    const ltv = price * avgRetention;
    return { tier, revenue: price, cost: +cost.toFixed(0), margin: +margin.toFixed(0), marginPct: +marginPct.toFixed(1), ltv };
  });

  // ── Trial conversion — use trial_end presence as proxy for "was a trial" ──
  const trialSubs = subs.filter((s) => s.trial_end !== null);
  const convertedTrials = trialSubs.filter((s) => s.status === "active");
  const trialConvRate = trialSubs.length > 0 ? ((convertedTrials.length / trialSubs.length) * 100) : 0;

  const funnelData = [
    { name: "Trials Started", value: trialSubs.length || 0, fill: "#3b82f6" },
    { name: "Completed Trial", value: Math.max(0, trialSubs.filter(s => s.trial_end && new Date(s.trial_end) < now).length), fill: "#a855f7" },
    { name: "Converted to Paid", value: convertedTrials.length, fill: "#22c55e" },
  ];

  // ── Upcoming renewals ──
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  const renewals = activeSubs.filter((s) => {
    const start = new Date(s.started_at);
    const nextRenewal = new Date(start);
    nextRenewal.setMonth(nextRenewal.getMonth() + Math.ceil((now.getTime() - start.getTime()) / (30 * 86400000)));
    return nextRenewal <= in30Days && nextRenewal >= now;
  });

  const marginColor = (pct: number) => pct > 70 ? "text-green-400" : pct > 50 ? "text-yellow-400" : "text-red-400";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Revenue & Financials</h1>
        <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── SECTION 1: MRR Breakdown ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">MRR Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Total MRR</p>
              <p className="text-2xl font-bold text-white">{fmt(totalMRR)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">New MRR (30d)</p>
              <p className="text-xl font-bold text-green-400 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" />{fmt(newMRR)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Churned MRR (30d)</p>
              <p className="text-xl font-bold text-red-400 flex items-center gap-1"><ArrowDownRight className="w-4 h-4" />{fmt(churnedMRR)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Net New MRR</p>
              <p className={`text-xl font-bold ${netNewMRR >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(netNewMRR)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">MRR by Tier</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mrrChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="mrr" radius={[4, 4, 0, 0]}>
                    {mrrChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">MRR Growth Rate (MoM %)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mrrGrowthData.length > 0 ? mrrGrowthData : [{ month: "Now", growth: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="growth" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Tier</th><th className="text-right p-3">Clients</th><th className="text-right p-3">Price</th><th className="text-right p-3">MRR</th><th className="text-right p-3">% of Total</th>
              </tr></thead>
              <tbody>
                {tierBreakdown.map((t) => (
                  <tr key={t.tier} className="border-b border-slate-800/50 text-slate-200">
                    <td className="p-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLORS[t.tier] }} />
                      {t.tier.charAt(0).toUpperCase() + t.tier.slice(1)}
                    </td>
                    <td className="text-right p-3">{t.count}</td>
                    <td className="text-right p-3">{fmt(t.price)}</td>
                    <td className="text-right p-3 font-medium">{fmt(t.mrr)}</td>
                    <td className="text-right p-3">{totalMRR > 0 ? ((t.mrr / totalMRR) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 2: Revenue Projections ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Revenue Projections (12-Month)</h2>
          <div className="flex gap-1">
            {(["conservative", "moderate", "aggressive"] as Scenario[]).map((s) => (
              <Button key={s} size="sm" variant={scenario === s ? "default" : "outline"}
                className={scenario === s ? "" : "border-slate-700 text-slate-400 hover:bg-slate-800"}
                onClick={() => setScenario(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="mrr" stroke="#22c55e" strokeWidth={2} name="Projected MRR" />
                <Line type="monotone" dataKey="arr" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Projected ARR" />
                <Legend wrapperStyle={{ color: "#94a3b8" }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 text-center">
              <span className="text-slate-400 text-sm">Month 12 ARR: </span>
              <span className="text-white font-bold text-lg">{fmt(projectionData[11]?.arr ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 3: Per-Tier Economics ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Per-Tier Economics</h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Tier</th><th className="text-right p-3">Revenue</th><th className="text-right p-3">Est. Cost</th><th className="text-right p-3">Margin</th><th className="text-right p-3">Margin %</th><th className="text-right p-3">Est. LTV</th>
              </tr></thead>
              <tbody>
                {tierEconomics.map((t) => (
                  <tr key={t.tier} className="border-b border-slate-800/50 text-slate-200">
                    <td className="p-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLORS[t.tier] }} />
                      {t.tier.charAt(0).toUpperCase() + t.tier.slice(1)}
                    </td>
                    <td className="text-right p-3">{fmt(t.revenue)}/mo</td>
                    <td className="text-right p-3">{fmt(t.cost)}/mo</td>
                    <td className="text-right p-3 font-medium">{fmt(t.margin)}/mo</td>
                    <td className={`text-right p-3 font-semibold ${marginColor(t.marginPct)}`}>{t.marginPct}%</td>
                    <td className="text-right p-3">{fmt(t.ltv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 4: Billing Operations ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Billing Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><Calendar className="w-4 h-4" /> Upcoming Renewals (30d)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white mb-3">{renewals.length}</p>
              {renewals.length === 0 ? (
                <p className="text-slate-500 text-sm">No renewals in the next 30 days</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {renewals.slice(0, 10).map((s) => (
                    <div key={s.id} className="flex justify-between text-sm text-slate-300">
                      <span className="truncate">{s.client_id.slice(0, 8)}…</span>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: TIER_COLORS[s.tier], color: TIER_COLORS[s.tier] }}>{s.tier}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Trial → Paid Conversion</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white mb-1">{trialConvRate.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 mb-3">{convertedTrials.length} converted / {trialSubs.length} trials</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Failed Payments</CardTitle></CardHeader>
          <CardContent>
            {subs.filter((s) => s.status === "past_due").length === 0 ? (
              <p className="text-slate-500 text-sm">No failed payments 🎉</p>
            ) : (
              <div className="space-y-2">
                {subs.filter((s) => s.status === "past_due").map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <div>
                      <span className="text-sm text-slate-200">{s.client_id.slice(0, 8)}…</span>
                      <span className="text-xs text-slate-500 ml-2">{fmt(s.monthly_price)}/mo</span>
                    </div>
                    <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
