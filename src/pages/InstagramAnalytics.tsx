import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Image, Video, RefreshCw, ExternalLink, Instagram, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

interface AnalyticsData {
  connected: boolean;
  profile: {
    username: string;
    account_type?: string;
    media_count: number;
  };
  media: MediaItem[];
  stats: {
    total_posts: number;
  };
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  </Card>
);

const MediaCard = ({ item }: { item: MediaItem }) => {
  const isVideo = item.media_type === "VIDEO";
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative bg-muted">
        {item.media_url || item.thumbnail_url ? (
          <img 
            src={item.thumbnail_url || item.media_url} 
            alt={item.caption || "Instagram post"} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isVideo ? (
              <Video className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Image className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        )}
        {isVideo && (
          <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-1">
            <Video className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm text-foreground line-clamp-2">
          {item.caption || "No caption"}
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleDateString()}
          </span>
          <a 
            href={item.permalink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </Card>
  );
};

const InstagramAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchAnalytics();
      }
    });
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("instagram-analytics", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        if (data.needsReconnect) {
          setError("Your Instagram connection has expired. Please reconnect your account.");
        } else if (!data.connected) {
          setError("Instagram is not connected. Please connect your account first.");
        } else {
          setError(data.error);
        }
        return;
      }

      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
    toast.info("Refreshing analytics...");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile/import")}
          className="mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Instagram Analytics</h1>
              {analytics?.profile?.username && (
                <p className="text-muted-foreground">@{analytics.profile.username}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Instagram className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Analytics</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate("/profile/import")}>
                Connect Instagram
              </Button>
              <Button onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          </Card>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard 
                icon={Grid3X3} 
                label="Total Posts" 
                value={analytics.stats.total_posts} 
                color="bg-gradient-to-br from-purple-600 to-pink-500" 
              />
              <StatCard 
                icon={Image} 
                label="Media Count" 
                value={analytics.profile.media_count || analytics.media.length} 
                color="bg-blue-500" 
              />
              {analytics.profile.account_type && (
                <StatCard 
                  icon={Instagram} 
                  label="Account Type" 
                  value={analytics.profile.account_type} 
                  color="bg-orange-500" 
                />
              )}
            </div>

            {/* Media Grid */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Posts</h2>
              {analytics.media.length === 0 ? (
                <Card className="p-8 text-center">
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No posts found on your Instagram account</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {analytics.media.map((item) => (
                    <MediaCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Note about limitations */}
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Instagram Basic Display API provides limited analytics. 
                For advanced metrics (likes, comments, reach), a Business or Creator account 
                with Instagram Graph API access is required.
              </p>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default InstagramAnalytics;
