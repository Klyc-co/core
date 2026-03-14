import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft, BookOpen, Search, CalendarDays, Filter, TrendingUp,
  BarChart3, Loader2, Info, X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface CampaignRecord {
  id: string;
  platform: string;
  post_theme: string | null;
  actual_engagement: number | null;
  actual_ctr: number | null;
  actual_conversion: number | null;
  performance_score: number | null;
  created_at: string;
  client_id: string;
}

interface EnrichedRecord extends CampaignRecord {
  industry: string;
  conversion_rate: number;
  engagement: number;
}

const CampaignKnowledgeCenter = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    const [perfRes, profileRes] = await Promise.all([
      supabase
        .from("campaign_performance")
        .select("id, platform, post_theme, actual_engagement, actual_ctr, actual_conversion, performance_score, created_at, client_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("client_profiles")
        .select("user_id, industry")
        .eq("user_id", userId),
    ]);

    const industryMap = new Map<string, string>();
    (profileRes.data ?? []).forEach((p) => {
      if (p.industry) industryMap.set(p.user_id, p.industry);
    });

    const enriched: EnrichedRecord[] = (perfRes.data ?? []).map((r) => ({
      ...r,
      industry: industryMap.get(r.client_id) || "Unknown",
      engagement: r.actual_engagement ?? 0,
      conversion_rate: r.actual_conversion ?? 0,
    }));

    setRecords(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else { setUser(user); fetchData(user.id); }
    });
  }, [navigate, fetchData]);

  const platforms = useMemo(() => {
    const set = new Set(records.map((r) => r.platform));
    return Array.from(set).sort();
  }, [records]);

  const industries = useMemo(() => {
    const set = new Set(records.map((r) => r.industry));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (platformFilter !== "all" && r.platform !== platformFilter) return false;
      if (industryFilter !== "all" && r.industry !== industryFilter) return false;
      if (dateFrom && new Date(r.created_at) < dateFrom) return false;
      if (dateTo && new Date(r.created_at) > dateTo) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = `${r.post_theme ?? ""} ${r.platform} ${r.industry}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [records, platformFilter, industryFilter, dateFrom, dateTo, searchQuery]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return { avgEngagement: 0, avgConversion: 0, avgScore: 0 };
    const sum = filtered.reduce(
      (acc, r) => ({
        eng: acc.eng + r.engagement,
        conv: acc.conv + r.conversion_rate,
        score: acc.score + (r.performance_score ?? 0),
      }),
      { eng: 0, conv: 0, score: 0 }
    );
    return {
      avgEngagement: sum.eng / filtered.length,
      avgConversion: sum.conv / filtered.length,
      avgScore: sum.score / filtered.length,
    };
  }, [filtered]);

  const hasFilters = platformFilter !== "all" || industryFilter !== "all" || !!dateFrom || !!dateTo || !!searchQuery;

  const clearFilters = () => {
    setPlatformFilter("all");
    setIndustryFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Campaign Knowledge Center
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical campaign performance intelligence
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Campaigns" value={filtered.length.toString()} icon={<BarChart3 className="w-4 h-4" />} />
          <SummaryCard label="Avg Engagement" value={stats.avgEngagement.toFixed(1)} icon={<TrendingUp className="w-4 h-4" />} />
          <SummaryCard label="Avg Conversion" value={`${stats.avgConversion.toFixed(1)}%`} icon={<TrendingUp className="w-4 h-4" />} />
          <SummaryCard label="Avg Score" value={stats.avgScore.toFixed(0)} icon={<BarChart3 className="w-4 h-4" />} />
        </div>

        {/* Filters */}
        <Card className="border-border/60 mb-6">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Filters</span>
              </div>

              <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search themes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 bg-card border-border"
                />
              </div>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-card border-border">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs bg-card border-border">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DatePicker label="From" date={dateFrom} onChange={setDateFrom} />
              <DatePicker label="To" date={dateTo} onChange={setDateTo} />

              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                  <X className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Campaign Records
              <Badge variant="outline" className="ml-2 text-[10px] h-5 font-mono">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No campaigns match your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_100px_90px_80px_80px_80px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <span>Theme</span>
                  <span>Platform</span>
                  <span>Industry</span>
                  <span className="text-right">Engage</span>
                  <span className="text-right">Conv %</span>
                  <span className="text-right">Score</span>
                </div>

                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_100px_90px_80px_80px_80px] gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {r.post_theme || "Untitled"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">
                        {r.platform} · {r.industry} · {format(new Date(r.created_at), "MMM d, yyyy")}
                      </p>
                    </div>

                    <Badge variant="outline" className="text-[10px] h-5 w-fit capitalize hidden sm:inline-flex border-border">
                      {r.platform}
                    </Badge>

                    <span className="text-[10px] text-muted-foreground hidden sm:block truncate">{r.industry}</span>

                    <span className="text-xs font-mono text-foreground text-right hidden sm:block">
                      {r.engagement.toFixed(1)}
                    </span>

                    <span className={cn(
                      "text-xs font-mono text-right hidden sm:block",
                      r.conversion_rate >= 5 ? "text-primary" : r.conversion_rate >= 2 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {r.conversion_rate.toFixed(1)}%
                    </span>

                    <span className={cn(
                      "text-xs font-mono text-right hidden sm:block font-medium",
                      (r.performance_score ?? 0) >= 70 ? "text-primary" : (r.performance_score ?? 0) >= 40 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {(r.performance_score ?? 0).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <p className="text-lg font-bold text-foreground font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}

function DatePicker({ label, date, onChange }: { label: string; date: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 border-border", !date && "text-muted-foreground")}>
          <CalendarDays className="w-3 h-3" />
          {date ? format(date, "MMM d") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export default CampaignKnowledgeCenter;
