import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowDown, ChevronUp, Download, ExternalLink,
  Heart, Lightbulb, MessageSquare, Sparkles, ThumbsUp, TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ── Types ── */
interface VoteItem {
  id: string;
  title: string;
  description: string | null;
  submitted_by: string | null;
  category: string;
  status: string;
  vote_count: number;
  roadmap_item_id: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  tier?: string;
  weighted_votes?: number;
  trend?: number[];
}

/* ── Constants ── */
const CATEGORY_COLORS: Record<string, string> = {
  ui: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  subminds: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  speed: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  integrations: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pricing: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  other: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  planned: "bg-purple-500/20 text-purple-400",
  in_progress: "bg-cyan-500/20 text-cyan-400",
  shipped: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
};

const TIER_WEIGHT: Record<string, number> = {
  enterprise: 5,
  pro: 3,
  growth: 2,
  starter: 1,
};

const PIE_COLORS = ["#10b981", "#94a3b8", "#ef4444"];

/* ── Sparkline ── */
function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    </svg>
  );
}

/* ── Empty State ── */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
      {label}
    </div>
  );
}

/* ── Main ── */
export default function KlycAdminVoting() {
  const [useWeighted, setUseWeighted] = useState(false);
  const [sortField, setSortField] = useState<"votes" | "date">("votes");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: dbVotes } = useQuery({
    queryKey: ["admin-votes"],
    queryFn: async () => {
      const { data } = await supabase.from("client_votes").select("*").order("vote_count", { ascending: false });
      return data || [];
    },
  });

  const votes = useMemo(() => {
    if (dbVotes && dbVotes.length > 0) {
      return dbVotes.map((v: any) => ({
        ...v,
        client_name: "Client",
        tier: "starter",
        weighted_votes: v.vote_count * (TIER_WEIGHT["starter"] || 1),
        trend: [1, 2, 3, 4, 5, 6, v.vote_count],
      }));
    }
    return [] as VoteItem[];
  }, [dbVotes]);

  const filtered = useMemo(() => {
    let items = [...votes];
    if (categoryFilter !== "all") items = items.filter((v) => v.category === categoryFilter);
    if (statusFilter !== "all") items = items.filter((v) => v.status === statusFilter);
    items.sort((a, b) => {
      if (sortField === "votes") {
        const aVal = useWeighted ? (a.weighted_votes || 0) : a.vote_count;
        const bVal = useWeighted ? (b.weighted_votes || 0) : b.vote_count;
        return bVal - aVal;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return items;
  }, [votes, categoryFilter, statusFilter, sortField, useWeighted]);

  const shippedFromVotes = votes.filter((v) => v.status === "shipped").length;
  const totalVoteItems = votes.length;
  const shippedPct = totalVoteItems > 0 ? Math.round((shippedFromVotes / totalVoteItems) * 100) : 0;

  const tierBadge = (tier?: string) => {
    const m: Record<string, string> = {
      starter: "bg-blue-500/20 text-blue-400",
      growth: "bg-emerald-500/20 text-emerald-400",
      pro: "bg-purple-500/20 text-purple-400",
      enterprise: "bg-amber-500/20 text-amber-400",
    };
    return <Badge className={`${m[tier || "starter"]} border-0 text-[10px]`}>{tier}</Badge>;
  };

  const exportCsv = () => {
    const headers = ["Title", "Votes", "Weighted", "Category", "Status", "Submitted By", "Created"];
    const rows = filtered.map((v) => [v.title, v.vote_count, v.weighted_votes, v.category, v.status, v.client_name, v.created_at]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client_votes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Voting & Feedback</h1>
          <p className="text-sm text-slate-400">Feature requests, sentiment, and product signals</p>
        </div>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={exportCsv} disabled={votes.length === 0}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Total Requests</div>
            <div className="text-2xl font-bold text-white">{totalVoteItems || "—"}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Total Votes Cast</div>
            <div className="text-2xl font-bold text-white">{votes.length > 0 ? votes.reduce((a, v) => a + v.vote_count, 0) : "—"}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Shipped from Votes</div>
            <div className="text-2xl font-bold text-emerald-400">{votes.length > 0 ? shippedFromVotes : "—"}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Ship Rate</div>
            <div className="text-2xl font-bold text-emerald-400">{votes.length > 0 ? `${shippedPct}%` : "—"}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Avg Sentiment</div>
            <div className="text-2xl font-bold text-slate-500">—</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="votes" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="votes" className="data-[state=active]:bg-slate-700">
            <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Feature Votes
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="data-[state=active]:bg-slate-700">
            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Sentiment
          </TabsTrigger>
          <TabsTrigger value="love" className="data-[state=active]:bg-slate-700">
            <Heart className="w-3.5 h-3.5 mr-1" /> What Clients Love
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="data-[state=active]:bg-slate-700">
            <Lightbulb className="w-3.5 h-3.5 mr-1" /> Feedback → Roadmap
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Feature Votes ── */}
        <TabsContent value="votes" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Weight:</span>
              <Button variant={useWeighted ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${!useWeighted ? "text-slate-400" : ""}`} onClick={() => setUseWeighted(true)}>Tier-Weighted</Button>
              <Button variant={!useWeighted ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${useWeighted ? "text-slate-400" : ""}`} onClick={() => setUseWeighted(false)}>Raw</Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Category:</span>
              {["all", "ui", "subminds", "speed", "integrations", "pricing", "other"].map((c) => (
                <Button key={c} variant={categoryFilter === c ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs capitalize ${categoryFilter !== c ? "text-slate-400" : ""}`} onClick={() => setCategoryFilter(c)}>{c}</Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300">
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="under_review">Under Review</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="shipped">Shipped</option>
                <option value="declined">Declined</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sort:</span>
              <Button variant={sortField === "votes" ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${sortField !== "votes" ? "text-slate-400" : ""}`} onClick={() => setSortField("votes")}>Most Voted</Button>
              <Button variant={sortField === "date" ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${sortField !== "date" ? "text-slate-400" : ""}`} onClick={() => setSortField("date")}>Newest</Button>
            </div>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-sm">
                  No feature requests yet. Client votes will appear here once the <code className="text-slate-400">client_votes</code> table is populated.
                </div>
              ) : (
                <div className="overflow-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs w-16">{useWeighted ? "Weighted" : "Votes"}</TableHead>
                        <TableHead className="text-slate-400 text-xs">Title</TableHead>
                        <TableHead className="text-slate-400 text-xs">Submitted By</TableHead>
                        <TableHead className="text-slate-400 text-xs">Category</TableHead>
                        <TableHead className="text-slate-400 text-xs">Status</TableHead>
                        <TableHead className="text-slate-400 text-xs">Trend</TableHead>
                        <TableHead className="text-slate-400 text-xs">Date</TableHead>
                        <TableHead className="text-slate-400 text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((v) => (
                        <TableRow key={v.id} className="border-slate-800">
                          <TableCell>
                            <div className="flex flex-col items-center">
                              <ChevronUp className="w-4 h-4 text-slate-500 hover:text-primary cursor-pointer" />
                              <span className="text-lg font-bold text-white">
                                {useWeighted ? v.weighted_votes : v.vote_count}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-white text-sm">{v.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5 max-w-[300px] truncate">{v.description}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-slate-300">{v.client_name}</span>
                              {tierBadge(v.tier)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${CATEGORY_COLORS[v.category] || ""} text-[10px] capitalize`}>{v.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[v.status] || ""} border-0 text-[10px]`}>
                              {v.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {v.trend && <MiniSparkline data={v.trend} />}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white">Status</Button>
                              {!v.roadmap_item_id && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary hover:text-primary/80">
                                  <ExternalLink className="w-3 h-3 mr-0.5" /> Roadmap
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Sentiment ── */}
        <TabsContent value="sentiment" className="space-y-4">
          <EmptyState label="Sentiment tracking not yet connected. Feedback stream and theme analysis will appear here once client feedback data is flowing." />
        </TabsContent>

        {/* ── TAB: What Clients Love ── */}
        <TabsContent value="love" className="space-y-4">
          <EmptyState label="Usage data not yet connected. Submind ratings and feature adoption metrics will appear here once the analytics pipeline is live." />
        </TabsContent>

        {/* ── TAB: Feedback → Roadmap ── */}
        <TabsContent value="roadmap" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{votes.length > 0 ? `${shippedPct}%` : "—"}</div>
                <div className="text-xs text-slate-400 mt-1">Shipped features from client votes</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-3xl font-bold text-white">{votes.filter((v) => v.roadmap_item_id).length || "—"}</div>
                <div className="text-xs text-slate-400 mt-1">Linked to roadmap items</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{votes.filter((v) => v.status === "planned" || v.status === "in_progress").length || "—"}</div>
                <div className="text-xs text-slate-400 mt-1">Planned / In Progress</div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Vote → Ship Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {votes.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-6">No votes yet</div>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {(["new", "under_review", "planned", "in_progress", "shipped"] as const).map((status, i) => {
                    const count = votes.filter((v) => v.status === status).length;
                    return (
                      <div key={status} className="flex items-center gap-2">
                        {i > 0 && <ArrowDown className="w-4 h-4 text-slate-600 rotate-[-90deg]" />}
                        <div className="min-w-[120px] text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="text-lg font-bold text-white">{count}</div>
                          <div className="text-xs text-slate-400 capitalize">{status.replace("_", " ")}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked items */}
          {votes.filter((v) => v.roadmap_item_id).length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Roadmap-Linked Votes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">Feature</TableHead>
                      <TableHead className="text-slate-400 text-xs">Votes</TableHead>
                      <TableHead className="text-slate-400 text-xs">Status</TableHead>
                      <TableHead className="text-slate-400 text-xs">Roadmap ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votes.filter((v) => v.roadmap_item_id).map((v) => (
                      <TableRow key={v.id} className="border-slate-800">
                        <TableCell className="text-sm text-white">{v.title}</TableCell>
                        <TableCell className="text-sm font-bold text-white">{v.vote_count}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[v.status] || ""} border-0 text-[10px]`}>
                            {v.status === "shipped" ? "✅ Shipped" : v.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-400">{v.roadmap_item_id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
