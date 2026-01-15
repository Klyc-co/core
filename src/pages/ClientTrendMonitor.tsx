import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  BarChart3,
  Users
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfDay, isSameDay } from "date-fns";
import ClientHeader from "@/components/ClientHeader";
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

export default function ClientTrendMonitor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activePlatform, setActivePlatform] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [datesWithData, setDatesWithData] = useState<Date[]>([]);

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
      navigate("/client/auth");
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

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/client/strategy')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  Trend Monitor
                </h1>
                <p className="text-muted-foreground">
                  Track what's trending across social media platforms
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {format(lastUpdated, "MMM d, h:mm a")}
                </span>
              )}
              <Button 
                onClick={handleRefreshTrends} 
                disabled={isFetching}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? "Fetching..." : "Refresh Trends"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Calendar Sidebar */}
            <div className="col-span-3">
              <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  modifiers={{
                    hasData: datesWithData,
                  }}
                  modifiersStyles={{
                    hasData: {
                      backgroundColor: 'hsl(var(--primary) / 0.2)',
                      borderRadius: '50%',
                    }
                  }}
                  className="rounded-md border"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Dates with data are highlighted. Data is saved hourly when you refresh.
                </p>
              </CardContent>
            </Card>

            {/* Platform Legend */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Platforms</CardTitle>
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

            {/* Strategy Modules Sidebar */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Strategy Modules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <button 
                  onClick={() => navigate("/client/strategy")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
                >
                  <BarChart3 className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Run Report</div>
                  </div>
                </button>
                <button 
                  onClick={() => navigate("/client/strategy/competitors")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
                >
                  <Users className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Competitor Analysis</div>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
                  <TrendingUp className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Trend Monitor</div>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Trending on {format(selectedDate, "MMMM d, yyyy")}
                  </CardTitle>
                  <Badge variant="secondary">
                    {filteredTrends.length} trends
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activePlatform} onValueChange={setActivePlatform}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All Platforms</TabsTrigger>
                    {platforms.map(platform => (
                      <TabsTrigger key={platform} value={platform}>
                        {platformConfig[platform].label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value={activePlatform}>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTrends.length === 0 ? (
                      <div className="text-center py-12">
                        <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No trends found</h3>
                        <p className="text-muted-foreground mb-4">
                          {isSameDay(selectedDate, new Date()) 
                            ? "Click 'Refresh Trends' to fetch the latest trending topics."
                            : "No trend data saved for this date."}
                        </p>
                        {isSameDay(selectedDate, new Date()) && (
                          <Button onClick={handleRefreshTrends} disabled={isFetching}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            Fetch Trends Now
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                          {activePlatform === "all" ? (
                            // Show grouped by platform
                            Object.entries(trendsByPlatform).map(([platform, platformTrends]) => (
                              <div key={platform}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`w-3 h-3 rounded-full ${platformConfig[platform]?.color || 'bg-gray-500'}`} />
                                  <h3 className="font-semibold">{platformConfig[platform]?.label || platform}</h3>
                                  <Badge variant="outline">{platformTrends.length}</Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                                  {platformTrends.slice(0, 12).map((trend) => (
                                    <TrendCard key={trend.id} trend={trend} />
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            // Show single platform
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary" />
                    Cross-Platform Trends
                    <Badge variant="secondary" className="ml-2">
                      {crossPlatformTrends.length} found
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Trends appearing across multiple platforms
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {crossPlatformTrends.map((crossTrend, index) => (
                      <div 
                        key={index}
                        className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base">{crossTrend.name}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {crossTrend.platforms.map(platform => {
                                const config = platformConfig[platform];
                                return (
                                  <Badge 
                                    key={platform}
                                    variant="outline" 
                                    className={`text-xs ${config?.color || 'bg-gray-500'} text-white border-none`}
                                  >
                                    {config?.label || platform}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-lg font-bold">
                              {crossTrend.platforms.length}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">platforms</p>
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

// TrendCard component
interface TrendCardProps {
  trend: TrendItem;
}

function TrendCard({ trend }: TrendCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = platformConfig[trend.platform];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left w-full"
      >
        <div className="flex items-start gap-2">
          {trend.trend_rank && (
            <span className="text-xs font-bold text-muted-foreground">#{trend.trend_rank}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{trend.trend_name}</p>
            {trend.trend_volume && (
              <p className="text-xs text-muted-foreground">{trend.trend_volume}</p>
            )}
          </div>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config?.color || 'bg-gray-500'}`} />
              {trend.trend_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{config?.label || trend.platform}</Badge>
              {trend.trend_rank && <Badge variant="secondary">Rank #{trend.trend_rank}</Badge>}
              {trend.trend_category && <Badge variant="outline">{trend.trend_category}</Badge>}
            </div>
            
            {trend.trend_volume && (
              <p className="text-muted-foreground">Volume: {trend.trend_volume}</p>
            )}
            
            <p className="text-sm text-muted-foreground">
              Scraped: {format(new Date(trend.scraped_at), "MMM d, yyyy h:mm a")}
            </p>
            
            {trend.trend_url && (
              <Button asChild variant="outline" className="w-full gap-2">
                <a href={trend.trend_url} target="_blank" rel="noopener noreferrer">
                  View Link <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}