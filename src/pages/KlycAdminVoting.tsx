import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowUp, ArrowDown, ChevronUp, Download, ExternalLink, Flag,
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

/* ── Mock data ── */
function generateMockVotes(): VoteItem[] {
  const items: Omit<VoteItem, "id" | "weighted_votes">[] = [
    { title: "Bulk schedule across platforms", description: "Allow scheduling 50+ posts at once with CSV upload", submitted_by: null, category: "ui", status: "planned", vote_count: 47, roadmap_item_id: "rm-1", created_at: new Date(Date.now() - 86400000 * 12).toISOString(), updated_at: new Date().toISOString(), client_name: "Brew & Beyond", tier: "growth", trend: [12, 18, 25, 32, 40, 44, 47] },
    { title: "TikTok auto-caption generation", description: "Auto-generate captions with trending hashtags for TikTok content", submitted_by: null, category: "subminds", status: "in_progress", vote_count: 39, roadmap_item_id: "rm-2", created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date().toISOString(), client_name: "UrbanFit", tier: "enterprise", trend: [5, 10, 15, 22, 28, 35, 39] },
    { title: "Faster image generation", description: "Current image gen takes 15-20s, want under 5s", submitted_by: null, category: "speed", status: "under_review", vote_count: 34, roadmap_item_id: null, created_at: new Date(Date.now() - 86400000 * 8).toISOString(), updated_at: new Date().toISOString(), client_name: "TechNova AI", tier: "pro", trend: [8, 12, 18, 22, 26, 30, 34] },
    { title: "Shopify deep integration", description: "Pull product catalog directly into campaigns", submitted_by: null, category: "integrations", status: "new", vote_count: 28, roadmap_item_id: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString(), client_name: "GreenLeaf Co", tier: "starter", trend: [3, 8, 14, 18, 22, 25, 28] },
    { title: "Custom brand voice fine-tuning", description: "Let us upload examples of our tone and have the AI learn it", submitted_by: null, category: "subminds", status: "planned", vote_count: 26, roadmap_item_id: "rm-3", created_at: new Date(Date.now() - 86400000 * 15).toISOString(), updated_at: new Date().toISOString(), client_name: "Pixel Perfect", tier: "growth", trend: [4, 8, 12, 16, 20, 23, 26] },
    { title: "White-label reports", description: "Remove KLYC branding from client-facing reports", submitted_by: null, category: "ui", status: "shipped", vote_count: 22, roadmap_item_id: "rm-4", created_at: new Date(Date.now() - 86400000 * 45).toISOString(), updated_at: new Date().toISOString(), client_name: "UrbanFit", tier: "enterprise", trend: [2, 6, 10, 14, 18, 20, 22] },
    { title: "Agency seat pricing tier", description: "Need a tier for agencies managing 10+ client accounts", submitted_by: null, category: "pricing", status: "under_review", vote_count: 19, roadmap_item_id: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: new Date().toISOString(), client_name: "Brew & Beyond", tier: "growth", trend: [1, 3, 7, 10, 14, 17, 19] },
    { title: "Real-time competitor alerts", description: "Push notifications when competitors post high-engagement content", submitted_by: null, category: "subminds", status: "new", vote_count: 15, roadmap_item_id: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString(), client_name: "TechNova AI", tier: "pro", trend: [0, 2, 5, 8, 10, 13, 15] },
    { title: "Canva template import", description: "Import Canva designs as campaign templates", submitted_by: null, category: "integrations", status: "declined", vote_count: 8, roadmap_item_id: null, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString(), client_name: "GreenLeaf Co", tier: "starter", trend: [1, 2, 3, 5, 6, 7, 8] },
    { title: "Dark mode for client portal", description: "Eye strain during late night approvals", submitted_by: null, category: "ui", status: "shipped", vote_count: 31, roadmap_item_id: "rm-5", created_at: new Date(Date.now() - 86400000 * 60).toISOString(), updated_at: new Date().toISOString(), client_name: "Pixel Perfect", tier: "growth", trend: [5, 10, 15, 20, 25, 28, 31] },
  ];

  return items.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    weighted_votes: item.vote_count * (TIER_WEIGHT[item.tier || "starter"] || 1),
  }));
}

