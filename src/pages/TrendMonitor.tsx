import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  RefreshCw, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Hash,
  Newspaper,
  Search,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  Menu
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfDay, isSameDay } from "date-fns";
import AppHeader from "@/components/AppHeader";
import StrategyMobileNav from "@/components/StrategyMobileNav";
import type { User } from "@supabase/supabase-js";

// Platform icons/colors
const platformConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  google: { color: "bg-green-500", icon: <Search className="w-4 h-4" />, label: "Google Trends" },
  tiktok: { color: "bg-pink-500", icon: <Hash className="w-4 h-4" />, label: "TikTok" },
  instagram: { color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: <Hash className="w-4 h-4" />, label: "Instagram" },
  linkedin: { color: "bg-blue-600", icon: <Newspaper className="w-4 h-4" />, label: "LinkedIn" },
  facebook: { color: "bg-blue-500", icon: <MessageCircle className="w-4 h-4" />, label: "Facebook" },
  twitter: { color: "bg-sky-500", icon: <Hash className="w-4 h-4" />, label: "Twitter/X" },
  snapchat: { color: "bg-yellow-400", icon: <MessageCircle className="w-4 h-4" />, label: "Snapchat" },
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

export default function TrendMonitor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activePlatform, setActivePlatform] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [datesWithData, setDatesWithData] = useState<Date[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTrends();
      fetchDatesWithData();
    }
  }, [userId, selectedDate]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    setUserId(user.id);
  };

  const fetchDatesWithData = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('social_trends')
      .select('scraped_at')
      .eq('user_id', userId);

    if (!error && data) {
      const uniqueDates = [...new Set(data.map(d => 
        format(new Date(d.scraped_at), 'yyyy-MM-dd')
      ))].map(d => new Date(d));
      setDatesWithData(uniqueDates);
    }
  };

  const fetchTrends = async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = new Date(startOfSelectedDay);
      endOfSelectedDay.setDate(endOfSelectedDay.getDate() + 1);

      let query = supabase
        .from('social_trends')
        .select('*')
        .eq('user_id', userId)
        .gte('scraped_at', startOfSelectedDay.toISOString())
        .lt('scraped_at', endOfSelectedDay.toISOString())
        .order('scraped_at', { ascending: false })
        .order('trend_rank', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setTrends(data || []);

      if (data && data.length > 0) {
        setLastUpdated(new Date(data[0].scraped_at));
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshTrends = async () => {
    if (!userId) return;
    setIsFetching(true);

    try {
      toast({
        title: "Fetching Trends",
        description: "Scraping latest trends from all platforms...",
      });

      const response = await supabase.functions.invoke('fetch-trends', {
        body: { 
          userId,
          platforms: ['tiktok', 'instagram', 'linkedin', 'facebook', 'google', 'twitter', 'snapchat']
        }
      });

      if (response.error) throw response.error;

      const { count } = response.data;

      toast({
        title: "Trends Updated",
        description: `Found ${count} trending topics across platforms.`,
      });

      // Refresh the displayed trends
      setSelectedDate(new Date());
      await fetchTrends();
      await fetchDatesWithData();
      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Error fetching trends:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch trends",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const filteredTrends = activePlatform === "all" 
    ? trends 
    : trends.filter(t => t.platform === activePlatform);

  // Group trends by platform for display
  const trendsByPlatform = filteredTrends.reduce((acc, trend) => {
    if (!acc[trend.platform]) {
      acc[trend.platform] = [];
    }
    acc[trend.platform].push(trend);
    return acc;
  }, {} as Record<string, TrendItem[]>);

  // Find cross-platform trends (similar trend names across multiple platforms)
  const crossPlatformTrends = (() => {
    const trendMap = new Map<string, { name: string; platforms: string[]; trends: TrendItem[] }>();
    
    trends.forEach(trend => {
      // Normalize trend name for comparison (lowercase, remove special chars)
      const normalizedName = trend.trend_name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 3)
        .join(' ');
      
      if (normalizedName.length < 4) return;
      
      // Check if any existing trend has similar keywords
      let matched = false;
      trendMap.forEach((value, key) => {
        const keyWords = key.split(' ');
        const nameWords = normalizedName.split(' ');
        const commonWords = keyWords.filter(w => nameWords.includes(w));
        
        if (commonWords.length >= 1 && !value.platforms.includes(trend.platform)) {
          value.platforms.push(trend.platform);
          value.trends.push(trend);
          matched = true;
        }
      });
      
      if (!matched) {
        trendMap.set(normalizedName, {
          name: trend.trend_name,
          platforms: [trend.platform],
          trends: [trend]
        });
      }
    });
    
    // Return only trends that appear on 2+ platforms
    return Array.from(trendMap.values())
      .filter(t => t.platforms.length >= 2)
      .sort((a, b) => b.platforms.length - a.platforms.length)
      .slice(0, 10);
  })();

  const platforms = Object.keys(platformConfig);

  // Mobile sidebar content
  const SidebarContent = () => (
    <>
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                if (isMobile) setMobileMenuOpen(false);
              }
            }}
            modifiers={{
              hasData: datesWithData,
            }}
            modifiersStyles={{
              hasData: {
                backgroundColor: 'hsl(var(--primary) / 0.2)',
                borderRadius: '50%',
              }
            }}
            className="rounded-md border mx-auto"
          />
          <p className="text-xs text-muted-foreground mt-3 text-center sm:text-left">
            Dates with data are highlighted.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Platforms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {platforms.map(platform => (
            <div key={platform} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${platformConfig[platform].color}`} />
              <span className="text-sm">{platformConfig[platform].label}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {trends.filter(t => t.platform === platform).length}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      {/* Mobile Strategy Navigation */}
      {isMobile && <StrategyMobileNav />}
      
      <div className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Menu Button */}
              {isMobile && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[85vw] max-w-[320px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Trend Monitor
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <SidebarContent />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/brand-strategy')}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                  <span className="truncate">Trend Monitor</span>
                </h1>
                <p className="text-muted-foreground text-sm hidden sm:block">
                  Track what's trending across social media platforms
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {lastUpdated && (
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Last updated: {format(lastUpdated, "MMM d, h:mm a")}
                </span>
              )}
              <Button 
                onClick={handleRefreshTrends} 
                disabled={isFetching}
                className="gap-2 w-full sm:w-auto"
                size={isMobile ? "sm" : "default"}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? "Fetching..." : isMobile ? "Refresh" : "Refresh Trends"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Desktop Sidebar */}
            {!isMobile && (
              <div className="lg:col-span-3">
                <SidebarContent />
              </div>
            )}

            {/* Main Content */}
            <div className="lg:col-span-9">
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-xl">
                      {isMobile ? format(selectedDate, "MMM d, yyyy") : `Trending on ${format(selectedDate, "MMMM d, yyyy")}`}
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {filteredTrends.length} trends
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  <Tabs value={activePlatform} onValueChange={setActivePlatform}>
                    {/* Scrollable tabs for mobile */}
                    <ScrollArea className="w-full pb-2">
                      <TabsList className="mb-4 inline-flex w-max">
                        <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                        {platforms.map(platform => (
                          <TabsTrigger key={platform} value={platform} className="text-xs sm:text-sm">
                            {isMobile ? platform.charAt(0).toUpperCase() + platform.slice(1, 4) : platformConfig[platform].label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    <TabsContent value={activePlatform}>
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredTrends.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                          <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-base sm:text-lg font-semibold mb-2">No trends found</h3>
                          <p className="text-muted-foreground mb-4 text-sm">
                            {isSameDay(selectedDate, new Date()) 
                              ? "Tap 'Refresh' to fetch trending topics."
                              : "No trend data saved for this date."}
                          </p>
                          {isSameDay(selectedDate, new Date()) && (
                            <Button onClick={handleRefreshTrends} disabled={isFetching} size="sm">
                              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                              Fetch Now
                            </Button>
                          )}
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] sm:h-[500px]">
                          <div className="space-y-4">
                            {activePlatform === "all" ? (
                              // Show grouped by platform
                              Object.entries(trendsByPlatform).map(([platform, platformTrends]) => (
                                <div key={platform}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-3 h-3 rounded-full ${platformConfig[platform]?.color || 'bg-gray-500'}`} />
                                    <h3 className="font-semibold text-sm sm:text-base">{platformConfig[platform]?.label || platform}</h3>
                                    <Badge variant="outline" className="text-xs">{platformTrends.length}</Badge>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                                    {platformTrends.slice(0, 12).map((trend) => (
                                      <TrendCard key={trend.id} trend={trend} />
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : (
                              // Show single platform
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {filteredTrends.map((trend) => (
                                  <TrendCard key={trend.id} trend={trend} />
                                ))}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Cross-Platform Trends Section */}
              {crossPlatformTrends.length > 0 && (
                <Card className="mt-4 sm:mt-6">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-xl">
                      <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      <span>Cross-Platform</span>
                      <Badge variant="secondary" className="text-xs">
                        {crossPlatformTrends.length}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Trending across multiple platforms
                    </p>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    <div className="grid gap-2 sm:gap-3">
                      {crossPlatformTrends.map((crossTrend, index) => (
                        <div 
                          key={index}
                          className="p-3 sm:p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base truncate">{crossTrend.name}</h4>
                              <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                                {crossTrend.platforms.map(platform => {
                                  const config = platformConfig[platform];
                                  return (
                                    <Badge 
                                      key={platform}
                                      variant="outline" 
                                      className={`text-[10px] sm:text-xs ${config?.color || 'bg-gray-500'} text-white border-none`}
                                    >
                                      {config?.label || platform}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant="secondary" className="text-sm sm:text-lg font-bold">
                                {crossTrend.platforms.length}
                              </Badge>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">platforms</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: TrendItem }) {
  const config = platformConfig[trend.platform];
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isResolving, setIsResolving] = useState(false);

  const handleView = async () => {
    // If we already have a cached URL, open it directly
    if (trend.trend_url) {
      window.open(trend.trend_url, "_blank", "noopener,noreferrer");
      return;
    }

    setIsResolving(true);
    try {
      const res = await supabase.functions.invoke("resolve-trend-url", {
        body: { trendId: trend.id },
      });

      if (res.error) throw res.error;

      const url = res.data?.url as string | undefined;
      const type = res.data?.type as "direct" | "search" | undefined;
      const message = res.data?.message as string | undefined;

      if (!url) throw new Error("No URL returned");

      // Open the resolved link
      window.open(url, "_blank", "noopener,noreferrer");

      if (type === "direct") {
        toast({
          title: "Direct post found!",
          description: "Opened the post and saved the link for next time.",
        });
      } else {
        // It's a platform search fallback
        toast({
          title: "Opening platform search",
          description: message || "No direct post found—opening search on the platform instead.",
        });
      }
    } catch (e: any) {
      console.error("Error resolving trend URL:", e);
      toast({
        title: "Couldn't open link",
        description: e?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResolving(false);
    }
  };
  
  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-2">
          <Badge 
            variant="secondary" 
            className={`text-[10px] sm:text-xs ${config?.color || 'bg-gray-500'} text-white shrink-0`}
          >
            #{trend.trend_rank}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs sm:text-sm truncate">{trend.trend_name}</p>
            {trend.trend_category && (
              <p className="text-[10px] sm:text-xs text-muted-foreground capitalize truncate">
                {trend.trend_category}
              </p>
            )}
          </div>
        </div>
        {trend.trend_volume && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
            {trend.trend_volume} mentions
          </p>
        )}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <div className={`w-3 h-3 rounded-full shrink-0 ${config?.color || 'bg-gray-500'}`} />
              <span className="truncate">{trend.trend_name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">#{trend.trend_rank}</Badge>
              <Badge variant="secondary" className="text-xs">{config?.label || trend.platform}</Badge>
            </div>
            {trend.trend_category && (
              <p className="text-xs sm:text-sm">
                <span className="text-muted-foreground">Category:</span> {trend.trend_category}
              </p>
            )}
            {trend.trend_volume && (
              <p className="text-xs sm:text-sm">
                <span className="text-muted-foreground">Volume:</span> {trend.trend_volume} mentions
              </p>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Scraped: {format(new Date(trend.scraped_at), "MMM d, yyyy h:mm a")}
            </p>
            <Button onClick={handleView} className="w-full gap-2" size="sm" disabled={isResolving}>
              <ExternalLink className={`w-4 h-4 ${isResolving ? "animate-pulse" : ""}`} />
              {isResolving
                ? "Finding post..."
                : `View on ${config?.label || trend.platform}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
