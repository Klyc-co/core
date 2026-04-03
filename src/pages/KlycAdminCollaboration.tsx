import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Plus, Filter, AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  normal: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-slate-700/30 text-slate-400 border-slate-600/30",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  waiting_on_client: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
};

const TIER_COLORS: Record<string, string> = {
  starter: "border-blue-500 text-blue-400",
  growth: "border-green-500 text-green-400",
  pro: "border-purple-500 text-purple-400",
  enterprise: "border-yellow-500 text-yellow-400",
};

const PIE_COLORS = ["#ef4444", "#eab308", "#64748b"];

interface Ticket {
  id: string;
  client_id: string;
  subject: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_time_ms: number | null;
}

interface Employee {
  id: string;
  display_name: string;
}

const relTime = (d: string) => {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return `${Math.round(ms / 86400000)}d ago`;
};

export default function KlycAdminCollaboration() {
  const navigate = useNavigate();
  const { logAction } = useAdminAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("queue");

  // Filters
  const [fStatus, setFStatus] = useState("all");
  const [fPriority, setFPriority] = useState("all");

  // New ticket dialog
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newPriority, setNewPriority] = useState<string>("normal");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: tData }, { data: eData }] = await Promise.all([
      supabase.from("collaboration_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("klyc_employees").select("id, display_name").eq("is_active", true),
    ]);
    setTickets((tData as Ticket[]) ?? []);
    setEmployees((eData as Employee[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createTicket = async () => {
    if (!newSubject.trim()) return;
    const { error } = await supabase.from("collaboration_tickets").insert([{
      client_id: newClientId || "00000000-0000-0000-0000-000000000000",
      subject: newSubject.trim(),
      priority: newPriority as any,
      status: "new" as any,
    }]);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ticket created" });
    logAction("ticket_created", "collaboration_ticket", undefined, { subject: newSubject });
    setShowNew(false); setNewSubject(""); setNewClientId("");
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === "resolved") {
      const ticket = tickets.find((t) => t.id === id);
      if (ticket) {
        updates.resolved_at = new Date().toISOString();
        updates.resolution_time_ms = Date.now() - new Date(ticket.created_at).getTime();
      }
    }
    await supabase.from("collaboration_tickets").update(updates).eq("id", id);
    logAction("ticket_status_changed", "collaboration_ticket", id, { status });
    load();
  };

  const assignTicket = async (id: string, empId: string) => {
    await supabase.from("collaboration_tickets").update({ assigned_to: empId, status: "in_progress" as any }).eq("id", id);
    logAction("ticket_assigned", "collaboration_ticket", id, { assigned_to: empId });
    load();
  };

  // Filtered + sorted
  const priorityOrder: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
  const filtered = tickets
    .filter((t) => fStatus === "all" || t.status === fStatus)
    .filter((t) => fPriority === "all" || t.priority === fPriority)
    .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const openCount = tickets.filter((t) => t.status !== "resolved").length;

  // Metrics
  const resolvedTickets = tickets.filter((t) => t.resolved_at && t.resolution_time_ms);
  const avgResTime = resolvedTickets.length > 0
    ? resolvedTickets.reduce((a, t) => a + (t.resolution_time_ms ?? 0), 0) / resolvedTickets.length
    : 0;
  const avgResHours = (avgResTime / 3600000).toFixed(1);

  const priorityDonut = [
    { name: "Urgent", value: tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length },
    { name: "Normal", value: tickets.filter((t) => t.priority === "normal" && t.status !== "resolved").length },
    { name: "Low", value: tickets.filter((t) => t.priority === "low" && t.status !== "resolved").length },
  ];

  // Volume trend (group by day)
  const dailyVolume = tickets.reduce<Record<string, number>>((acc, t) => {
    const day = t.created_at.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const volumeData = Object.entries(dailyVolume).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([day, count]) => ({ day: day.slice(5), count }));

  // Resolution time trend
  const resTimeTrend = resolvedTickets
    .sort((a, b) => new Date(a.resolved_at!).getTime() - new Date(b.resolved_at!).getTime())
    .slice(-20)
    .map((t) => ({ date: t.resolved_at!.slice(5, 10), hours: +((t.resolution_time_ms ?? 0) / 3600000).toFixed(1) }));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Collaboration Queue</h1>
          {openCount > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{openCount} open</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 items-center">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fPriority} onValueChange={setFPriority}>
              <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ticket Table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left p-3">Subject</th>
                  <th className="text-center p-3">Priority</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-left p-3">Assigned</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Last Activity</th>
                  <th className="text-right p-3">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">No tickets found</td></tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="border-b border-slate-800/50 text-slate-200 hover:bg-slate-800/30">
                        <td className="p-3">
                          <button onClick={() => navigate(`/klyc_admin/collaboration/${t.id}`)} className="text-left hover:text-primary transition-colors font-medium">
                            {t.subject.length > 50 ? t.subject.slice(0, 50) + "…" : t.subject}
                          </button>
                          <p className="text-xs text-slate-500 mt-0.5">{t.client_id.slice(0, 8)}…</p>
                        </td>
                        <td className="text-center p-3"><Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge></td>
                        <td className="text-center p-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[t.status]}`}>{t.status.replace(/_/g, " ")}</Badge></td>
                        <td className="p-3 text-xs text-slate-400">{employees.find((e) => e.id === t.assigned_to)?.display_name ?? "—"}</td>
                        <td className="p-3 text-xs text-slate-400">{relTime(t.created_at)}</td>
                        <td className="p-3 text-xs text-slate-400">{relTime(t.updated_at)}</td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Select onValueChange={(empId) => assignTicket(t.id, empId)}>
                              <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-700"><SelectValue placeholder="Assign" /></SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {t.status !== "resolved" && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300" onClick={() => updateStatus(t.id, "resolved")}>
                                Resolve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4">
              <p className="text-xs text-slate-400">Open Tickets</p>
              <p className="text-2xl font-bold text-white">{openCount}</p>
            </CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4">
              <p className="text-xs text-slate-400">Avg Resolution</p>
              <p className="text-2xl font-bold text-white">{avgResHours}h</p>
            </CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4">
              <p className="text-xs text-slate-400">Total Resolved</p>
              <p className="text-2xl font-bold text-green-400">{resolvedTickets.length}</p>
            </CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4">
              <p className="text-xs text-slate-400">Total Tickets</p>
              <p className="text-2xl font-bold text-white">{tickets.length}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Open by Priority</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={priorityDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {priorityDonut.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Resolution Time Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={resTimeTrend.length > 0 ? resTimeTrend : [{ date: "—", hours: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => `${v}h`} />
                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Daily Volume (last 30 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={volumeData.length > 0 ? volumeData : [{ day: "—", count: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Bar dataKey="count" fill="#a855f7" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Ticket Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle>New Collaboration Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-slate-300">Subject</Label><Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="What does the client need help with?" /></div>
            <div><Label className="text-slate-300">Client ID</Label><Input value={newClientId} onChange={(e) => setNewClientId(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="UUID (optional)" /></div>
            <div>
              <Label className="text-slate-300">Priority</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)} className="text-slate-400">Cancel</Button>
            <Button onClick={createTicket}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