function generateFeedbackStream() {
  return [
    { id: "1", client: "UrbanFit", tier: "enterprise", message: "The campaign generation is incredible — saved us 20 hours this week alone.", sentiment: "positive", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "2", client: "TechNova AI", tier: "pro", message: "Image generation is too slow. We're waiting 20 seconds per image, need it under 5.", sentiment: "negative", created_at: new Date(Date.now() - 7200000).toISOString(), flagged: true },
    { id: "3", client: "Brew & Beyond", tier: "growth", message: "Love the new approval workflow. Much cleaner than before.", sentiment: "positive", created_at: new Date(Date.now() - 14400000).toISOString() },
    { id: "4", client: "GreenLeaf Co", tier: "starter", message: "The competitor analysis submind is okay but could use more actionable recommendations.", sentiment: "neutral", created_at: new Date(Date.now() - 28800000).toISOString() },
    { id: "5", client: "Pixel Perfect", tier: "growth", message: "Can't believe there's no bulk scheduling yet. This is a dealbreaker for us.", sentiment: "negative", created_at: new Date(Date.now() - 36000000).toISOString(), flagged: true },
    { id: "6", client: "UrbanFit", tier: "enterprise", message: "Brand voice consistency is excellent. Every post sounds exactly like us.", sentiment: "positive", created_at: new Date(Date.now() - 43200000).toISOString() },
    { id: "7", client: "TechNova AI", tier: "pro", message: "The analytics dashboard is solid. Would love more export options though.", sentiment: "neutral", created_at: new Date(Date.now() - 57600000).toISOString() },
  ];
}

function generateAdoptionCurve() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    campaigns: Math.min(100, Math.floor(15 + i * 7 + Math.random() * 5)),
    chat: Math.min(100, Math.floor(10 + i * 8 + Math.random() * 5)),
    approvals: Math.min(100, Math.floor(20 + i * 6 + Math.random() * 5)),
    analytics: Math.min(100, Math.floor(5 + i * 5 + Math.random() * 5)),
  }));
}

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

