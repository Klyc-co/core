import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Calendar, ChevronRight, Copy, Flag, GripVertical, Layers,
  Plus, Target, ThumbsUp, User, X,
} from "lucide-react";
import { format } from "date-fns";

/* ── Types ── */
interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: number;
  effort: string;
  target_date: string | null;
  progress_pct: number;
  owner_id: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  vote_count?: number;
}

/* ── Constants ── */
const STATUSES = ["backlog", "planning", "design", "build", "test", "shipped"] as const;
const CATEGORIES = ["infrastructure", "subminds", "frontend", "integrations", "business"] as const;
const EFFORTS = ["S", "M", "L", "XL"] as const;

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-slate-500/20 text-slate-400",
  planning: "bg-blue-500/20 text-blue-400",
  design: "bg-purple-500/20 text-purple-400",
  build: "bg-cyan-500/20 text-cyan-400",
  test: "bg-yellow-500/20 text-yellow-400",
  shipped: "bg-emerald-500/20 text-emerald-400",
};

const CAT_COLORS: Record<string, string> = {
  infrastructure: "bg-orange-500/20 text-orange-400",
  subminds: "bg-violet-500/20 text-violet-400",
  frontend: "bg-blue-500/20 text-blue-400",
  integrations: "bg-cyan-500/20 text-cyan-400",
  business: "bg-emerald-500/20 text-emerald-400",
};

const EFFORT_COLORS: Record<string, string> = {
  S: "bg-emerald-500/20 text-emerald-400",
  M: "bg-blue-500/20 text-blue-400",
  L: "bg-yellow-500/20 text-yellow-400",
  XL: "bg-red-500/20 text-red-400",
};

const EMPLOYEES = [
  { id: "e1", name: "Kitchens" },
  { id: "e2", name: "Ethan K" },
  { id: "e3", name: "Ethan W" },
  { id: "e4", name: "Rohil" },
];

