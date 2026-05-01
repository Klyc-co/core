import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_PATHS: Record<string, string> = {
  clients: "/klyc_admin/clients",
  revenue: "/klyc_admin/revenue",
  infrastructure: "/klyc_admin/infrastructure",
  compression: "/klyc_admin/compression",
  subminds: "/klyc_admin/subminds",
  channels: "/klyc_admin/channels",
  dispatch: "/klyc_admin/dispatch",
  collaboration: "/klyc_admin/collaboration",
  voting: "/klyc_admin/voting",
  roadmap: "/klyc_admin/roadmap",
  marketing: "/klyc_admin/marketing",
  financials: "/klyc_admin/financials",
  ai_testing: "/klyc_admin/ai-testing",
  internal: "/klyc_admin/klyc-internal",
  audit: "/klyc_admin/audit",
};

const FN_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];
const RD_COLORS: Record<string, string> = {
  backlog: "#475569", planning: "#60a5fa", design: "#a78bfa",
  blocked: "#f87171", build: "#22d3ee", test: "#fbbf24", shipped: "#4ade80",
};
const SM_COLORS = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#06b6d4","#f97316","#ec4899","#94a3b8","#22d3ee","#a78bfa"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined) {
  return Number(n || 0).toLocaleString();
}
function fmtCost(n: number | string | null | undefined) {
  const v = parseFloat(String(n || 0));
  return v < 0.001 ? `$${v.toFixed(5)}` : `$${v.toFixed(3)}`;
}

type StatusColor = "green" | "yellow" | "red" | "gray";
const STATUS_DOT: Record<StatusColor, string> = {
  green: "#4ade80", yellow: "#fbbf24", red: "#f87171", gray: "#334155",
};

// ─── Component ────────────────────────────────────────────────────────────────

type TabId = "ai" | "roadmap" | "subminds" | "infra" | "team";

interface OvData {
  clientCount: number;
  campaignCount: number;
  aiTotal: number;
  aiCost: number;
  aiTokens: number;
  aiSuccessRate: number;
  aiErrors: number;
  submindCount: number;
  smSuccessRate: number;
  smTotal: number;
  rdShipped: number;
  rdActive: number;
  rdBlocked: number;
  rdPlanned: number;
  rdTotal: number;
  rdMap: Record<string, number>;
  billingCount: number;
  totalSessions: number;
  sessMap: Record<string, number>;
  aiByDay: { day: string; ok: number; err: number }[];
  aiByFn: { function_name: string; calls: number }[];
  rdByStatus: { status: string; n: number; color: string }[];
  submindHealth: { submind_id: string; calls: number; ok: number; err: number; lat: number }[];
  infraCounts: { label: string; value: number; color: string }[];
}

