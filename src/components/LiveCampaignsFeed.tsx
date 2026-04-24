import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Eye, Heart, MessageCircle, Share2, Calendar, ExternalLink, Facebook, Instagram, Linkedin, Twitter, Youtube, Music } from "lucide-react";

interface ScheduledCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  post_caption: string | null;
  image_url: string | null;
  video_url: string | null;
}

interface CampaignAnalytics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  YouTube: Youtube,
  Facebook: Facebook,
  Instagram: Instagram,
  LinkedIn: Linkedin,
  Twitter: Twitter,
  "Twitter/X": Twitter,
  TikTok: Music,
};

const platformColors: Record<string, string> = {
  YouTube: "bg-red-600",
  Facebook: "bg-blue-600",
  Instagram: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
  LinkedIn: "bg-blue-700",
  Twitter: "bg-gray-800",
  "Twitter/X": "bg-gray-800",
  TikTok: "bg-black",
};

const statusStyles: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  published: "bg-green-500/10 text-green-500 border-green-500/20",
  publishing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  draft: "bg-muted text-muted-foreground border-border",
};

interface LiveCampaignsFeedProps {
  showFullButton?: boolean;
  limit?: number;
}

export function LiveCampaignsFeed({ showFullButton = false, limit }: LiveCampaignsFeedProps) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, CampaignAnalytics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const today = new Date().toISOString().split("T")[0];
    let query = supabase
      .from("scheduled_campaigns")
      .select("id, campaign_name, platforms, scheduled_date, scheduled_time, status, post_caption, image_url, video_url")
      .eq("user_id", user.id)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data } = await query;
    if (data) {
      setCampaigns(data);
      // Fetch real analytics from post_queue -> post_analytics
      await fetchAnalytics(user.id, data);
    }
    setLoading(false);
  };

  const fetchAnalytics = async (userId: string, campaigns: ScheduledCampaign[]) => {
    // Get all post_queue entries for this user that have analytics
    const { data: postQueues } = await supabase
      .from("post_queue")
      .select("id, post_text, video_url, image_url")
      .eq("user_id", userId)
      .eq("status", "published");

    if (!postQueues || postQueues.length === 0) return;

    // Fetch analytics for all published posts
    const postIds = postQueues.map(pq => pq.id);
    const { data: analytics } = await supabase
      .from("post_analytics")
      .select("post_queue_id, views, likes, comments, shares")
      .in("post_queue_id", postIds);

    if (!analytics || analytics.length === 0) return;

    // Aggregate analytics per post_queue_id
    const postAnalyticsMap: Record<string, CampaignAnalytics> = {};
    for (const a of analytics) {
      const existing = postAnalyticsMap[a.post_queue_id] || { views: 0, likes: 0, comments: 0, shares: 0 };
      postAnalyticsMap[a.post_queue_id] = {
        views: (existing.views || 0) + (a.views || 0),
        likes: (existing.likes || 0) + (a.likes || 0),
        comments: (existing.comments || 0) + (a.comments || 0),
        shares: (existing.shares || 0) + (a.shares || 0),
      };
    }

    // Match campaigns to post_queue by caption/video_url
    const campaignAnalytics: Record<string, CampaignAnalytics> = {};
    for (const campaign of campaigns) {
      for (const pq of postQueues) {
        const captionMatch = campaign.post_caption && pq.post_text && 
          campaign.post_caption.trim().toLowerCase() === pq.post_text.trim().toLowerCase();
        const videoMatch = campaign.video_url && pq.video_url && campaign.video_url === pq.video_url;
        const imageMatch = campaign.image_url && pq.image_url && campaign.image_url === pq.image_url;

        if ((captionMatch || videoMatch || imageMatch) && postAnalyticsMap[pq.id]) {
          campaignAnalytics[campaign.id] = postAnalyticsMap[pq.id];
          break;
        }
      }
    }

    setAnalyticsMap(campaignAnalytics);
  };

  const formatStat = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "--";
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Live Posts
        </CardTitle>
        {showFullButton && (
          <Button variant="outline" size="sm" onClick={() => navigate("/campaigns")} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Posts</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-6">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-sm">
            No live campaigns yet. Create a campaign to see it here.
          </div>
        ) : (
          campaigns.map((campaign) => {
            const analytics = analyticsMap[campaign.id];
            return (
              <div
                key={campaign.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => navigate("/campaigns/schedule")}
              >
                {/* Top row: platforms + name + status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex -space-x-1.5 flex-shrink-0">
                      {campaign.platforms.map((p) => {
                        const Icon = platformIcons[p] || Zap;
                        const bg = platformColors[p] || "bg-primary";
                        return (
                          <div key={p} className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center ring-2 ring-background`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                        );
                      })}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{campaign.campaign_name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{campaign.scheduled_date} · {campaign.scheduled_time}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${statusStyles[campaign.status] || ""}`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                </div>

                {/* Caption preview */}
                {campaign.post_caption && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{campaign.post_caption}</p>
                )}

                {/* Analytics boxes - real data */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <Eye className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm sm:text-base font-bold text-foreground">{formatStat(analytics?.views)}</p>
                    <p className="text-[10px] text-muted-foreground">Views</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <Heart className="w-3.5 h-3.5 text-red-500 mx-auto mb-1" />
                    <p className="text-sm sm:text-base font-bold text-foreground">{formatStat(analytics?.likes)}</p>
                    <p className="text-[10px] text-muted-foreground">Likes</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <MessageCircle className="w-3.5 h-3.5 text-green-500 mx-auto mb-1" />
                    <p className="text-sm sm:text-base font-bold text-foreground">{formatStat(analytics?.comments)}</p>
                    <p className="text-[10px] text-muted-foreground">Comments</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <Share2 className="w-3.5 h-3.5 text-purple-500 mx-auto mb-1" />
                    <p className="text-sm sm:text-base font-bold text-foreground">{formatStat(analytics?.shares)}</p>
                    <p className="text-[10px] text-muted-foreground">Shares</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}