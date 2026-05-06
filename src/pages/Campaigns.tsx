import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Send, FileText, Calendar } from "lucide-react";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";
import type { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface CampaignDraft {
  id: string;
  campaign_idea: string | null;
  campaign_objective: string | null;
  campaign_goals: string | null;
  target_audience: string | null;
  prompt: string | null;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  platform: string;
  content_payload: Record<string, string> | null;
  scheduled_for: string;
  status: string;
}

const Campaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);

    // Resolve client_id — scheduled_posts and campaign_drafts both reference it
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const clientId = profile?.id || null;

    // Fetch in parallel
    const [draftsRes, postsRes] = await Promise.all([
      supabase
        .from("campaign_drafts")
        .select("id, campaign_idea, campaign_objective, campaign_goals, target_audience, prompt, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      clientId
        ? supabase
            .from("scheduled_posts")
            .select("id, platform, content_payload, scheduled_for, status")
            .eq("client_id", clientId)
            .order("scheduled_for", { ascending: true })
            .limit(50)
        : Promise.resolve({ data: [] as ScheduledPost[] }),
    ]);

    const posts = ((postsRes as any).data || []) as ScheduledPost[];
    setDrafts((draftsRes.data || []) as CampaignDraft[]);
    setScheduledPosts(posts);
    setPendingCount(posts.filter((p) => p.status === "pending").length);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Post Dashboard</h1>

          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Button
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/generate")}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">New</span>
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10 relative text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/pending")}
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              <span>Pending</span>
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

        {/* Campaign Drafts */}
        <div className="mb-6 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Campaign Drafts
          </h2>
          {loading ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : drafts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No campaign drafts yet. Ask KLYC Chat to build you a campaign brief.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card key={draft.id} className="hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {draft.campaign_idea || "Untitled Campaign"}
                        </h3>
                        {draft.campaign_objective && (
                          <p className="text-xs text-muted-foreground mt-0.5">{draft.campaign_objective}</p>
                        )}
                        {draft.target_audience && (
                          <p className="text-xs text-muted-foreground/70 mt-1">Audience: {draft.target_audience}</p>
                        )}
                        {draft.prompt && (
                          <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap font-sans bg-muted/30 rounded p-2 max-h-32 overflow-y-auto">
                            {draft.prompt}
                          </pre>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="secondary" className="text-[10px]">draft</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {draft.created_at ? format(new Date(draft.created_at), "MMM d, h:mma") : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Posts */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Scheduled Posts
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500 ml-1">
                {pendingCount} pending
              </Badge>
            )}
          </h2>
          {loading ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : scheduledPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No scheduled posts yet. Ask KLYC Chat to fill your content calendar.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((post) => {
                const payload = post.content_payload as any;
                const postText: string = payload?.post_text || payload?.topic || "";
                return (
                  <Card
                    key={post.id}
                    className="hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => navigate("/campaigns/schedule")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-2">{postText}</p>
                          {payload?.topic && postText !== payload.topic && (
                            <p className="text-xs text-muted-foreground mt-1">Topic: {payload.topic}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 space-y-1">
                          <div className="flex gap-1 justify-end">
                            <Badge variant="outline" className="text-[10px] capitalize">{post.platform}</Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${post.status === "pending" ? "text-amber-500" : ""}`}
                            >
                              {post.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {post.scheduled_for ? format(new Date(post.scheduled_for), "MMM d, h:mma") : ""}
                          </p>
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
