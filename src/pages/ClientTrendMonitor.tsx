import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  TrendingUp, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Globe,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Trend {
  id: string;
  platform: string;
  trend_name: string;
  trend_rank: number | null;
  trend_volume: string | null;
  trend_url: string | null;
  trend_category: string | null;
  scraped_at: string;
}

const platformColors: Record<string, string> = {
  tiktok: "bg-black text-white",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  twitter: "bg-blue-400 text-white",
  linkedin: "bg-blue-700 text-white",
  facebook: "bg-blue-600 text-white",
  google: "bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 text-white",
};

const ClientTrendMonitor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [viewingTrend, setViewingTrend] = useState<Trend | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/client/auth");
        return;
      }
      setUser(user);
      fetchTrends(user.id);
    };
    checkUser();
  }, [navigate]);

  const fetchTrends = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('social_trends')
      .select('*')
      .eq('user_id', userId)
      .order('scraped_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching trends:', error);
    } else {
      setTrends(data || []);
    }
    setLoading(false);
  };

  const handleFetchTrends = async () => {
    if (!user) return;
    setFetching(true);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-trends', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast({
        title: "Trends updated!",
        description: `Found ${data.totalTrends} trending topics`,
      });
      fetchTrends(user.id);
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const platforms = [...new Set(trends.map(t => t.platform))];
  const filteredTrends = selectedPlatform 
    ? trends.filter(t => t.platform === selectedPlatform)
    : trends;

  const groupedTrends = filteredTrends.reduce((acc, trend) => {
    if (!acc[trend.platform]) {
      acc[trend.platform] = [];
    }
    acc[trend.platform].push(trend);
    return acc;
  }, {} as Record<string, Trend[]>);

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/client/strategy")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Strategy
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trend Monitor</h1>
            <p className="text-muted-foreground">Track trending topics across social platforms</p>
          </div>
          <Button onClick={handleFetchTrends} disabled={fetching} className="gap-2">
            {fetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Fetch Latest Trends
          </Button>
        </div>

        {/* Platform Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={selectedPlatform === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPlatform(null)}
          >
            All Platforms
          </Button>
          {platforms.map(platform => (
            <Button
              key={platform}
              variant={selectedPlatform === platform ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlatform(platform)}
              className="capitalize"
            >
              {platform}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : trends.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No trends yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Fetch Latest Trends" to get current trending topics
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedTrends).map(([platform, platformTrends]) => (
              <Card key={platform} className="overflow-hidden">
                <div className={`px-4 py-3 ${platformColors[platform] || 'bg-muted'}`}>
                  <h3 className="font-semibold capitalize">{platform}</h3>
                  <p className="text-sm opacity-80">{platformTrends.length} trends</p>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {platformTrends.slice(0, 5).map((trend, index) => (
                      <button
                        key={trend.id}
                        onClick={() => setViewingTrend(trend)}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {trend.trend_name}
                          </p>
                          {trend.trend_volume && (
                            <p className="text-xs text-muted-foreground">{trend.trend_volume}</p>
                          )}
                        </div>
                      </button>
                    ))}
                    {platformTrends.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        +{platformTrends.length - 5} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Trend Detail Dialog */}
      <Dialog open={!!viewingTrend} onOpenChange={() => setViewingTrend(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingTrend?.trend_name}</DialogTitle>
          </DialogHeader>
          {viewingTrend && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={platformColors[viewingTrend.platform] || ''}>
                  {viewingTrend.platform}
                </Badge>
                {viewingTrend.trend_category && (
                  <Badge variant="outline">{viewingTrend.trend_category}</Badge>
                )}
              </div>
              
              {viewingTrend.trend_volume && (
                <p className="text-muted-foreground">Volume: {viewingTrend.trend_volume}</p>
              )}
              
              {viewingTrend.trend_url && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={viewingTrend.trend_url} target="_blank" rel="noopener noreferrer">
                    View on {viewingTrend.platform}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientTrendMonitor;
