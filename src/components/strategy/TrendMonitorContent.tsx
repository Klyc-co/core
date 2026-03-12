import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  RefreshCw, TrendingUp, Calendar as CalendarIcon, Hash, Newspaper, Search, MessageCircle, ExternalLink,
} from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const platformConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  google: { color: "bg-green-500", icon: <Search className="w-4 h-4" />, label: "Google Trends" },
  tiktok: { color: "bg-pink-500", icon: <Hash className="w-4 h-4" />, label: "TikTok" },
  instagram: { color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: <Hash className="w-4 h-4" />, label: "Instagram" },
  linkedin: { color: "bg-blue-600", icon: <Newspaper className="w-4 h-4" />, label: "LinkedIn" },
  facebook: { color: "bg-blue-500", icon: <MessageCircle className="w-4 h-4" />, label: "Facebook" },
  twitter: { color: "bg-sky-500", icon: <Hash className="w-4 h-4" />, label: "Twitter/X" },
};

interface TrendItem {
  id: string;
  platform: string;
  trend_name: string;
  trend_rank: number;
  trend_category: string | null;
  trend_volume: string | null;
  trend_url: string | null;
  scraped_at: string;
}

export default function TrendMonitorContent() {
  const { toast } = useToast();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("social_trends")
      .select("*")
      .eq("user_id", user.id)
      .order("scraped_at", { ascending: false })
      .limit(200);
    setTrends((data as TrendItem[]) || []);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.functions.invoke("scrape-trends", { body: { userId: user.id } });
      if (error) throw error;
      toast({ title: "Trends refreshed!" });
      fetchTrends();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const filteredTrends = trends.filter(t => {
    const matchDate = isSameDay(new Date(t.scraped_at), selectedDate);
    const matchPlatform = selectedPlatform === "all" || t.platform === selectedPlatform;
    return matchDate && matchPlatform;
  });

  const platforms = [...new Set(trends.map(t => t.platform))];
  const trendDates = [...new Set(trends.map(t => startOfDay(new Date(t.scraped_at)).toISOString()))].map(d => new Date(d));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Trend Monitor</h3>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Calendar */}
        <Card className="shrink-0">
          <CardContent className="pt-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={{ hasTrends: trendDates }}
              modifiersClassNames={{ hasTrends: "bg-primary/20 font-bold" }}
            />
          </CardContent>
        </Card>

        {/* Trends */}
        <div className="flex-1">
          <div className="flex gap-2 mb-3 flex-wrap">
            <Badge variant={selectedPlatform === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedPlatform("all")}>All</Badge>
            {platforms.map(p => (
              <Badge key={p} variant={selectedPlatform === p ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedPlatform(p)}>
                {platformConfig[p]?.label || p}
              </Badge>
            ))}
          </div>

          {filteredTrends.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No trends found for this date. Try refreshing or selecting a different date.</CardContent></Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-4">
                {filteredTrends.map(t => (
                  <Card key={t.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedTrend(t)}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <Badge variant="outline" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full">{t.trend_rank}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.trend_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{platformConfig[t.platform]?.label || t.platform}</span>
                          {t.trend_volume && <span>• {t.trend_volume}</span>}
                          {t.trend_category && <Badge variant="secondary" className="text-[10px]">{t.trend_category}</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <Dialog open={!!selectedTrend} onOpenChange={() => setSelectedTrend(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedTrend?.trend_name}</DialogTitle></DialogHeader>
          {selectedTrend && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge>{platformConfig[selectedTrend.platform]?.label || selectedTrend.platform}</Badge>
                <Badge variant="outline">Rank #{selectedTrend.trend_rank}</Badge>
                {selectedTrend.trend_volume && <Badge variant="secondary">{selectedTrend.trend_volume}</Badge>}
              </div>
              {selectedTrend.trend_category && <p className="text-sm text-muted-foreground">Category: {selectedTrend.trend_category}</p>}
              <p className="text-sm text-muted-foreground">Scraped: {format(new Date(selectedTrend.scraped_at), "PPpp")}</p>
              {selectedTrend.trend_url && (
                <a href={selectedTrend.trend_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View on platform
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
