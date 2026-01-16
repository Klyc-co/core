import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Facebook, Users, Eye, ThumbsUp, Video, MessageCircle, Share2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { User } from "@supabase/supabase-js";

interface FacebookAnalyticsData {
  page: {
    id: string;
    name: string;
    followers: number;
    picture?: string;
  };
  insights: {
    impressions: number;
    engagedUsers: number;
    postEngagements: number;
    pageViews: number;
    fans: number;
  };
  stats: {
    engagementRate: number;
    totalPosts: number;
    totalReels: number;
  };
  posts: Array<{
    id: string;
    message: string;
    createdTime: string;
    permalink?: string;
    shares: number;
    reactions: number;
    comments: number;
  }>;
  reels: Array<{
    id: string;
    description: string;
    permalink?: string;
    createdTime: string;
    views: number;
    reach: number;
    avgWatchTime: number;
  }>;
}

const FacebookAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<FacebookAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("facebook-analytics");

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalytics(data);
    } catch (err) {
      console.error("Error fetching Facebook analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
          Back to Import
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center">
            <Facebook className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Facebook Analytics</h1>
            <p className="text-muted-foreground">
              {analytics?.page?.name || "Your Facebook Page performance"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading analytics...</span>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Analytics</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/profile/import")}>
              Reconnect Facebook
            </Button>
          </Card>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(analytics.page.followers)}
                    </p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(analytics.insights.impressions)}
                    </p>
                    <p className="text-sm text-muted-foreground">Impressions</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ThumbsUp className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(analytics.insights.postEngagements)}
                    </p>
                    <p className="text-sm text-muted-foreground">Engagements</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.stats.engagementRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Reels Section */}
            {analytics.reels.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-500" />
                  Recent Reels
                </h2>
                <div className="space-y-4">
                  {analytics.reels.map((reel) => (
                    <div
                      key={reel.id}
                      className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-foreground font-medium line-clamp-2 flex-1">
                          {reel.description || "Reel"}
                        </p>
                        <span className="text-xs text-muted-foreground ml-4">
                          {formatDate(reel.createdTime)}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          {formatNumber(reel.views)} views
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {formatNumber(reel.reach)} reach
                        </span>
                      </div>
                      {reel.permalink && (
                        <a
                          href={reel.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-2 inline-block"
                        >
                          View on Facebook →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Posts */}
            {analytics.posts.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Recent Posts</h2>
                <div className="space-y-4">
                  {analytics.posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-foreground line-clamp-2 flex-1">
                          {post.message || "Post"}
                        </p>
                        <span className="text-xs text-muted-foreground ml-4">
                          {formatDate(post.createdTime)}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ThumbsUp className="w-4 h-4" />
                          {formatNumber(post.reactions)}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MessageCircle className="w-4 h-4" />
                          {formatNumber(post.comments)}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Share2 className="w-4 h-4" />
                          {formatNumber(post.shares)}
                        </span>
                      </div>
                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-2 inline-block"
                        >
                          View on Facebook →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default FacebookAnalytics;
