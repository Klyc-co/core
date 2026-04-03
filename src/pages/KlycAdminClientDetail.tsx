import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Building, Calendar, Search,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

// ── Types ──

interface ClientProfile {
  id: string;
  business_name: string | null;
  industry: string | null;
  description: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  marketing_goals: string | null;
  website: string | null;
  created_at: string;
}

interface CampaignRow {
  id: string;
  campaign_idea: string | null;
  created_at: string;
  content_type: string | null;
  campaign_objective: string | null;
}

interface BillingRow {
  id: string;
  tier: string;
  status: string;
  monthly_price: number;
  trial_start: string | null;
  trial_end: string | null;
  started_at: string;
  cancelled_at: string | null;
}

interface AdminNote {
  id: string;
  text: string;
  created_at: string;
}

const TIER_BADGE: Record<string, string> = {
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  growth: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  trial: "bg-yellow-500/20 text-yellow-400",
  cancelled: "bg-red-500/20 text-red-400",
  suspended: "bg-slate-500/20 text-slate-400",
  past_due: "bg-orange-500/20 text-orange-400",
};

// ── Component ──

export default function KlycAdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logAction } = useAdminAuth();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [brainData, setBrainData] = useState<any[]>([]);
  const [brainSearch, setBrainSearch] = useState("");
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [profileRes, campaignsRes, billingRes, brainRes] = await Promise.all([
      supabase.from("client_profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("campaign_drafts").select("id, campaign_idea, created_at, content_type, campaign_objective").eq("client_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("billing_subscriptions").select("*").eq("client_id", id).order("started_at", { ascending: false }),
      supabase.from("client_brain").select("*").eq("client_id", id),
    ]);

    setProfile(profileRes.data as ClientProfile | null);
    setCampaigns((campaignsRes.data as CampaignRow[]) ?? []);
    setBilling((billingRes.data as BillingRow[]) ?? []);
    setBrainData(brainRes.data ?? []);

    // Load admin notes from audit log (notes stored as action="admin_note")
    const { data: auditNotes } = await supabase
      .from("admin_audit_log")
      .select("id, details, created_at")
      .eq("target_type", "client")
      .eq("target_id", id)
      .eq("action", "admin_note")
      .order("created_at", { ascending: false });

    setNotes(
      (auditNotes ?? []).map((n) => ({
        id: n.id,
        text: (n.details as any)?.note ?? "",
        created_at: n.created_at,
      }))
    );

    setLoading(false);
  }, [id]);

  useEffect(() => {
    logAction("admin_client_detail_view", "client", id);
    fetchData();
  }, [fetchData, logAction, id]);

  const addNote = async () => {
    if (!newNote.trim() || !id) return;
    await logAction("admin_note", "client", id, { note: newNote.trim() });
    setNotes((prev) => [
      { id: crypto.randomUUID(), text: newNote.trim(), created_at: new Date().toISOString() },
      ...prev,
    ]);
    setNewNote("");
  };

  const currentSub = billing[0];

  // Usage chart data — campaigns per month
  const usageData = (() => {
    const months: Record<string, number> = {};
    campaigns.forEach((c) => {
      const key = format(new Date(c.created_at), "MMM yy");
      months[key] = (months[key] ?? 0) + 1;
    });
    return Object.entries(months).reverse().slice(-12).map(([month, count]) => ({ month, campaigns: count }));
  })();

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Client not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/klyc_admin/clients")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => navigate("/klyc_admin/clients")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5" />
            {profile.business_name || "Unnamed Client"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {currentSub && (
              <>
                <Badge variant="outline" className={`text-[10px] ${TIER_BADGE[currentSub.tier] ?? ""}`}>
                  {currentSub.tier}
                </Badge>
                <Badge className={`text-[10px] border-0 ${STATUS_BADGE[currentSub.status] ?? ""}`}>
                  {currentSub.status}
                </Badge>
              </>
            )}
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Member since {format(new Date(profile.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="brain">Brain State</TabsTrigger>
          <TabsTrigger value="notes">Admin Notes</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="pt-6 space-y-4">
              {[
                ["Industry", profile.industry],
                ["Description", profile.description],
                ["Target Audience", profile.target_audience],
                ["Value Proposition", profile.value_proposition],
                ["Marketing Goals", profile.marketing_goals],
                ["Website", profile.website],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm text-slate-200">{(value as string) || "—"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Campaigns */}
        <TabsContent value="campaigns">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Campaign</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Objective</TableHead>
                    <TableHead className="text-slate-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-6">No campaigns.</TableCell></TableRow>
                  ) : campaigns.map((c) => (
                    <TableRow key={c.id} className="border-slate-800">
                      <TableCell className="text-white text-sm">{c.campaign_idea || "Untitled"}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{c.content_type || "—"}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{c.campaign_objective || "—"}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Usage */}
        <TabsContent value="usage">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-sm text-slate-300">Campaigns per Month</CardTitle></CardHeader>
            <CardContent className="h-64">
              {usageData.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No usage data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#e2e8f0" }} />
                    <Line type="monotone" dataKey="campaigns" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Billing */}
        <TabsContent value="billing">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tier</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Price</TableHead>
                    <TableHead className="text-slate-400">Started</TableHead>
                    <TableHead className="text-slate-400">Cancelled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billing.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-6">No billing records.</TableCell></TableRow>
                  ) : billing.map((b) => (
                    <TableRow key={b.id} className="border-slate-800">
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${TIER_BADGE[b.tier] ?? ""}`}>{b.tier}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border-0 ${STATUS_BADGE[b.status] ?? ""}`}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-white">${b.monthly_price}/mo</TableCell>
                      <TableCell className="text-slate-400 text-sm">{format(new Date(b.started_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{b.cancelled_at ? format(new Date(b.cancelled_at), "MMM d, yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Brain State */}
        <TabsContent value="brain">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm text-slate-300">Client Brain Data</CardTitle>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-500" />
                  <Input
                    placeholder="Search JSON…"
                    value={brainSearch}
                    onChange={(e) => setBrainSearch(e.target.value)}
                    className="pl-7 h-8 text-xs bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {brainData.length === 0 ? (
                <p className="text-slate-500 text-sm">No brain data stored for this client.</p>
              ) : (
                <pre className="text-xs text-slate-300 bg-slate-950 rounded p-3 max-h-96 overflow-auto whitespace-pre-wrap">
                  {(() => {
                    const json = JSON.stringify(brainData, null, 2);
                    if (!brainSearch) return json;
                    return json; // Search highlighting could be added later
                  })()}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Admin Notes */}
        <TabsContent value="notes">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note about this client…"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 min-h-[60px]"
                />
                <Button onClick={addNote} disabled={!newNote.trim()} className="self-end">
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-slate-500 text-sm">No notes yet.</p>
                ) : notes.map((n) => (
                  <div key={n.id} className="border border-slate-800 rounded p-3">
                    <p className="text-sm text-slate-200">{n.text}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(n.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