/* ── Main ── */
export default function KlycAdminVoting() {
  const [useWeighted, setUseWeighted] = useState(false);
  const [sortField, setSortField] = useState<"votes" | "date">("votes");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Try real data first, fallback to mock
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
        weighted_votes: v.vote_count,
        trend: [1, 2, 3, 4, 5, 6, v.vote_count],
      }));
    }
    return generateMockVotes();
  }, [dbVotes]);

  const feedback = generateFeedbackStream();
  const adoptionData = generateAdoptionCurve();

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

  const sentimentData = [
    { name: "Positive", value: feedback.filter((f) => f.sentiment === "positive").length },
    { name: "Neutral", value: feedback.filter((f) => f.sentiment === "neutral").length },
    { name: "Negative", value: feedback.filter((f) => f.sentiment === "negative").length },
  ];

  const shippedFromVotes = votes.filter((v) => v.status === "shipped").length;
  const totalVoteItems = votes.length;
  const shippedPct = totalVoteItems > 0 ? Math.round((shippedFromVotes / totalVoteItems) * 100) : 0;

  const topSubminds = [
    { name: "Creative", score: 4.8, uses: 2340 },
    { name: "Narrative", score: 4.6, uses: 1890 },
    { name: "Research", score: 4.5, uses: 1654 },
    { name: "Social", score: 4.3, uses: 1420 },
    { name: "Image", score: 4.1, uses: 980 },
  ];

  const tierBadge = (tier?: string) => {
    const m: Record<string, string> = {
      starter: "bg-blue-500/20 text-blue-400",
      growth: "bg-emerald-500/20 text-emerald-400",
      pro: "bg-purple-500/20 text-purple-400",
      enterprise: "bg-amber-500/20 text-amber-400",
    };
    return <Badge className={`${m[tier || "starter"]} border-0 text-[10px]`}>{tier}</Badge>;
  };

  const sentimentColor = (s: string) => s === "positive" ? "text-emerald-400" : s === "negative" ? "text-red-400" : "text-slate-400";
  const sentimentIcon = (s: string) => s === "positive" ? "💚" : s === "negative" ? "🔴" : "⚪";

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

  // Word cloud approximation
  const wordFrequencies = [
    { word: "scheduling", size: 28 }, { word: "speed", size: 24 }, { word: "integration", size: 22 },
    { word: "voice", size: 20 }, { word: "analytics", size: 18 }, { word: "reports", size: 16 },
    { word: "pricing", size: 15 }, { word: "approval", size: 14 }, { word: "templates", size: 13 },
    { word: "captions", size: 12 }, { word: "competitor", size: 11 }, { word: "bulk", size: 10 },
    { word: "dark-mode", size: 9 }, { word: "export", size: 8 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Voting & Feedback</h1>
          <p className="text-sm text-slate-400">Feature requests, sentiment, and product signals</p>
        </div>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Total Requests</div>
            <div className="text-2xl font-bold text-white">{totalVoteItems}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Total Votes Cast</div>
            <div className="text-2xl font-bold text-white">{votes.reduce((a, v) => a + v.vote_count, 0)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Shipped from Votes</div>
            <div className="text-2xl font-bold text-emerald-400">{shippedFromVotes}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Ship Rate</div>
            <div className="text-2xl font-bold text-emerald-400">{shippedPct}%</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-slate-400">Avg Sentiment</div>
            <div className="text-2xl font-bold text-emerald-400">+0.6</div>
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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Weight:</span>
              <Button
                variant={useWeighted ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs ${!useWeighted ? "text-slate-400" : ""}`}
                onClick={() => setUseWeighted(true)}
              >
                Tier-Weighted
              </Button>
              <Button
                variant={!useWeighted ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs ${useWeighted ? "text-slate-400" : ""}`}
                onClick={() => setUseWeighted(false)}
              >
                Raw
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Category:</span>
              {["all", "ui", "subminds", "speed", "integrations", "pricing", "other"].map((c) => (
                <Button
                  key={c}
                  variant={categoryFilter === c ? "default" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 text-xs capitalize ${categoryFilter !== c ? "text-slate-400" : ""}`}
                  onClick={() => setCategoryFilter(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
              >
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
              <Button variant={sortField === "votes" ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${sortField !== "votes" ? "text-slate-400" : ""}`} onClick={() => setSortField("votes")}>
                Most Voted
              </Button>
              <Button variant={sortField === "date" ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${sortField !== "date" ? "text-slate-400" : ""}`} onClick={() => setSortField("date")}>
                Newest
              </Button>
            </div>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Sentiment ── */}
        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sentiment donut */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {sentimentData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Legend formatter={(value) => <span className="text-xs text-slate-300">{value}</span>} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Word cloud */}
            <Card className="bg-slate-900 border-slate-800 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Feedback Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-center justify-center py-4">
                  {wordFrequencies.map((w) => (
                    <span
                      key={w.word}
                      className="text-primary/80 hover:text-primary cursor-default transition-colors"
                      style={{ fontSize: `${w.size}px` }}
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feedback stream */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Recent Feedback Stream</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.map((f) => (
                <div
                  key={f.id}
                  className={`flex gap-3 p-3 rounded-lg ${
                    (f as any).flagged ? "bg-red-500/10 border border-red-900/30" : "bg-slate-800/50"
                  }`}
                >
                  <span className="text-lg">{sentimentIcon(f.sentiment)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{f.client}</span>
                      {tierBadge(f.tier)}
                      {(f as any).flagged && (
                        <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">
                          <Flag className="w-2.5 h-2.5 mr-0.5" /> Frustration
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500 ml-auto">
                        {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-sm ${sentimentColor(f.sentiment)}`}>{f.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: What Clients Love ── */}
        <TabsContent value="love" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top subminds */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Top-Rated Submind Outputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topSubminds.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-500 w-6 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{s.uses.toLocaleString()} uses</span>
                          <span className="text-sm font-bold text-amber-400">★ {s.score}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full mt-1">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(s.score / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Most used features */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Most-Used Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { feature: "Campaigns", uses: 2340 },
                      { feature: "Chat", uses: 1890 },
                      { feature: "Approvals", uses: 1420 },
                      { feature: "Analytics", uses: 980 },
                      { feature: "Strategy", uses: 720 },
                      { feature: "Competitors", uses: 540 },
                    ]} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis dataKey="feature" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={80} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                      <Bar dataKey="uses" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Adoption curve */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Feature Adoption Curve (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adoptionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                    <Legend formatter={(v) => <span className="text-xs text-slate-300 capitalize">{v}</span>} />
                    <Line type="monotone" dataKey="campaigns" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="chat" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="approvals" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="analytics" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Feedback → Roadmap ── */}
        <TabsContent value="roadmap" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{shippedPct}%</div>
                <div className="text-xs text-slate-400 mt-1">Shipped features from client votes</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-3xl font-bold text-white">{votes.filter((v) => v.roadmap_item_id).length}</div>
                <div className="text-xs text-slate-400 mt-1">Linked to roadmap items</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{votes.filter((v) => v.status === "planned" || v.status === "in_progress").length}</div>
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
            </CardContent>
          </Card>

          {/* Linked items */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