export default function KlycAdminOverview() {
  const navigate = useNavigate();
  const { logAction } = useAdminAuth();
  const [data, setData] = useState<OvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("ai");

  const fetchData = useCallback(async () => {
    try {
      const [
        clientsRes, campaignsRes, aiRes, aiDayRes, aiFnRes,
        rdRes, sessRes, smRes, smCountRes, infraRes, errRes, billingRes,
      ] = await Promise.all([
        supabase.from("client_profiles").select("id", { count: "exact", head: true }),
        supabase.from("campaign_drafts").select("id", { count: "exact", head: true }),
        supabase.rpc("exec_sql" as never, {
          query: `SELECT COUNT(*) as n, SUM(COALESCE(cost_estimate::numeric,0)) as cost, SUM(COALESCE(total_tokens,0)) as tokens, AVG(CASE WHEN status_code=200 THEN 1.0 ELSE 0 END)*100 as success_rate FROM ai_activity_log`,
        } as never).catch(() => ({ data: null })),
        supabase.from("ai_activity_log")
          .select("timestamp, status_code")
          .order("timestamp", { ascending: true })
          .limit(500)
          .then(r => r),
        supabase.from("ai_activity_log")
          .select("function_name")
          .limit(2000),
        supabase.from("roadmap_items").select("status"),
        supabase.from("orchestrator_sessions").select("status"),
        supabase.from("submind_health_snapshots")
          .select("submind_id, invocation_count, success_count, error_count, avg_latency_ms"),
        supabase.from("submind_health_snapshots")
          .select("submind_id", { count: "exact", head: false })
          .limit(1000),
        Promise.all([
          supabase.from("ai_activity_log").select("id", { count: "exact", head: true }),
          supabase.from("submind_health_snapshots").select("id", { count: "exact", head: true }),
          supabase.from("orchestrator_sessions").select("id", { count: "exact", head: true }),
          supabase.from("campaign_drafts").select("id", { count: "exact", head: true }),
          supabase.from("post_queue").select("id", { count: "exact", head: true }),
        ]),
        supabase.from("ai_activity_log").select("id", { count: "exact", head: true })
          .neq("status_code", 200),
        supabase.from("user_billing").select("id", { count: "exact", head: true })
          .eq("status", "active").maybeSingle().then(() => ({ count: 0 })).catch(() => ({ count: 0 })),
      ]);

      // Client / campaign counts
      const clientCount = clientsRes.count ?? 0;
      const campaignCount = campaignsRes.count ?? 0;

      // AI totals — fallback to direct query aggregation from day data
      const aiErrors = errRes.count ?? 0;
      const billingCount = (billingRes as any)?.count ?? 0;

      // Aggregate AI daily data client-side
      const dayMap: Record<string, { ok: number; err: number }> = {};
      (aiDayRes.data || []).forEach((row: any) => {
        const day = row.timestamp?.slice(0, 10) ?? "unknown";
        if (!dayMap[day]) dayMap[day] = { ok: 0, err: 0 };
        if (row.status_code === 200) dayMap[day].ok++;
        else dayMap[day].err++;
      });
      const aiByDay = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([day, v]) => ({ day: day.slice(5), ...v }));
      const aiTotal = (aiDayRes.data || []).length;
      const aiOk = (aiDayRes.data || []).filter((r: any) => r.status_code === 200).length;
      const aiSuccessRate = aiTotal > 0 ? Math.round((aiOk / aiTotal) * 100) : 0;

      // Function breakdown
      const fnMap: Record<string, number> = {};
      (aiFnRes.data || []).forEach((r: any) => {
        fnMap[r.function_name] = (fnMap[r.function_name] || 0) + 1;
      });
      const aiByFn = Object.entries(fnMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([function_name, calls]) => ({ function_name, calls }));

      // Roadmap
      const rdMap: Record<string, number> = {};
      (rdRes.data || []).forEach((r: any) => {
        rdMap[r.status] = (rdMap[r.status] || 0) + 1;
      });
      const rdShipped = rdMap["shipped"] || 0;
      const rdActive = (rdMap["build"] || 0) + (rdMap["test"] || 0);
      const rdBlocked = rdMap["blocked"] || 0;
      const rdPlanned = (rdMap["planning"] || 0) + (rdMap["design"] || 0);
      const rdTotal = Object.values(rdMap).reduce((a, b) => a + b, 0);
      const rdByStatus = Object.entries(rdMap)
        .filter(([, n]) => n > 0)
        .map(([status, n]) => ({ status: status === "blocked" ? "FUCKED" : status, n, color: RD_COLORS[status] || "#475569" }));

      // Sessions
      const sessMap: Record<string, number> = {};
      (sessRes.data || []).forEach((r: any) => {
        sessMap[r.status] = (sessMap[r.status] || 0) + 1;
      });
      const totalSessions = Object.values(sessMap).reduce((a, b) => a + b, 0);

      // Subminds
      const smAgg: Record<string, { calls: number; ok: number; err: number; lat: number[] }> = {};
      (smRes.data || []).forEach((r: any) => {
        if (!smAgg[r.submind_id]) smAgg[r.submind_id] = { calls: 0, ok: 0, err: 0, lat: [] };
        smAgg[r.submind_id].calls += r.invocation_count || 0;
        smAgg[r.submind_id].ok += r.success_count || 0;
        smAgg[r.submind_id].err += r.error_count || 0;
        smAgg[r.submind_id].lat.push(parseFloat(r.avg_latency_ms) || 0);
      });
      const submindHealth = Object.entries(smAgg)
        .sort(([, a], [, b]) => b.calls - a.calls)
        .slice(0, 10)
        .map(([submind_id, v]) => ({
          submind_id,
          calls: v.calls,
          ok: v.ok,
          err: v.err,
          lat: v.lat.length > 0 ? v.lat.reduce((a, b) => a + b, 0) / v.lat.length : 0,
        }));
      const smTotalCalls = submindHealth.reduce((a, r) => a + r.calls, 0);
      const smTotalOk = submindHealth.reduce((a, r) => a + r.ok, 0);
      const smSuccessRate = smTotalCalls > 0 ? Math.round((smTotalOk / smTotalCalls) * 100) : 0;
      const uniqueSm = new Set((smRes.data || []).map((r: any) => r.submind_id)).size;

      // Infra counts
      const [aiLogRes, ssRes, sessCntRes, campRes, queueRes] = infraRes;
      const infraCounts = [
        { label: "ai_activity_log", value: aiLogRes.count ?? 0, color: "#6366f1" },
        { label: "submind_snapshots", value: ssRes.count ?? 0, color: "#8b5cf6" },
        { label: "campaign_drafts", value: campRes.count ?? 0, color: "#06b6d4" },
        { label: "orchestrator_sessions", value: sessCntRes.count ?? 0, color: "#f59e0b" },
        { label: "post_queue", value: queueRes.count ?? 0, color: "#10b981" },
      ];

      setData({
        clientCount, campaignCount, aiTotal, aiCost: 0, aiTokens: 0,
        aiSuccessRate, aiErrors, submindCount: uniqueSm, smSuccessRate, smTotal: smTotalCalls,
        rdShipped, rdActive, rdBlocked, rdPlanned, rdTotal, rdMap, billingCount,
        totalSessions, sessMap, aiByDay, aiByFn, rdByStatus, submindHealth, infraCounts,
      });
    } catch (e) {
      console.error("Overview fetch error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    logAction("admin_overview_view");
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, [fetchData, logAction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading Overview…
        </div>
      </div>
    );
  }

  const d = data!;
  const nc = d.clientCount;
  const aiSuccStr = `${d.aiSuccessRate}%`;
  const smSuccStr = `${d.smSuccessRate}%`;

  const sectionCards: { id: string; icon: string; label: string; val: string; sub: string; status: StatusColor; tip: string }[] = [
    { id: "clients",       icon: "👥", label: "Clients",       val: fmt(d.clientCount),  sub: "registered",          status: nc > 0 ? "green" : "gray",   tip: `${fmt(d.clientCount)} registered clients. Target: 100 by mid-July 2026.` },
    { id: "revenue",       icon: "💳", label: "Revenue",       val: `$${d.billingCount * 99}`, sub: "est. MRR",      status: d.billingCount > 0 ? "green" : "gray", tip: `${d.billingCount} active billing subscriptions.` },
    { id: "infrastructure",icon: "📡", label: "Infra",         val: fmt(d.infraCounts[0]?.value), sub: "AI calls logged", status: d.infraCounts[0]?.value > 0 ? "green" : "yellow", tip: d.infraCounts.map(i => `${i.label}: ${fmt(i.value)}`).join(" · ") },
    { id: "compression",   icon: "⚡", label: "Compression",   val: "95.2×",             sub: "yield efficiency",    status: "green",   tip: "KNP V2.1 — THREE-TEST PROVEN Apr 21 2026. 95.2× yield efficiency, 90% cost savings." },
    { id: "subminds",      icon: "🧠", label: "Subminds",      val: `${d.submindCount} active`, sub: `${smSuccStr} success`, status: d.smSuccessRate >= 90 ? "green" : d.smSuccessRate >= 70 ? "yellow" : "red", tip: `${d.submindCount} distinct subminds. ${smSuccStr} global success rate.` },
    { id: "channels",      icon: "📻", label: "Channels",      val: "OAuth",             sub: "LinkedIn+Threads live", status: "yellow",  tip: "Twitter, LinkedIn, Threads, Snapchat OAuth in progress (~60%). LinkedIn + Threads post live." },
    { id: "dispatch",      icon: "🚀", label: "Dispatch",      val: fmt(d.totalSessions), sub: "sessions total",     status: d.totalSessions > 0 ? "green" : "gray", tip: `${fmt(d.totalSessions)} orchestrator sessions. ${Object.entries(d.sessMap).map(([k, v]) => `${k}: ${v}`).join(", ") || "none yet"}` },
    { id: "collaboration", icon: "💬", label: "Collab",        val: "—",                 sub: "pending tickets",     status: "yellow",  tip: "collaboration_tickets — populates as clients submit support requests." },
    { id: "voting",        icon: "👍", label: "Voting",        val: "—",                 sub: "pending votes",       status: "gray",    tip: "client_votes — populates once voting UI is live." },
    { id: "roadmap",       icon: "🗺️", label: "Roadmap",      val: fmt(d.rdShipped),    sub: "shipped",             status: d.rdShipped > 0 ? "green" : "yellow", tip: `Total: ${d.rdTotal} items. Shipped: ${d.rdShipped} · In build/test: ${d.rdActive} · FUCKED: ${d.rdBlocked}` },
    { id: "marketing",     icon: "📣", label: "Marketing",     val: "—",                 sub: "pending data",        status: "yellow",  tip: "KLYC marketing performance. Populates from platform_metrics_daily (pending migration)." },
    { id: "financials",    icon: "📈", label: "Financials",    val: "$0",                sub: "MRR",                 status: "gray",    tip: "billing_subscriptions pending migration. Target: 100 clients × $99+ by mid-July." },
    { id: "ai_testing",    icon: "🧪", label: "AI Perf",       val: `${fmt(d.aiTotal)} calls`, sub: `${aiSuccStr} success`, status: d.aiSuccessRate >= 90 ? "green" : d.aiSuccessRate >= 70 ? "yellow" : "red", tip: `${fmt(d.aiTotal)} total AI calls · ${d.aiErrors} errors` },
    { id: "internal",      icon: "🏢", label: "Internal",      val: "4 team",            sub: "108 hrs/wk",          status: "green",   tip: "Kitchens (36h) · Ethan K (40h) · Ethan W (20h) · Rohil (12h)" },
    { id: "audit",         icon: "🕐", label: "Audit Log",     val: "—",                 sub: "pending migration",   status: "yellow",  tip: "admin_audit_log — populates as admin actions are performed post-migration." },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: "ai", label: "AI Performance" },
    { id: "roadmap", label: "Roadmap" },
    { id: "subminds", label: "Subminds" },
    { id: "infra", label: "Infrastructure" },
    { id: "team", label: "Team" },
  ];

  const sprintItems = [
    { label: "Post end-to-end", sub: "All platforms · LinkedIn + Threads live", pct: 55, color: "#22d3ee" },
    { label: "OAuth — all platforms", sub: "Twitter, LinkedIn, Threads, Snapchat", pct: 60, color: "#818cf8" },
    { label: "Analytics", sub: "Client-facing metrics dashboard", pct: 20, color: "#fbbf24" },
    { label: "Klyc Chat", sub: "Real-time AI chat for clients", pct: 10, color: "#f97316" },
  ];

  return (
    <div className="space-y-5">
      {/* ── GOAL BANNER ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", color: "white" }}>
        <div>
          <div className="text-sm font-bold">Goal: 100 Active Clients by Mid-July 2026</div>
          <div className="text-xs opacity-80 mt-1">Post end-to-end · Analytics · Klyc Chat · {d.rdShipped} roadmap items shipped</div>
        </div>
        <div className="flex items-center gap-8">
          {[
            { val: nc, label: "Clients" },
            { val: d.aiTotal, label: "AI Calls" },
            { val: d.rdShipped, label: "Shipped" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-black">{fmt(val)}</div>
              <div className="text-[10px] opacity-75">{label}</div>
              {label === "Clients" && (
                <div className="mt-1 h-1 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <div className="h-1 rounded-full bg-white" style={{ width: `${Math.min(100, Math.round((nc / 100) * 100))}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── TOP KPI STRIP ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Clients", val: fmt(d.clientCount), sub: "Registered", accent: "" },
          { label: "AI Calls", val: fmt(d.aiTotal), sub: `${aiSuccStr} success`, accent: "text-indigo-400" },
          { label: "Campaigns", val: fmt(d.campaignCount), sub: "Drafts", accent: "" },
          { label: "Shipped", val: fmt(d.rdShipped), sub: "Roadmap items", accent: "text-emerald-400" },
          { label: "Subminds", val: String(d.submindCount), sub: `${smSuccStr} success`, accent: "" },
          { label: "FUCKED", val: String(d.rdBlocked), sub: "Critical blockers", accent: "text-red-400" },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-3 pb-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{kpi.label}</div>
              <div className={`text-2xl font-black ${kpi.accent || "text-white"}`}>{kpi.val}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── SECTION STATUS GRID ──────────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Section Status — hover for detail, click to navigate</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-5 gap-2">
            {sectionCards.map(s => (
              <button
                key={s.id}
                title={s.tip}
                onClick={() => navigate(SECTION_PATHS[s.id])}
                className="text-left rounded-md p-2.5 border border-slate-700 bg-slate-800 hover:border-indigo-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">{s.icon}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT[s.status] }} />
                </div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{s.label}</div>
                <div className="text-sm font-black text-white leading-tight">{s.val}</div>
                <div className="text-[9px] text-slate-600 mt-0.5">{s.sub}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── ANALYTICS TABS ───────────────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-0 pt-3">
          <div className="flex gap-0 border-b border-slate-800">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${tab === t.id ? "text-indigo-400 border-indigo-500" : "text-slate-500 border-transparent hover:text-slate-300"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-4">

          {/* AI PERFORMANCE */}
          {tab === "ai" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Calls per Day (last 30)</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={d.aiByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 8 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 11 }} />
                      <Bar dataKey="ok" stackId="s" fill="#10b981" name="OK" />
                      <Bar dataKey="err" stackId="s" fill="#ef4444" name="Error" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">By Function</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={d.aiByFn} dataKey="calls" nameKey="function_name" cx="40%" cy="50%" outerRadius={65} paddingAngle={2}>
                        {d.aiByFn.map((_, i) => <Cell key={i} fill={FN_COLORS[i % FN_COLORS.length]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: "#94a3b8" }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "TOTAL CALLS", val: fmt(d.aiTotal), color: "#818cf8" },
                  { label: "SUCCESS RATE", val: aiSuccStr, color: d.aiSuccessRate >= 90 ? "#4ade80" : "#fbbf24" },
                  { label: "ERRORS", val: fmt(d.aiErrors), color: d.aiErrors > 0 ? "#f87171" : "#4ade80" },
                  { label: "SUBMINDS", val: String(d.submindCount), color: "#f1f5f9" },
                ].map(k => (
                  <div key={k.label} className="bg-slate-800 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 font-semibold mb-1">{k.label}</div>
                    <div className="text-xl font-black" style={{ color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROADMAP */}
          {tab === "roadmap" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Status Distribution</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={d.rdByStatus} dataKey="n" nameKey="status" cx="40%" cy="50%" outerRadius={75} paddingAngle={2}>
                      {d.rdByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "SHIPPED", val: d.rdShipped, bg: "#052e16", color: "#4ade80" },
                    { label: "IN BUILD/TEST", val: d.rdActive, bg: "#164e63", color: "#22d3ee" },
                    { label: "PLANNED", val: d.rdPlanned, bg: "#1e1b4b", color: "#a78bfa" },
                    { label: "FUCKED", val: d.rdBlocked, bg: "#450a0a", color: "#f87171" },
                  ].map(k => (
                    <div key={k.label} className="rounded-md p-3" style={{ background: k.bg }}>
                      <div className="text-[9px] font-bold mb-1" style={{ color: k.color }}>{k.label}</div>
                      <div className="text-2xl font-black" style={{ color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800 rounded-md p-3">
                  <div className="text-[9px] text-slate-500 font-semibold mb-2">COMPLETION</div>
                  <div className="h-1.5 bg-slate-700 rounded-full">
                    <div className="h-1.5 bg-emerald-400 rounded-full transition-all" style={{ width: `${d.rdTotal > 0 ? Math.round((d.rdShipped / d.rdTotal) * 100) : 0}%` }} />
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">{d.rdShipped} of {d.rdTotal} items shipped ({d.rdTotal > 0 ? Math.round((d.rdShipped / d.rdTotal) * 100) : 0}%)</div>
                </div>
              </div>
            </div>
          )}

          {/* SUBMINDS */}
          {tab === "subminds" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Invocations per Submind</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.submindHealth} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="submind_id" tick={{ fill: "#475569", fontSize: 7 }} />
                    <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 11 }} />
                    <Bar dataKey="ok" stackId="s" fill="#10b981" name="OK" />
                    <Bar dataKey="err" stackId="s" fill="#ef4444" name="Error" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-y-auto max-h-52">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left py-1.5 pr-2">Submind</th>
                      <th className="text-right py-1.5 pr-2">Calls</th>
                      <th className="text-right py-1.5 pr-2">Success%</th>
                      <th className="text-right py-1.5">Avg ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.submindHealth.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-slate-500 py-8">No submind data yet</td></tr>
                    ) : d.submindHealth.map((r, i) => {
                      const sr = r.calls > 0 ? Math.round((r.ok / r.calls) * 100) : 0;
                      return (
                        <tr key={r.submind_id} className="border-b border-slate-800/50 text-slate-300">
                          <td className="py-1.5 pr-2 font-medium text-[10px]">
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: SM_COLORS[i % SM_COLORS.length] }} />
                            {r.submind_id}
                          </td>
                          <td className="text-right pr-2 font-mono">{fmt(r.calls)}</td>
                          <td className="text-right pr-2">
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${sr >= 90 ? "bg-emerald-900 text-emerald-300" : sr >= 70 ? "bg-yellow-900 text-yellow-300" : "bg-red-900 text-red-300"}`}>{sr}%</span>
                          </td>
                          <td className="text-right font-mono text-slate-400">{r.lat.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INFRASTRUCTURE */}
          {tab === "infra" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Row Counts by Table</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.infraCounts} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} width={120} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 11 }} />
                    <Bar dataKey="value" name="Rows" radius={[0, 3, 3, 0]}>
                      {d.infraCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left py-1.5">Table</th>
                      <th className="text-right py-1.5">Rows</th>
                      <th className="text-right py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...d.infraCounts, { label: "platform_metrics_daily", value: -1, color: "#fbbf24" }, { label: "admin_audit_log", value: -1, color: "#fbbf24" }].map(t => (
                      <tr key={t.label} className="border-b border-slate-800/50 text-slate-300">
                        <td className="py-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5" style={{ background: t.value > 0 ? "#4ade80" : t.value === 0 ? "#fbbf24" : "#334155", display: "inline-block" }} />
                          <span className="text-[10px] font-mono">{t.label}</span>
                        </td>
                        <td className="text-right font-mono text-slate-400">{t.value >= 0 ? fmt(t.value) : "—"}</td>
                        <td className="text-right">
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${t.value > 0 ? "bg-emerald-900 text-emerald-300" : t.value === 0 ? "bg-yellow-900 text-yellow-300" : "bg-slate-700 text-slate-400"}`}>
                            {t.value > 0 ? "live" : t.value === 0 ? "empty" : "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(d.sessMap).length > 0 && (
                  <div className="bg-slate-800 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 font-semibold mb-2">DISPATCH SESSIONS</div>
                    {Object.entries(d.sessMap).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">{k}</span>
                        <span className="font-mono text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEAM */}
          {tab === "team" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <table className="w-full text-xs mb-3">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left py-1.5">Name</th>
                      <th className="text-left py-1.5">Role</th>
                      <th className="text-right py-1.5">hrs/wk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Kitchens", role: "Founder / All", hrs: 36 },
                      { name: "Ethan K", role: "Algorithms / Backend", hrs: 40 },
                      { name: "Ethan W", role: "Platform / UI", hrs: 20 },
                      { name: "Rohil", role: "Image Quality", hrs: 12 },
                    ].map(m => (
                      <tr key={m.name} className="border-b border-slate-800/50 text-slate-300">
                        <td className="py-2 font-semibold">{m.name}</td>
                        <td className="py-2 text-slate-400">{m.role}</td>
                        <td className="py-2 text-right font-mono">{m.hrs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-800 rounded-md p-3">
                  <div className="text-[9px] text-slate-500 font-semibold mb-1">TOTAL CAPACITY</div>
                  <div className="text-2xl font-black text-indigo-400">108 hrs/wk</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">across 4 team members</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Sprint — must-ship features</div>
                {sprintItems.map(f => (
                  <div key={f.label} className="mb-4">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-semibold text-white">{f.label}</span>
                      <span className="text-xs font-bold" style={{ color: f.color }}>{f.pct}%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1">{f.sub}</div>
                    <div className="h-1 bg-slate-800 rounded-full">
                      <div className="h-1 rounded-full transition-all" style={{ width: `${f.pct}%`, background: f.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
