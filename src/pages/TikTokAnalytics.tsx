import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Eye, Heart, MessageCircle, Share2, TrendingUp, Video, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string | null;
  engagementRate: string;
}

interface AnalyticsData {
  connected: boolean;
  platform: string;
  username: string;
  lastUpdated: string;
  summary: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: string;
  };
  videos: VideoData[];
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

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

const VideoCard = ({ video }: { video: VideoData }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
    <div className="aspect-[9/16] relative bg-muted">
      {video.thumbnail ? (
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Video className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <p className="text-white text-sm font-medium line-clamp-2">{video.title || "Untitled"}</p>
      </div>
    </div>
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{video.views.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Heart className="w-3 h-3" />
          <span>{video.likes.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <MessageCircle className="w-3 h-3" />
          <span>{video.comments.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Share2 className="w-3 h-3" />
          <span>{video.shares.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {video.engagementRate} engagement
        </span>
        {video.url && (
          <a 
            href={video.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  </Card>
);

const TikTokAnalytics = () => {
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

      const { data, error } = await supabase.functions.invoke("tiktok-analytics", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        if (data.needsReconnect) {
          setError("Your TikTok connection has expired. Please reconnect your account.");
        } else if (!data.connected) {
          setError("TikTok is not connected. Please connect your account first.");
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
            <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
              <TikTokIcon />
              <span className="sr-only">TikTok</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">TikTok Analytics</h1>
              {analytics?.username && (
                <p className="text-muted-foreground">@{analytics.username}</p>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Analytics</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate("/profile/import")}>
                Connect TikTok
              </Button>
              <Button onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          </Card>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={Video} label="Videos" value={analytics.summary.totalVideos} color="bg-black" />
              <StatCard icon={Eye} label="Total Views" value={analytics.summary.totalViews} color="bg-blue-500" />
              <StatCard icon={Heart} label="Total Likes" value={analytics.summary.totalLikes} color="bg-red-500" />
              <StatCard icon={MessageCircle} label="Comments" value={analytics.summary.totalComments} color="bg-green-500" />
              <StatCard icon={Share2} label="Shares" value={analytics.summary.totalShares} color="bg-purple-500" />
              <StatCard icon={TrendingUp} label="Avg Engagement" value={analytics.summary.avgEngagementRate} color="bg-orange-500" />
            </div>

            {/* Videos Grid */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Your Videos</h2>
              {analytics.videos.length === 0 ? (
                <Card className="p-8 text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No videos found on your TikTok account</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {analytics.videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}
            </div>

            {/* Last Updated */}
            <p className="text-sm text-muted-foreground text-center">
              Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default TikTokAnalytics;
