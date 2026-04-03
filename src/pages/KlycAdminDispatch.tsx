import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  Activity, AlertTriangle, ChevronDown, Clock, Gauge, RefreshCw,
  RotateCcw, XCircle, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ── Types ── */
interface Session {
  id: string;
  user_id: string;
  intent: string | null;
  status: string | null;
  current_phase: string | null;
  active_subminds: string[] | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  client_name?: string;
  tier?: string;
  priority?: string;
}

/* ── Helpers ── */
const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  routing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approval: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  complete: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ROW_BG: Record<string, string> = {
  queued: "bg-yellow-500/5",
  routing: "bg-blue-500/5",
  processing: "bg-blue-500/5",
  approval: "bg-purple-500/5",
  complete: "bg-emerald-500/5",
  completed: "bg-emerald-500/5",
  failed: "bg-red-500/5",
};

const INTENT_LABELS: Record<string, string> = {
  CAMPAIGN_NEW: "New Campaign",
  TREND_ANALYSIS: "Trend Analysis",
  PERFORMANCE_REVIEW: "Performance Review",
  CONTENT_REVISION: "Content Revision",
  LEARNING_REPORT: "Learning Report",
};

const SUBMIND_COLORS: Record<string, string> = {
  Research: "bg-cyan-500",
  Product: "bg-orange-500",
  Narrative: "bg-violet-500",
  Creative: "bg-pink-500",
  Social: "bg-blue-500",
  Image: "bg-emerald-500",
  Approval: "bg-yellow-500",
  Viral: "bg-red-500",
  Analytics: "bg-indigo-500",
  Learning: "bg-teal-500",
};

