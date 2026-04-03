import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, MoreHorizontal, Eye, ArrowUpCircle, Ban, FileDown,
  ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

// ── Types ──

interface ClientRow {
  id: string;
  business_name: string | null;
  industry: string | null;
  created_at: string;
  tier: string;
  status: string;
  trial_end: string | null;
  monthly_price: number;
  campaign_count: number;
  month_campaigns: number;
  last_active: string | null;
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

const PAGE_SIZE = 20;

// ── Component ──

export default function KlycAdminClients() {
  const navigate = useNavigate();
  const { logAction } = useAdminAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [page, setPage] = useState(0);

  const fetchClients = useCallback(async () => {
    // Fetch client profiles
    const { data: profiles } = await supabase
      .from("client_profiles")
      .select("id, business_name, industry, created_at")
      .order("created_at", { ascending: false });

    // Fetch billing subscriptions
    const { data: subs } = await supabase
      .from("billing_subscriptions")
      .select("client_id, tier, status, trial_end, monthly_price");

    // Fetch campaign counts
    const { data: drafts } = await supabase
      .from("campaign_drafts")
      .select("client_id, created_at");

    const subsByClient = new Map<string, any>();
    for (const s of subs ?? []) {
      subsByClient.set(s.client_id, s);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const campaignsByClient = new Map<string, { total: number; month: number; lastActive: string | null }>();
    for (const d of drafts ?? []) {
      const cid = d.client_id ?? "";
      const existing = campaignsByClient.get(cid) ?? { total: 0, month: 0, lastActive: null };
      existing.total++;
      if (d.created_at >= monthStart) existing.month++;
      if (!existing.lastActive || d.created_at > existing.lastActive) existing.lastActive = d.created_at;
      campaignsByClient.set(cid, existing);
    }

    const rows: ClientRow[] = (profiles ?? []).map((p) => {
      const sub = subsByClient.get(p.id);
      const camp = campaignsByClient.get(p.id);
      return {
        id: p.id,
        business_name: p.business_name,
        industry: p.industry,
        created_at: p.created_at,
        tier: sub?.tier ?? "starter",
        status: sub?.status ?? "trial",
        trial_end: sub?.trial_end ?? null,
        monthly_price: sub?.monthly_price ?? 0,
        campaign_count: camp?.total ?? 0,
        month_campaigns: camp?.month ?? 0,
        last_active: camp?.lastActive ?? null,
      };
    });

    setClients(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    logAction("admin_clients_view");
    fetchClients();
  }, [fetchClients, logAction]);

  // ── Filtering ──

  const filtered = useMemo(() => {
    let result = clients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        (c.business_name ?? "").toLowerCase().includes(q) || c.id.includes(q)
      );
    }
    if (tierFilter !== "all") result = result.filter((c) => c.tier === tierFilter);
    if (statusFilter !== "all") result = result.filter((c) => c.status === statusFilter);
    if (activityFilter !== "all") {
      const now = Date.now();
      result = result.filter((c) => {
        if (!c.last_active) return activityFilter === "inactive";
        const daysSince = (now - new Date(c.last_active).getTime()) / 86400000;
        if (activityFilter === "7d") return daysSince <= 7;
        if (activityFilter === "30d") return daysSince <= 30;
        return daysSince > 30;
      });
    }
    return result;
  }, [clients, search, tierFilter, statusFilter, activityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── CSV Export ──

  const exportCsv = () => {
    const header = "Name,Tier,Status,Signup Date,Last Active,Total Campaigns,This Month,Monthly Spend\n";
    const rows = filtered.map((c) =>
      [
        `"${c.business_name ?? "Unnamed"}"`,
        c.tier,
        c.status,
        format(new Date(c.created_at), "yyyy-MM-dd"),
        c.last_active ? format(new Date(c.last_active), "yyyy-MM-dd") : "Never",
        c.campaign_count,
        c.month_campaigns,
        c.monthly_price,
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klyc-clients-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAction("admin_export_clients_csv");
  };

  const trialDaysLeft = (trialEnd: string | null) => {
    if (!trialEnd) return null;
    const days = differenceInDays(new Date(trialEnd), new Date());
    return days > 0 ? days : 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> Client Management
        </h1>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={exportCsv}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-slate-900 border-slate-700 text-slate-200"
          />
        </div>
        <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36 bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36 bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="cancelled">Churned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
          </SelectContent>
        </Select>
        <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="Activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="7d">Active 7d</SelectItem>
            <SelectItem value="30d">Active 30d</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400">Client</TableHead>
                  <TableHead className="text-slate-400">Tier</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Trial Left</TableHead>
                  <TableHead className="text-slate-400">Signed Up</TableHead>
                  <TableHead className="text-slate-400">Last Active</TableHead>
                  <TableHead className="text-slate-400 text-right">Campaigns</TableHead>
                  <TableHead className="text-slate-400 text-right">This Month</TableHead>
                  <TableHead className="text-slate-400 text-right">Spend</TableHead>
                  <TableHead className="text-slate-400 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-slate-500 py-8">Loading…</TableCell></TableRow>
                ) : pageData.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-slate-500 py-8">No clients found.</TableCell></TableRow>
                ) : pageData.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-slate-800 cursor-pointer hover:bg-slate-800/50"
                    onClick={() => navigate(`/klyc_admin/clients/${c.id}`)}
                  >
                    <TableCell className="text-white font-medium">
                      {c.business_name || "Unnamed"}
                      {c.industry && <span className="block text-xs text-slate-500">{c.industry}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${TIER_BADGE[c.tier] ?? ""}`}>
                        {c.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border-0 ${STATUS_BADGE[c.status] ?? ""}`}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {c.status === "trial" ? (
                        <span className={trialDaysLeft(c.trial_end) ?? 0 <= 3 ? "text-red-400 font-medium" : ""}>
                          {trialDaysLeft(c.trial_end) ?? 0}d
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {c.last_active ? formatDistanceToNow(new Date(c.last_active), { addSuffix: true }) : "Never"}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">{c.campaign_count}</TableCell>
                    <TableCell className="text-right text-slate-300">{c.month_campaigns}</TableCell>
                    <TableCell className="text-right text-white font-medium">${c.monthly_price}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/klyc_admin/clients/${c.id}`)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> View Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { logAction("admin_upgrade_tier", "client", c.id); }}>
                            <ArrowUpCircle className="w-3.5 h-3.5 mr-2" /> Upgrade Tier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { logAction("admin_suspend_client", "client", c.id); }}>
                            <Ban className="w-3.5 h-3.5 mr-2" /> Suspend
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={exportCsv}>
                            <FileDown className="w-3.5 h-3.5 mr-2" /> Export
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
              <span className="text-xs text-slate-500">
                {filtered.length} client{filtered.length !== 1 ? "s" : ""} · Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
