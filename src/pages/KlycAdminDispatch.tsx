import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
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
    try {
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
        setSessions([]);
      }
    } catch {
      setSessions([]);
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
            <div className="text-xl font-bold text-slate-500">—</div>
            <p className="text-xs text-slate-600 mt-2">Historical analytics not yet connected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400 mb-1">Failure Rate</div>
            <div className="text-xl font-bold text-slate-500">—</div>
            <p className="text-xs text-slate-600 mt-2">Historical analytics not yet connected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400 mb-1">Total Processed (24h)</div>
            <div className="text-xl font-bold text-slate-500">—</div>
            <p className="text-xs text-slate-600 mt-2">Historical analytics not yet connected</p>
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
          {sessions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No active sessions. Orchestrator sessions will appear here in real time once clients start using the platform.
            </div>
          ) : (
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
          )}
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
              <div className="text-2xl font-bold text-slate-500">—</div>
              <div className="text-xs text-slate-400">Total Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">—</div>
              <div className="text-xs text-slate-400">Avg Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">—</div>
              <div className="text-xs text-slate-400">Peak Hour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">—</div>
              <div className="text-xs text-slate-400">Scale needed est.</div>
            </div>
          </div>
          <div className="py-10 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
            Historical throughput charts will appear here once the <code className="text-slate-400">platform_metrics_daily</code> table is connected.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