/* ── Mock data ── */
function generateMockItems(): RoadmapItem[] {
  const items: Omit<RoadmapItem, "id">[] = [
    { title: "Compound hash compression", description: "Implement compound hash chains for 102x+ compression ratios. Key moat milestone.", category: "infrastructure", status: "build", priority: 1, effort: "XL", target_date: "2026-05-15", progress_pct: 65, owner_id: "e2", shipped_at: null, created_at: "2026-01-15T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan K", vote_count: 0 },
    { title: "TikTok auto-captions", description: "Auto-generate captions with trending hashtags for TikTok content via Creative submind.", category: "subminds", status: "design", priority: 2, effort: "L", target_date: "2026-05-01", progress_pct: 30, owner_id: "e3", shipped_at: null, created_at: "2026-02-01T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan W", vote_count: 39 },
    { title: "Bulk scheduling UI", description: "Allow scheduling 50+ posts at once with CSV upload across all platforms.", category: "frontend", status: "planning", priority: 3, effort: "L", target_date: "2026-06-01", progress_pct: 15, owner_id: "e3", shipped_at: null, created_at: "2026-02-15T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan W", vote_count: 47 },
    { title: "Shopify deep integration", description: "Pull product catalog directly into campaign generation flow.", category: "integrations", status: "backlog", priority: 4, effort: "M", target_date: "2026-07-01", progress_pct: 0, owner_id: null, shipped_at: null, created_at: "2026-03-01T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: undefined, vote_count: 28 },
    { title: "Agency tier pricing", description: "New tier for agencies managing 10+ client accounts with volume discounts.", category: "business", status: "planning", priority: 5, effort: "M", target_date: "2026-06-15", progress_pct: 10, owner_id: "e1", shipped_at: null, created_at: "2026-03-10T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Kitchens", vote_count: 19 },
    { title: "Dark mode client portal", description: "Complete dark mode support for all client-facing pages.", category: "frontend", status: "shipped", priority: 10, effort: "M", target_date: "2026-03-01", progress_pct: 100, owner_id: "e3", shipped_at: "2026-03-05T00:00:00Z", created_at: "2026-01-20T00:00:00Z", updated_at: "2026-03-05T00:00:00Z", owner_name: "Ethan W", vote_count: 31 },
    { title: "White-label reports", description: "Remove KLYC branding from all client-facing exported reports.", category: "frontend", status: "shipped", priority: 11, effort: "S", target_date: "2026-02-15", progress_pct: 100, owner_id: "e3", shipped_at: "2026-02-18T00:00:00Z", created_at: "2026-01-10T00:00:00Z", updated_at: "2026-02-18T00:00:00Z", owner_name: "Ethan W", vote_count: 22 },
    { title: "Cross-client learning patterns", description: "Enable anonymized cross-client pattern detection for compound compression.", category: "infrastructure", status: "backlog", priority: 6, effort: "XL", target_date: "2026-09-01", progress_pct: 0, owner_id: "e2", shipped_at: null, created_at: "2026-03-15T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan K", vote_count: 0 },
    { title: "Viral submind activation", description: "Move Viral submind from stub to active with real virality scoring.", category: "subminds", status: "design", priority: 7, effort: "L", target_date: "2026-07-15", progress_pct: 20, owner_id: "e2", shipped_at: null, created_at: "2026-03-20T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan K", vote_count: 15 },
    { title: "Custom brand voice fine-tuning", description: "Let clients upload tone examples for AI learning.", category: "subminds", status: "build", priority: 8, effort: "L", target_date: "2026-05-30", progress_pct: 45, owner_id: "e2", shipped_at: null, created_at: "2026-02-10T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan K", vote_count: 26 },
    { title: "Image gen speed optimization", description: "Reduce image generation from 15-20s to under 5s.", category: "infrastructure", status: "test", priority: 9, effort: "M", target_date: "2026-04-15", progress_pct: 85, owner_id: "e2", shipped_at: null, created_at: "2026-03-01T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: "Ethan K", vote_count: 34 },
    { title: "Competitor real-time alerts", description: "Push notifications when competitors post high-engagement content.", category: "subminds", status: "backlog", priority: 12, effort: "M", target_date: null, progress_pct: 0, owner_id: null, shipped_at: null, created_at: "2026-03-25T00:00:00Z", updated_at: "2026-04-01T00:00:00Z", owner_name: undefined, vote_count: 15 },
  ];

  return items.map((item) => ({ ...item, id: crypto.randomUUID() }));
}

/* ── New Item Form ── */
function NewItemForm({ onClose, onSave }: { onClose: () => void; onSave: (item: Partial<RoadmapItem>) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("frontend");
  const [effort, setEffort] = useState<string>("M");
  const [targetDate, setTargetDate] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState(50);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">New Roadmap Item</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-9 px-3 text-sm bg-slate-800 border border-slate-700 rounded text-white" placeholder="Feature name..." />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-20 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded text-white resize-none" placeholder="What and why..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-2 text-sm bg-slate-800 border border-slate-700 rounded text-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Effort</label>
              <select value={effort} onChange={(e) => setEffort(e.target.value)} className="w-full h-9 px-2 text-sm bg-slate-800 border border-slate-700 rounded text-white">
                {EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Target Date</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full h-9 px-2 text-sm bg-slate-800 border border-slate-700 rounded text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Priority (lower = higher)</label>
              <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full h-9 px-2 text-sm bg-slate-800 border border-slate-700 rounded text-white" min={1} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Owner</label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full h-9 px-2 text-sm bg-slate-800 border border-slate-700 rounded text-white">
              <option value="">Unassigned</option>
              {EMPLOYEES.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">Cancel</Button>
          <Button size="sm" disabled={!title.trim()} onClick={() => {
            onSave({
              title, description, category, effort, priority,
              target_date: targetDate || null,
              owner_id: owner || null,
              owner_name: EMPLOYEES.find((e) => e.id === owner)?.name,
              status: "backlog", progress_pct: 0,
            });
            onClose();
          }}>
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Kanban Card ── */
function KanbanCard({ item, onMove }: { item: RoadmapItem; onMove: (id: string, status: string) => void }) {
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 space-y-2 cursor-grab hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-white leading-tight">{item.title}</span>
        <GripVertical className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge className={`${CAT_COLORS[item.category] || ""} border-0 text-[9px]`}>{item.category}</Badge>
        <Badge className={`${EFFORT_COLORS[item.effort] || ""} border-0 text-[9px]`}>{item.effort}</Badge>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        {item.owner_name ? (
          <span className="text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{item.owner_name}</span>
        ) : (
          <span className="text-slate-600">Unassigned</span>
        )}
        {item.target_date && (
          <span className="text-slate-500">{format(new Date(item.target_date), "MMM d")}</span>
        )}
      </div>
      {(item.vote_count ?? 0) > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-primary">
          <ThumbsUp className="w-3 h-3" /> {item.vote_count}
        </div>
      )}
      {item.progress_pct > 0 && item.status !== "shipped" && (
        <div className="h-1 bg-slate-700 rounded-full">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.progress_pct}%` }} />
        </div>
      )}
      {/* Quick move buttons */}
      <div className="flex gap-1 pt-1">
        {STATUSES.filter((s) => s !== item.status).slice(0, 3).map((s) => (
          <button key={s} onClick={() => onMove(item.id, s)} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors capitalize">
            → {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function KlycAdminRoadmap() {
  const [items, setItems] = useState<RoadmapItem[]>(generateMockItems);
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [swimlane, setSwimlane] = useState(false);

  // Try real data
  const { data: dbItems } = useQuery({
    queryKey: ["admin-roadmap"],
    queryFn: async () => {
      const { data } = await supabase.from("roadmap_items").select("*").order("priority", { ascending: true });
      return data || [];
    },
  });

  const allItems = useMemo(() => {
    if (dbItems && dbItems.length > 0) {
      return dbItems.map((d: any) => ({
        ...d,
        owner_name: EMPLOYEES.find((e) => e.id === d.owner_id)?.name,
        vote_count: 0,
      }));
    }
    return items;
  }, [dbItems, items]);

  const filtered = useMemo(() => {
    let result = [...allItems];
    if (categoryFilter !== "all") result = result.filter((i) => i.category === categoryFilter);
    if (ownerFilter !== "all") result = result.filter((i) => i.owner_name === ownerFilter);
    return result;
  }, [allItems, categoryFilter, ownerFilter]);

  const next5 = useMemo(() =>
    [...allItems].filter((i) => i.status !== "shipped").sort((a, b) => a.priority - b.priority).slice(0, 5),
    [allItems]
  );

  const shippedItems = useMemo(() =>
    [...allItems].filter((i) => i.status === "shipped").sort((a, b) =>
      new Date(b.shipped_at || b.updated_at).getTime() - new Date(a.shipped_at || a.updated_at).getTime()
    ),
    [allItems]
  );

  const moveItem = (id: string, newStatus: string) => {
    setItems((prev) => prev.map((i) =>
      i.id === id ? {
        ...i,
        status: newStatus,
        progress_pct: newStatus === "shipped" ? 100 : i.progress_pct,
        shipped_at: newStatus === "shipped" ? new Date().toISOString() : i.shipped_at,
      } : i
    ));
  };

  const addItem = (partial: Partial<RoadmapItem>) => {
    const newItem: RoadmapItem = {
      id: crypto.randomUUID(),
      title: partial.title || "",
      description: partial.description || null,
      category: partial.category || "frontend",
      status: partial.status || "backlog",
      priority: partial.priority || 100,
      effort: partial.effort || "M",
      target_date: partial.target_date || null,
      progress_pct: partial.progress_pct || 0,
      owner_id: partial.owner_id || null,
      shipped_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_name: partial.owner_name,
      vote_count: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const velocityData = useMemo(() => {
    const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    return months.map((m) => ({
      month: m,
      shipped: Math.floor(Math.random() * 5 + 1),
    }));
  }, []);

  const generateChangelog = () => {
    const lines = shippedItems.map((i) => `• **${i.title}** — ${i.description || "No description"} _(${i.shipped_at ? format(new Date(i.shipped_at), "MMM d, yyyy") : "N/A"})_`);
    const changelog = `# KLYC Release Notes\n\n${lines.join("\n\n")}`;
    navigator.clipboard.writeText(changelog);
  };

  const byCategory = useMemo(() => {
    const cats: Record<string, RoadmapItem[]> = {};
    filtered.forEach((i) => {
      if (!cats[i.category]) cats[i.category] = [];
      cats[i.category].push(i);
    });
    return cats;
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Roadmap</h1>
          <p className="text-sm text-slate-400">{allItems.length} items • {shippedItems.length} shipped</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New Item
        </Button>
      </div>

      {/* Next 5 hero */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Next 5 Priorities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {next5.map((item, idx) => (
            <Card key={item.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                  <Badge className={`${STATUS_COLORS[item.status]} border-0 text-[9px]`}>{item.status}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-white leading-tight">{item.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{item.description}</p>
                <div className="h-1.5 bg-slate-800 rounded-full">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.progress_pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{item.progress_pct}%</span>
                  {item.target_date && <span>{format(new Date(item.target_date), "MMM d")}</span>}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{item.owner_name || "Unassigned"}</span>
                  {(item.vote_count ?? 0) > 0 && (
                    <span className="text-primary flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{item.vote_count}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="kanban" className="data-[state=active]:bg-slate-700">
            <Layers className="w-3.5 h-3.5 mr-1" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
            <Calendar className="w-3.5 h-3.5 mr-1" /> Release History
          </TabsTrigger>
        </TabsList>

        {/* ── Kanban ── */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Category:</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-7 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300">
                <option value="all">All</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Owner:</span>
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="h-7 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300">
                <option value="all">All</option>
                {EMPLOYEES.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <Button variant={swimlane ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs ${!swimlane ? "text-slate-400" : ""}`} onClick={() => setSwimlane(!swimlane)}>
              <Flag className="w-3 h-3 mr-1" /> Swimlanes
            </Button>
          </div>

          {swimlane ? (
            // Swimlane view grouped by category
            <div className="space-y-6">
              {Object.entries(byCategory).map(([cat, catItems]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-slate-300 capitalize mb-2">{cat}</h3>
                  <div className="grid grid-cols-6 gap-2">
                    {STATUSES.map((status) => (
                      <div key={status} className="space-y-2">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider text-center">{status}</div>
                        {catItems.filter((i) => i.status === status).map((item) => (
                          <KanbanCard key={item.id} item={item} onMove={moveItem} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Standard kanban
            <div className="grid grid-cols-6 gap-3">
              {STATUSES.map((status) => {
                const colItems = filtered.filter((i) => i.status === status).sort((a, b) => a.priority - b.priority);
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <Badge className={`${STATUS_COLORS[status]} border-0 text-[10px] capitalize`}>{status}</Badge>
                      <span className="text-[10px] text-slate-500">{colItems.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[100px] bg-slate-800/20 rounded-lg p-2 border border-dashed border-slate-800">
                      {colItems.map((item) => (
                        <KanbanCard key={item.id} item={item} onMove={moveItem} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Release History ── */}
        <TabsContent value="history" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timeline */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-300">Shipped Items</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-400" onClick={generateChangelog}>
                    <Copy className="w-3 h-3 mr-1" /> Copy Changelog
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {shippedItems.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8">Nothing shipped yet</div>
                ) : (
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
                    {shippedItems.map((item) => (
                      <div key={item.id} className="relative">
                        <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        <div className="text-xs text-slate-500 mb-1">
                          {item.shipped_at ? format(new Date(item.shipped_at), "MMM d, yyyy") : "N/A"}
                        </div>
                        <div className="text-sm font-medium text-white">{item.title}</div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge className={`${CAT_COLORS[item.category]} border-0 text-[9px]`}>{item.category}</Badge>
                          {(item.vote_count ?? 0) > 0 && (
                            <Badge className="bg-primary/20 text-primary border-0 text-[9px]">
                              <ThumbsUp className="w-2.5 h-2.5 mr-0.5" />{item.vote_count} votes
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Velocity */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Shipping Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                      <Bar dataKey="shipped" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-white">{shippedItems.length}</div>
                    <div className="text-[10px] text-slate-400">Total Shipped</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{(velocityData.reduce((a, v) => a + v.shipped, 0) / velocityData.length).toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400">Avg / Month</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-400">
                      {allItems.filter((i) => i.status === "shipped" && (i.vote_count ?? 0) > 0).length}
                    </div>
                    <div className="text-[10px] text-slate-400">From Client Votes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {showForm && <NewItemForm onClose={() => setShowForm(false)} onSave={addItem} />}
    </div>
  );
}
