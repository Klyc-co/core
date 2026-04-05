import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, History, Sparkles, Send, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";
import type { User } from "@supabase/supabase-js";

interface PastCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  status: string;
}

interface PostAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

const Campaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pastCampaigns, setPastCampaigns] = useState<PastCampaign[]>([]);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, PostAnalytics>>({});
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        loadData(user.id);
      }
    });
  }, [navigate]);

  const loadData = async (userId: string) => {
    const [pendingRes, pastRes] = await Promise.all([
      supabase.from("campaign_approvals").select("id", { count: "exact", head: true }).eq("marketer_id", userId).eq("status", "pending"),
      supabase.from("scheduled_campaigns").select("id, campaign_name, platforms, scheduled_date, status, post_caption, image_url, video_url").eq("user_id", userId).order("scheduled_date", { ascending: false }).limit(10),
    ]);
    setPendingCount(pendingRes.count || 0);
    const camps = (pastRes.data || []) as any[];
    setPastCampaigns(camps);

    // Fetch analytics
    const { data: postQueues } = await supabase
      .from("post_queue")
      .select("id, post_text, video_url, image_url")
      .eq("user_id", userId)
      .eq("status", "published");

    if (postQueues && postQueues.length > 0) {
      const postIds = postQueues.map(pq => pq.id);
      const { data: analytics } = await supabase
        .from("post_analytics")
        .select("post_queue_id, views, likes, comments, shares")
        .in("post_queue_id", postIds);

      if (analytics && analytics.length > 0) {
        const postAgg: Record<string, PostAnalytics> = {};
        for (const a of analytics) {
          const ex = postAgg[a.post_queue_id] || { views: 0, likes: 0, comments: 0, shares: 0 };
          postAgg[a.post_queue_id] = {
            views: ex.views + (a.views || 0),
            likes: ex.likes + (a.likes || 0),
            comments: ex.comments + (a.comments || 0),
            shares: ex.shares + (a.shares || 0),
          };
        }

        const campAnalytics: Record<string, PostAnalytics> = {};
        for (const c of camps) {
          for (const pq of postQueues) {
            const captionMatch = c.post_caption && pq.post_text && c.post_caption.trim().toLowerCase() === pq.post_text.trim().toLowerCase();
            const videoMatch = c.video_url && pq.video_url && c.video_url === pq.video_url;
            const imageMatch = c.image_url && pq.image_url && c.image_url === pq.image_url;
            if ((captionMatch || videoMatch || imageMatch) && postAgg[pq.id]) {
              campAnalytics[c.id] = postAgg[pq.id];
              break;
            }
          }
        }
        setAnalyticsMap(campAnalytics);
      }
    }

    setLoadingPast(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Post Dashboard</h1>
          
           <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Button 
              className="gap-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/generate")}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Generate Post</span>
              <span className="sm:hidden">Generate</span>
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10 relative text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/pending")}
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              {pendingCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-xs">
                  {pendingCount}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-purple-500 text-purple-500 hover:bg-purple-500/10 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/schedule")}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              Schedule
            </Button>
          </div>
        </div>

        {/* Live Posts */}
        <div className="mb-6 sm:mb-10">
          <LiveCampaignsFeed />
        </div>

        {/* Past Posts */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            Past Posts
          </h2>
          {loadingPast ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : pastCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No past posts yet. Completed posts will appear here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastCampaigns.map(c => {
                const stats = analyticsMap[c.id];
                const fmt = (v: number | undefined) => v !== undefined ? v.toLocaleString() : "--";
                return (
                  <Card key={c.id} className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/campaigns/schedule")}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-foreground">{c.campaign_name}</h3>
                          <span className="text-xs text-muted-foreground">{c.scheduled_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {c.platforms.map(p => (
                              <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>
                            ))}
                          </div>
                          <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium text-foreground">{fmt(stats?.views)}</span>
                          <span className="hidden sm:inline">views</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Heart className="w-3.5 h-3.5 text-red-500" />
                          <span className="font-medium text-foreground">{fmt(stats?.likes)}</span>
                          <span className="hidden sm:inline">likes</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                          <span className="font-medium text-foreground">{fmt(stats?.comments)}</span>
                          <span className="hidden sm:inline">comments</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Share2 className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-medium text-foreground">{fmt(stats?.shares)}</span>
                          <span className="hidden sm:inline">shares</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Campaigns;
