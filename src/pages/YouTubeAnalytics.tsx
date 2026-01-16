import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Youtube, Eye, ThumbsUp, MessageCircle, Users, Video, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
}

interface AnalyticsData {
  connected: boolean;
  channelId?: string;
  channelName?: string;
  channelThumbnail?: string;
  subscriberCount?: number;
  totalVideoCount?: number;
  totalChannelViews?: number;
  lastUpdated?: string;
  recentVideos?: VideoData[];
  summary?: {
    recentViews: number;
    recentLikes: number;
    recentComments: number;
    avgEngagementRate: string;
    videoCount: number;
  };
  error?: string;
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <Card>
    <CardContent className="flex items-center gap-4 p-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </CardContent>
  </Card>
);

const VideoCard = ({ video }: { video: VideoData }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
    <div className="aspect-video relative">
      <img 
        src={video.thumbnail} 
        alt={video.title}
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
        {video.duration}
      </span>
    </div>
    <CardContent className="p-4">
      <h3 className="font-medium line-clamp-2 mb-2">{video.title}</h3>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {video.views.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-4 h-4" />
          {video.likes.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4" />
          {video.comments.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(video.publishedAt).toLocaleDateString()}
        </span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.open(`https://youtube.com/watch?v=${video.id}`, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View
        </Button>
      </div>
    </CardContent>
  </Card>
);

const YouTubeAnalytics = () => {
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
        return;
      }
      setUser(user);
      fetchAnalytics();
    });
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('youtube-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error && !data.connected) {
        setAnalytics({ connected: false, error: data.error });
      } else {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch YouTube analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
    toast.success("Refreshing YouTube data...");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/profile/import")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Import Sources
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-lg">
              <Youtube className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">YouTube Analytics</h1>
              {analytics?.channelName && (
                <p className="text-muted-foreground">@{analytics.channelName}</p>
              )}
            </div>
          </div>
          {analytics?.connected && (
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchAnalytics}>Try Again</Button>
            </CardContent>
          </Card>
        ) : !analytics?.connected ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Youtube className="w-16 h-16 mx-auto mb-4 text-red-600" />
              <h2 className="text-xl font-semibold mb-2">YouTube Not Connected</h2>
              <p className="text-muted-foreground mb-6">
                Connect your YouTube channel to view analytics and video performance.
              </p>
              <Button onClick={() => navigate("/profile/import")} className="bg-red-600 hover:bg-red-700">
                Connect YouTube
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Channel Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard 
                icon={Users} 
                label="Subscribers" 
                value={analytics.subscriberCount || 0}
                color="bg-red-600"
              />
              <StatCard 
                icon={Video} 
                label="Total Videos" 
                value={analytics.totalVideoCount || 0}
                color="bg-blue-600"
              />
              <StatCard 
                icon={Eye} 
                label="Total Views" 
                value={analytics.totalChannelViews || 0}
                color="bg-green-600"
              />
              <StatCard 
                icon={ThumbsUp} 
                label="Avg Engagement" 
                value={`${analytics.summary?.avgEngagementRate || 0}%`}
                color="bg-purple-600"
              />
            </div>

            {/* Recent Videos Summary */}
            {analytics.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Videos Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold">{analytics.summary.videoCount}</p>
                      <p className="text-sm text-muted-foreground">Videos Analyzed</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{analytics.summary.recentViews.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{analytics.summary.recentLikes.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Likes</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{analytics.summary.recentComments.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Comments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Video Grid */}
            {analytics.recentVideos && analytics.recentVideos.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.recentVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}

            {analytics.lastUpdated && (
              <p className="text-sm text-muted-foreground text-center">
                Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default YouTubeAnalytics;
