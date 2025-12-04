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
  MessageCircle
} from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import AppHeader from "@/components/AppHeader";
import type { User } from "@supabase/supabase-js";

// Platform icons/colors
const platformConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  tiktok: { color: "bg-pink-500", icon: <Hash className="w-4 h-4" />, label: "TikTok" },
  instagram: { color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: <Hash className="w-4 h-4" />, label: "Instagram" },
  linkedin: { color: "bg-blue-600", icon: <Newspaper className="w-4 h-4" />, label: "LinkedIn" },
  facebook: { color: "bg-blue-500", icon: <MessageCircle className="w-4 h-4" />, label: "Facebook" },
  google: { color: "bg-green-500", icon: <Search className="w-4 h-4" />, label: "Google Trends" },
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
          platforms: ['tiktok', 'instagram', 'linkedin', 'facebook', 'google', 'twitter']
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

  const platforms = Object.keys(platformConfig);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                Trend Monitor
              </h1>
              <p className="text-muted-foreground">
                Track what's trending across social media platforms
              </p>
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
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: TrendItem }) {
  const config = platformConfig[trend.platform];
  
  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-2">
        <Badge 
          variant="secondary" 
          className={`text-xs ${config?.color || 'bg-gray-500'} text-white`}
        >
          #{trend.trend_rank}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{trend.trend_name}</p>
          {trend.trend_category && (
            <p className="text-xs text-muted-foreground capitalize">
              {trend.trend_category}
            </p>
          )}
        </div>
      </div>
      {trend.trend_volume && (
        <p className="text-xs text-muted-foreground mt-1">
          {trend.trend_volume} mentions
        </p>
      )}
    </div>
  );
}
