import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Twitter, Users, MessageCircle, Heart, Repeat, Eye, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface TwitterAnalyticsData {
  profile: {
    id: string;
    username: string;
    name: string;
    description: string;
    profileImageUrl: string;
    createdAt: string;
  };
  metrics: {
    followers: number;
    following: number;
    tweetCount: number;
    listedCount: number;
  };
  recentEngagement: {
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    totalImpressions: number;
    tweetsAnalyzed: number;
  };
  recentTweets: Array<{
    id: string;
    text: string;
    createdAt: string;
    metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
      impression_count: number;
    };
  }>;
}

const TwitterAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<TwitterAnalyticsData | null>(null);
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
      const { data, error } = await supabase.functions.invoke("twitter-analytics");
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to fetch Twitter analytics:", err);
      setError(err.message);
      toast.error("Failed to load Twitter analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
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

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
            <Twitter className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Twitter/X Analytics</h1>
            <p className="text-muted-foreground">View your Twitter/X performance metrics</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading analytics...</span>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </Card>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                {analytics.profile.profileImageUrl && (
                  <img 
                    src={analytics.profile.profileImageUrl.replace("_normal", "_200x200")} 
                    alt={analytics.profile.name}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{analytics.profile.name}</h2>
                  <p className="text-muted-foreground">@{analytics.profile.username}</p>
                  {analytics.profile.description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">{analytics.profile.description}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Followers</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.metrics.followers)}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Following</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.metrics.following)}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Total Tweets</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.metrics.tweetCount)}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Listed</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.metrics.listedCount)}</p>
              </Card>
            </div>

            {/* Recent Engagement */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Recent Engagement (Last {analytics.recentEngagement.tweetsAnalyzed} Tweets)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground">{formatNumber(analytics.recentEngagement.totalLikes)}</p>
                  <p className="text-sm text-muted-foreground">Likes</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Repeat className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground">{formatNumber(analytics.recentEngagement.totalRetweets)}</p>
                  <p className="text-sm text-muted-foreground">Retweets</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground">{formatNumber(analytics.recentEngagement.totalReplies)}</p>
                  <p className="text-sm text-muted-foreground">Replies</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground">{formatNumber(analytics.recentEngagement.totalImpressions)}</p>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                </div>
              </div>
            </Card>

            {/* Recent Tweets */}
            {analytics.recentTweets.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Tweets</h3>
                <div className="space-y-4">
                  {analytics.recentTweets.map((tweet) => (
                    <div key={tweet.id} className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-foreground mb-2">{tweet.text}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatDate(tweet.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {tweet.metrics?.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat className="w-3 h-3" /> {tweet.metrics?.retweet_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {tweet.metrics?.reply_count || 0}
                        </span>
                      </div>
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

export default TwitterAnalytics;
