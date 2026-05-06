import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, RefreshCw } from "lucide-react";

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  equity_type: string;
  total_pct: number;
  immediate_pct: number;
  vesting_pct: number;
  vest_months: number | null;
  vest_notes: string | null;
  valuation_usd: number;
  sort_order: number;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  hard:        { bg: "bg-indigo-900/60",  text: "text-indigo-300",  label: "Hard" },
  vesting:     { bg: "bg-violet-900/60",  text: "text-violet-300",  label: "Vesting" },
  milestone:   { bg: "bg-amber-900/60",   text: "text-amber-300",   label: "Milestone" },
  sales_vest:  { bg: "bg-emerald-900/60", text: "text-emerald-300", label: "Sales Vest" },
  board_grant: { bg: "bg-sky-900/60",     text: "text-sky-300",     label: "Board Grant" },
  pool:        { bg: "bg-slate-700/60",   text: "text-slate-400",   label: "Pool" },
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#0ea5e9", "#94a3b8"];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function DonutChart({ data }: { data: { name: string; pct: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.pct, 0);
  let cumAngle = -Math.PI / 2;
  const r = 80, cx = 100, cy = 100;

  const slices = data.map((d) => {
    const angle = (d.pct / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return {
      path: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
      color: d.color,
      name: d.name,
      pct: d.pct,
    };
  });

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[180px]">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.85} />
      ))}
      <circle cx={cx} cy={cy} r={52} fill="#0f172a" />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="bold">
        {total.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize="9">
        allocated
      </text>
    </svg>
  );
}

export default function KlycAdminCapTable() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(false);
    const { data, error } = await supabase
      .from("cap_table_stakeholders")
      .select("*")
      .order("sort_order");
    if (error || !data) {
      setError(true);
    } else {
      setStakeholders(data);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm animate-pulse">Loading cap table…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-red-400 text-sm font-semibold">Failed to load cap table</div>
        <button
          onClick={fetchData}
          className="text-xs text-indigo-400 border border-indigo-800 rounded px-3 py-1.5 hover:bg-indigo-950 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const pool = stakeholders.find((s) => s.equity_type === "pool");
  const nonPool = stakeholders.filter((s) => s.equity_type !== "pool");
  const totalAllocated = nonPool.reduce((s, r) => s + r.total_pct, 0);
  const hardPct = stakeholders
    .filter((s) => s.equity_type === "hard")
    .reduce((s, r) => s + r.total_pct, 0);
  const vestingPct = stakeholders
    .filter((s) => ["vesting", "milestone", "sales_vest", "board_grant"].includes(s.equity_type))
    .reduce((s, r) => s + r.total_pct, 0);
  const valuation = stakeholders[0]?.valuation_usd ?? 20_000_000;

  const chartData = nonPool.map((s, i) => ({
    name: s.name,
    pct: s.total_pct,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const kpis = [
    {
      label: "Total Allocated",
      value: `${totalAllocated.toFixed(1)}%`,
      sub: fmt(valuation * (totalAllocated / 100)),
    },
    {
      label: "Hard Equity",
      value: `${hardPct.toFixed(1)}%`,
      sub: fmt(valuation * (hardPct / 100)),
    },
    {
      label: "Vesting / Earn-in",
      value: `${vestingPct.toFixed(1)}%`,
      sub: fmt(valuation * (vestingPct / 100)),
    },
    {
      label: "Unallocated Pool",
      value: `${(pool?.total_pct ?? 0).toFixed(1)}%`,
      sub: fmt(valuation * ((pool?.total_pct ?? 0) / 100)),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PieChart className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-xl font-semibold text-white">Cap Table</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Paper valuation · ${(valuation / 1_000_000).toFixed(0)}M pre-money · {nonPool.length} stakeholders
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded px-3 py-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Table + Donut */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 200px" }}>
        {/* Stakeholder Table */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Stakeholder</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Type</th>
                <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Total %</th>
                <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Immediate</th>
                <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Vesting</th>
                <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Paper Value</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((s, i) => {
                const ts = TYPE_STYLES[s.equity_type] ?? TYPE_STYLES.pool;
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-700/30 ${i % 2 !== 0 ? "bg-slate-800/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ts.bg} ${ts.text}`}
                      >
                        {ts.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {s.total_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {s.immediate_pct > 0 ? `${s.immediate_pct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {s.vesting_pct > 0 ? (
                        <>
                          {s.vesting_pct.toFixed(1)}%
                          {s.vest_months && (
                            <span className="text-slate-500 text-xs ml-1">/{s.vest_months}mo</span>
                          )}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {s.equity_type === "pool" ? (
                        <span className="text-slate-500">reserved</span>
                      ) : (
                        <span className="text-emerald-400">{fmt(valuation * (s.total_pct / 100))}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.vest_notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Donut Chart */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 flex flex-col items-center gap-4">
          <div className="text-xs text-slate-400 font-medium self-start">Distribution</div>
          <DonutChart data={chartData} />
          <div className="space-y-1.5 w-full">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-slate-300 truncate">{d.name}</span>
                </div>
                <span className="text-slate-400 ml-2 flex-shrink-0">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-600">
        Paper values based on ${(valuation / 1_000_000).toFixed(0)}M pre-money valuation. Not a legal instrument.
        Vesting schedules subject to executed agreements.
      </p>
    </div>
  );
}