function elapsed(start: string, end?: string | null) {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function truncId(id: string) {
  return id.slice(0, 8);
}

/* ── Mock generators ── */
function generateMockSessions(): Session[] {
  const intents = ["CAMPAIGN_NEW", "TREND_ANALYSIS", "PERFORMANCE_REVIEW", "CONTENT_REVISION", "LEARNING_REPORT"];
  const statuses = ["queued", "routing", "processing", "approval", "completed", "failed"];
  const phases = ["Phase 1: Research", "Phase 2: Narrative + Creative", "Phase 3: Social + Image", "Phase 4: Approval"];
  const clients = [
    { name: "Brew & Beyond", tier: "growth" },
    { name: "TechNova AI", tier: "pro" },
    { name: "GreenLeaf Co", tier: "starter" },
    { name: "UrbanFit", tier: "enterprise" },
    { name: "Pixel Perfect", tier: "growth" },
    { name: "KLYC", tier: "enterprise" },
  ];
  const submindSets = [
    ["Research"], ["Research", "Product"], ["Narrative", "Creative"],
    ["Social", "Image"], ["Approval"], ["Research", "Product", "Narrative", "Creative"],
  ];

  return Array.from({ length: 18 }, (_, i) => {
    const st = statuses[i % statuses.length];
    const client = clients[i % clients.length];
    const start = new Date(Date.now() - Math.random() * 3600000);
    return {
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      intent: intents[i % intents.length],
      status: st,
      current_phase: st === "processing" ? phases[Math.floor(Math.random() * phases.length)] : null,
      active_subminds: ["processing", "routing"].includes(st) ? submindSets[i % submindSets.length] : null,
      started_at: start.toISOString(),
      completed_at: ["completed", "failed"].includes(st) ? new Date(start.getTime() + Math.random() * 120000).toISOString() : null,
      error_message: st === "failed" ? ["Timeout on Creative submind", "Rate limit exceeded", "API error from image provider"][i % 3] : null,
      client_name: client.name,
      tier: client.tier,
      priority: i < 3 ? "high" : "normal",
    };
  });
}

function generateQueueHistory() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${(23 - i).toString().padStart(2, "0")}:00`,
    depth: Math.floor(Math.random() * 15),
  })).reverse();
}

function generateAvgTimeByIntent() {
  return [
    { intent: "Campaign", avg: 45 },
    { intent: "Trend", avg: 18 },
    { intent: "Performance", avg: 22 },
    { intent: "Revision", avg: 12 },
    { intent: "Learning", avg: 30 },
  ];
}

function generateThroughput() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    completed: Math.floor(Math.random() * 20 + 5),
    failed: Math.floor(Math.random() * 3),
  }));
}

function generateHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data: { day: string; hour: number; value: number }[] = [];
  days.forEach((day) => {
    for (let h = 0; h < 24; h++) {
      const base = (h >= 9 && h <= 17) ? 15 : 3;
      data.push({ day, hour: h, value: Math.floor(Math.random() * base + (day === "Sat" || day === "Sun" ? 1 : 5)) });
    }
  });
  return data;
}

/* ── Gauge component ── */
function QueueGauge({ depth }: { depth: number }) {
  const label = depth === 0 ? "Idle" : depth <= 5 ? "Healthy" : depth <= 20 ? "Busy" : "Backed Up";
  const color = depth === 0 ? "text-emerald-400" : depth <= 5 ? "text-blue-400" : depth <= 20 ? "text-yellow-400" : "text-red-400";
  const bg = depth === 0 ? "bg-emerald-500/20" : depth <= 5 ? "bg-blue-500/20" : depth <= 20 ? "bg-yellow-500/20" : "bg-red-500/20";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${bg}`}>
      <Gauge className={`w-6 h-6 ${color}`} />
      <div>
        <div className={`text-2xl font-bold ${color}`}>{depth}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function KlycAdminDispatch() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [timeframe, setTimeframe] = useState("24h");
  const [failedOpen, setFailedOpen] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadSessions = async () => {
    const { data } = await supabase
      .from("orchestrator_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      setSessions(data.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        intent: s.intent,
        status: s.status || "processing",
        current_phase: null,
        active_subminds: null,
        started_at: s.created_at,
        completed_at: null,
        error_message: null,
        client_name: "Client",
        tier: "starter",
        priority: "normal",
      })));
    } else {
      setSessions(generateMockSessions());
    }
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadSessions();
    const iv = setInterval(loadSessions, 5000);
    return () => clearInterval(iv);
  }, []);

  const queuedSessions = sessions.filter((s) => s.status === "queued");
  const activeSessions = sessions.filter((s) => ["routing", "processing", "approval"].includes(s.status || ""));
  const failedOrStuck = sessions.filter(
    (s) => s.status === "failed" || (!s.completed_at && s.started_at && Date.now() - new Date(s.started_at).getTime() > 300000)
  );
  const completedSessions = sessions.filter((s) => ["completed", "complete"].includes(s.status || ""));

  const queueHistory = generateQueueHistory();
  const avgByIntent = generateAvgTimeByIntent();
  const throughput = generateThroughput();
  const totalCompleted = throughput.reduce((a, b) => a + b.completed, 0);
  const totalFailed = throughput.reduce((a, b) => a + b.failed, 0);
  const failureRate = totalCompleted + totalFailed > 0 ? ((totalFailed / (totalCompleted + totalFailed)) * 100).toFixed(1) : "0";
  const avgWait = queuedSessions.length > 0
    ? (queuedSessions.reduce((a, s) => a + (Date.now() - new Date(s.started_at).getTime()), 0) / queuedSessions.length / 1000).toFixed(0)
    : "0";

  const tierBadge = (tier?: string) => {
    const map: Record<string, string> = {
      starter: "bg-blue-500/20 text-blue-400",
      growth: "bg-emerald-500/20 text-emerald-400",
      pro: "bg-purple-500/20 text-purple-400",
      enterprise: "bg-amber-500/20 text-amber-400",
    };
    return <Badge className={`${map[tier || "starter"]} border-0 text-[10px]`}>{tier || "starter"}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Log</h1>
          <p className="text-sm text-slate-400">Real-time orchestrator pipeline view</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </span>
          <Button variant="outline" size="sm" onClick={loadSessions} className="border-slate-700 text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Queue depth banner */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {queuedSessions.length} requests in queue
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-sm text-slate-400">avg wait: {avgWait}s</span>
        <span className="text-slate-500">•</span>
        <span className="text-sm text-slate-400">{activeSessions.length} active</span>
        <span className="text-slate-500">•</span>
        <span className="text-sm text-slate-400">{failedOrStuck.length} failed/stuck</span>
      </div>

      {/* Queue Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QueueGauge depth={queuedSessions.length} />

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400 mb-1">Throughput / hr (24h)</div>
            <div className="text-xl font-bold text-white">{(totalCompleted / 24).toFixed(1)}</div>
            <div className="h-12 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughput.slice(-12)}>
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400 mb-1">Failure Rate</div>
            <div className={`text-xl font-bold ${Number(failureRate) > 5 ? "text-red-400" : "text-emerald-400"}`}>
              {failureRate}%
            </div>
            <div className="h-12 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughput.slice(-12)}>
                  <Bar dataKey="failed" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400 mb-1">Total Processed (24h)</div>
            <div className="text-xl font-bold text-white">{totalCompleted + totalFailed}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-emerald-400">✓ {totalCompleted}</span>
              <span className="text-red-400">✗ {totalFailed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Queue Depth (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={queueHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Line type="monotone" dataKey="depth" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Avg Processing Time by Intent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgByIntent} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} unit="s" />
                  <YAxis dataKey="intent" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                    {avgByIntent.map((_, i) => (
                      <Cell key={i} fill={["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Dispatch Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Live Dispatch ({sessions.length})
            </CardTitle>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400">Auto-refresh 5s</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Session</TableHead>
                  <TableHead className="text-slate-400 text-xs">Client</TableHead>
                  <TableHead className="text-slate-400 text-xs">Intent</TableHead>
                  <TableHead className="text-slate-400 text-xs">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs">Phase</TableHead>
                  <TableHead className="text-slate-400 text-xs">Active Subminds</TableHead>
                  <TableHead className="text-slate-400 text-xs">Elapsed</TableHead>
                  <TableHead className="text-slate-400 text-xs">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id} className={`border-slate-800 ${ROW_BG[s.status || ""] || ""}`}>
                    <TableCell className="font-mono text-xs text-slate-300">{truncId(s.id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white">{s.client_name}</span>
                        {tierBadge(s.tier)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-300">
                        {INTENT_LABELS[s.intent || ""] || s.intent || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[s.status || ""] || "bg-slate-700 text-slate-300"} text-[10px]`}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{s.current_phase || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {s.active_subminds?.map((sm) => (
                          <span key={sm} className={`inline-block w-2 h-2 rounded-full ${SUBMIND_COLORS[sm] || "bg-slate-500"}`} title={sm} />
                        )) || <span className="text-xs text-slate-500">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-300">{elapsed(s.started_at, s.completed_at)}</TableCell>
                    <TableCell>
                      {s.priority === "high" ? (
                        <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">HIGH</Badge>
                      ) : (
                        <span className="text-xs text-slate-500">normal</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Failed / Stuck */}
      <Collapsible open={failedOpen} onOpenChange={setFailedOpen}>
        <Card className="bg-slate-900 border-red-900/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-slate-800/50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Failed / Stuck ({failedOrStuck.length})
                </CardTitle>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${failedOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-0">
              {failedOrStuck.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No failed or stuck requests 🎉</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">Session</TableHead>
                      <TableHead className="text-slate-400 text-xs">Client</TableHead>
                      <TableHead className="text-slate-400 text-xs">Intent</TableHead>
                      <TableHead className="text-slate-400 text-xs">Error</TableHead>
                      <TableHead className="text-slate-400 text-xs">Duration</TableHead>
                      <TableHead className="text-slate-400 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedOrStuck.map((s) => (
                      <TableRow key={s.id} className="border-slate-800 bg-red-500/5">
                        <TableCell className="font-mono text-xs text-slate-300">{truncId(s.id)}</TableCell>
                        <TableCell className="text-sm text-white">{s.client_name}</TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {INTENT_LABELS[s.intent || ""] || s.intent}
                        </TableCell>
                        <TableCell className="text-xs text-red-400 max-w-[200px] truncate">
                          {s.error_message || "Stuck > 5min"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-300">{elapsed(s.started_at, s.completed_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300">
                              <RotateCcw className="w-3 h-3 mr-1" /> Retry
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-400 hover:text-red-300">
                              <XCircle className="w-3 h-3 mr-1" /> Kill
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Historical */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Historical
            </CardTitle>
            <div className="flex gap-1">
              {["1h", "6h", "24h", "7d", "30d"].map((t) => (
                <Button
                  key={t}
                  variant={timeframe === t ? "default" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 text-xs ${timeframe !== t ? "text-slate-400" : ""}`}
                  onClick={() => setTimeframe(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalCompleted + totalFailed}</div>
              <div className="text-xs text-slate-400">Total Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">23.4s</div>
              <div className="text-xs text-slate-400">Avg Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">14:00</div>
              <div className="text-xs text-slate-400">Peak Hour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">~6 mo</div>
              <div className="text-xs text-slate-400">Scale needed est.</div>
            </div>
          </div>

          {/* Throughput chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={3} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Load Heatmap */}
          <div className="mt-6">
            <h4 className="text-xs text-slate-400 mb-3">Peak Load Heatmap (Hour × Day)</h4>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: "40px repeat(24, 18px)" }}>
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-[9px] text-slate-500 text-center">{h}</div>
                ))}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <>
                    <div key={day} className="text-[10px] text-slate-400 flex items-center">{day}</div>
                    {Array.from({ length: 24 }, (_, h) => {
                      const val = generateHeatmap().find((d) => d.day === day && d.hour === h)?.value || 0;
                      const opacity = Math.min(val / 20, 1);
                      return (
                        <div
                          key={`${day}-${h}`}
                          className="w-[18px] h-[18px] rounded-sm"
                          style={{ backgroundColor: `rgba(99, 102, 241, ${opacity})` }}
                          title={`${day} ${h}:00 — ${val} requests`}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
