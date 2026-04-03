import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Plus, Building2, Users, Radio, BarChart3,
  Twitter, Linkedin, Instagram, Mail, FileText, DollarSign,
  CheckCircle, AlertCircle, XCircle, Pencil, UserMinus,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CHANNEL_PLATFORMS = [
  { platform: "twitter", label: "Twitter / X", icon: Twitter },
  { platform: "linkedin", label: "LinkedIn", icon: Linkedin },
  { platform: "instagram", label: "Instagram", icon: Instagram },
  { platform: "tiktok", label: "TikTok", icon: Radio },
  { platform: "email", label: "Email", icon: Mail },
  { platform: "blog", label: "Blog", icon: FileText },
  { platform: "paid_ads", label: "Paid Ads", icon: DollarSign },
];

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  connected: CheckCircle,
  disconnected: XCircle,
  error: AlertCircle,
};
const STATUS_COLORS: Record<string, string> = {
  connected: "text-green-400",
  disconnected: "text-slate-500",
  error: "text-yellow-400",
};

const SUBMIND_NAMES = ["Research", "Product", "Narrative", "Creative", "Social", "Image", "Approval"];
const SUBMIND_COLORS = ["#3b82f6", "#a855f7", "#22c55e", "#eab308", "#ef4444", "#06b6d4", "#f97316"];

interface Employee {
  id: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  admin_user_id: string | null;
}

interface Channel {
  id: string;
  platform: string;
  account_name: string;
  credentials_ref: string | null;
  status: string;
  config: Record<string, unknown> | null;
}

export default function KlycAdminInternal() {
  const { adminUser, logAction } = useAdminAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showChannelConfig, setShowChannelConfig] = useState<string | null>(null);
  const [excludeFromMetrics, setExcludeFromMetrics] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // Add employee form
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("engineer");

  // Channel config form
  const [cfgAccountName, setCfgAccountName] = useState("");
  const [cfgCredRef, setCfgCredRef] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: empData }, { data: chData }] = await Promise.all([
      supabase.from("klyc_employees").select("id, display_name, role, is_active, created_at, admin_user_id").order("created_at"),
      supabase.from("klyc_channels").select("id, platform, account_name, credentials_ref, status, config").order("created_at"),
    ]);
    setEmployees((empData as Employee[]) ?? []);
    setChannels((chData as Channel[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddEmployee = async () => {
    if (!newEmpName.trim() || !newEmpEmail.trim()) return;
    const { error } = await supabase.from("klyc_employees").insert([{
      display_name: newEmpName.trim(),
      role: newEmpRole,
      is_active: true,
    }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Employee added" });
      logAction("employee_added", "klyc_employee", undefined, { name: newEmpName, role: newEmpRole });
      setShowAddEmployee(false);
      setNewEmpName(""); setNewEmpEmail(""); setNewEmpRole("engineer");
      load();
    }
  };

  const toggleEmployee = async (emp: Employee) => {
    const { error } = await supabase.from("klyc_employees").update({ is_active: !emp.is_active }).eq("id", emp.id);
    if (!error) {
      logAction(emp.is_active ? "employee_deactivated" : "employee_reactivated", "klyc_employee", emp.id);
      load();
    }
  };

  const saveChannelConfig = async () => {
    if (!showChannelConfig) return;
    const existing = channels.find((c) => c.platform === showChannelConfig);
    if (existing) {
      await supabase.from("klyc_channels").update({
        account_name: cfgAccountName,
        credentials_ref: cfgCredRef || null,
      }).eq("id", existing.id);
    } else {
      await supabase.from("klyc_channels").insert([{
        platform: showChannelConfig,
        account_name: cfgAccountName || showChannelConfig,
        credentials_ref: cfgCredRef || null,
        status: "disconnected",
        config: {},
      }]);
    }
    toast({ title: "Channel saved" });
    logAction("channel_configured", "klyc_channel", showChannelConfig);
    setShowChannelConfig(null);
    load();
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || !adminUser) return;
    await supabase.from("admin_audit_log").insert([{
      admin_id: adminUser.id,
      action: "internal_feedback",
      target_type: "klyc_internal",
      details: { feedback: feedbackText.trim() } as any,
    }]);
    toast({ title: "Feedback submitted" });
    setFeedbackText("");
  };

  // Dogfood data (simulated)
  const usageComparison = [
    { metric: "Campaigns/mo", klyc: 12, avgClient: 8 },
    { metric: "Sessions/mo", klyc: 45, avgClient: 22 },
    { metric: "Tokens/mo", klyc: 28000, avgClient: 15000 },
    { metric: "Subminds/task", klyc: 5.2, avgClient: 3.8 },
  ];

  const submindUsage = SUBMIND_NAMES.map((name, i) => ({
    name,
    usage: [85, 72, 68, 90, 78, 45, 95][i],
    fill: SUBMIND_COLORS[i],
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const channelForPlatform = (p: string) => channels.find((c) => c.platform === p);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">KLYC Internal (Dogfood)</h1>
        <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── SECTION 1: Organization ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Building2 className="w-5 h-5" /> KLYC Organization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-white">KLYC</p>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Enterprise</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Industry:</span> <span className="text-slate-200">AI / SaaS</span></div>
                <div><span className="text-slate-400">Employees:</span> <span className="text-slate-200">{employees.filter((e) => e.is_active).length}</span></div>
                <div><span className="text-slate-400">Brand Voice:</span> <span className="text-slate-200">Innovative, Technical</span></div>
                <div><span className="text-slate-400">Tone:</span> <span className="text-slate-200">Professional</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Personality Defaults</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Communication</span><span className="text-slate-200">Professional, data-driven</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Verbosity</span><span className="text-slate-200">Detailed</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Mode</span><span className="text-slate-200">Hybrid</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Confidence Threshold</span><span className="text-slate-200">0.75</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Proactive Suggestions</span><span className="text-slate-200">Enabled</span></div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 2: Employee Management ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Users className="w-5 h-5" /> Employees</h2>
          <Button size="sm" onClick={() => setShowAddEmployee(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Role</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Since</th>
                <th className="text-right p-3">Actions</th>
              </tr></thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">No employees yet. Add your team!</td></tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-800/50 text-slate-200">
                      <td className="p-3 font-medium">{emp.display_name}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs border-slate-600 text-slate-300">{emp.role}</Badge></td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={`text-xs ${emp.is_active ? "border-green-500/30 text-green-400" : "border-slate-600 text-slate-500"}`}>
                          {emp.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{new Date(emp.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => toggleEmployee(emp)} className="text-slate-400 hover:text-white h-7 px-2">
                          <UserMinus className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Add Employee Dialog */}
        <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-slate-300">Name</Label><Input value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="Full name" /></div>
              <div><Label className="text-slate-300">Email</Label><Input value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="email@klyc.ai" /></div>
              <div>
                <Label className="text-slate-300">Role</Label>
                <Select value={newEmpRole} onValueChange={setNewEmpRole}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="founder">Founder</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="marketing">Marketing / Growth</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="ops">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAddEmployee(false)} className="text-slate-400">Cancel</Button>
              <Button onClick={handleAddEmployee}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* ── SECTION 3: Marketing Channels ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Radio className="w-5 h-5" /> Marketing Channels</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CHANNEL_PLATFORMS.map(({ platform, label, icon: Icon }) => {
            const ch = channelForPlatform(platform);
            const status = ch?.status ?? "disconnected";
            const StatusIcon = STATUS_ICONS[status] ?? XCircle;
            return (
              <Card key={platform} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-slate-300" />
                    <span className="text-sm font-medium text-white">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`w-3.5 h-3.5 ${STATUS_COLORS[status]}`} />
                    <span className="text-xs text-slate-400 capitalize">{status}</span>
                  </div>
                  {ch?.account_name && <p className="text-xs text-slate-500 truncate">@{ch.account_name}</p>}
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-slate-300 text-xs" onClick={() => {
                    setShowChannelConfig(platform);
                    setCfgAccountName(ch?.account_name ?? "");
                    setCfgCredRef(ch?.credentials_ref ?? "");
                  }}>
                    <Pencil className="w-3 h-3 mr-1" /> Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Channel Config Dialog */}
        <Dialog open={!!showChannelConfig} onOpenChange={() => setShowChannelConfig(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader><DialogTitle>Configure {CHANNEL_PLATFORMS.find((c) => c.platform === showChannelConfig)?.label}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-slate-300">Account Name</Label><Input value={cfgAccountName} onChange={(e) => setCfgAccountName(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="@handle or account name" /></div>
              <div>
                <Label className="text-slate-300">Credentials Reference</Label>
                <Input value={cfgCredRef} onChange={(e) => setCfgCredRef(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="e.g. TWITTER_ACCESS_TOKEN (secret name)" />
                <p className="text-xs text-slate-500 mt-1">Pointer to secrets manager — never store raw credentials here.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowChannelConfig(null)} className="text-slate-400">Cancel</Button>
              <Button onClick={saveChannelConfig}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* ── SECTION 4: Dogfood Metrics ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Dogfood Metrics</h2>

        <div className="flex items-center gap-3 mb-2">
          <Switch checked={excludeFromMetrics} onCheckedChange={setExcludeFromMetrics} />
          <span className="text-sm text-slate-400">Exclude KLYC from aggregate client metrics</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Usage comparison */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">KLYC vs Client Average</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={usageComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Bar dataKey="klyc" fill="#3b82f6" name="KLYC" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="avgClient" fill="#64748b" name="Avg Client" radius={[2, 2, 0, 0]} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Submind usage heatmap */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Submind Usage (KLYC)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={submindUsage} dataKey="usage" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {submindUsage.map((_, i) => <Cell key={i} fill={SUBMIND_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Form */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Internal Feedback / Bug Report</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
              placeholder="Describe feedback, feature request, or bug..."
            />
            <Button onClick={submitFeedback} disabled={!feedbackText.trim()} size="sm">Submit Feedback</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
