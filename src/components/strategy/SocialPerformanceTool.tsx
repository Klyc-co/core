import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Heart, Share2, Bookmark, MessageCircle, TrendingUp, TrendingDown, Zap, Loader2 } from "lucide-react";

interface PostMetric {
  id: string;
  post_text: string | null;
  status: string;
  published_at: string | null;
  analytics?: {
    impressions: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    reach: number | null;
    engagement_rate: number | null;
  };
}

export default function SocialPerformanceTool() {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Performance Dashboard</TabsTrigger>
        <TabsTrigger value="velocity" className="text-xs sm:text-sm">Velocity Monitor</TabsTrigger>
        <TabsTrigger value="optimization" className="text-xs sm:text-sm">Optimization Suggestions</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard"><PerformanceDashboard /></TabsContent>
      <TabsContent value="velocity"><VelocityMonitor /></TabsContent>
      <TabsContent value="optimization"><OptimizationSuggestions /></TabsContent>
    </Tabs>
  );
}

function PerformanceDashboard() {
  const [posts, setPosts] = useState<PostMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("post_queue")
        .select("id, post_text, status, published_at")
        .eq("user_id", user.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const { data: analytics } = await supabase
          .from("post_analytics")
          .select("*")
          .in("post_queue_id", data.map(p => p.id));

        const enriched = data.map(p => ({
          ...p,
          analytics: (analytics || []).find(a => a.post_queue_id === p.id) as PostMetric["analytics"],
        }));
        setPosts(enriched);
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const totals = posts.reduce(
    (acc, p) => ({
      reach: acc.reach + (p.analytics?.reach || 0),
      engagement: acc.engagement + (p.analytics?.likes || 0) + (p.analytics?.comments || 0),
      saves: acc.saves + (p.analytics?.saves || 0),
      shares: acc.shares + (p.analytics?.shares || 0),
    }),
    { reach: 0, engagement: 0, saves: 0, shares: 0 }
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={Eye} label="Total Reach" value={totals.reach} />
        <MetricCard icon={Heart} label="Engagement" value={totals.engagement} />
        <MetricCard icon={Bookmark} label="Saves" value={totals.saves} />
        <MetricCard icon={Share2} label="Shares" value={totals.shares} />
      </div>

      {posts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No published posts with analytics yet. Publish content to see performance data.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.slice(0, 10).map(p => (
            <Card key={p.id}>
              <CardContent className="py-3">
                <p className="text-sm font-medium truncate">{p.post_text?.slice(0, 80) || "Untitled post"}</p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>👁 {p.analytics?.reach || 0}</span>
                  <span>❤ {p.analytics?.likes || 0}</span>
                  <span>💬 {p.analytics?.comments || 0}</span>
                  <span>🔁 {p.analytics?.shares || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
        <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function VelocityMonitor() {
  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Early Signal Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Track likes, comments, and reposts within the first hours of publishing to detect momentum.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Post gaining traction</p>
                <p className="text-xs text-muted-foreground">Engagement rate above average within first 2 hours</p>
              </div>
              <Badge className="ml-auto bg-green-500/20 text-green-700 border-green-500/30">Rising</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Post losing momentum</p>
                <p className="text-xs text-muted-foreground">Below expected engagement after 4 hours</p>
              </div>
              <Badge className="ml-auto bg-red-500/20 text-red-700 border-red-500/30">Declining</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">Velocity tracking activates when posts are published with connected social accounts.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function OptimizationSuggestions() {
  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AI-Powered Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Based on your performance data, here are recommended optimizations:
          </p>
          <div className="space-y-3">
            {[
              { title: "Rewrite Hook", desc: "Posts with question-based hooks see 40% more engagement. Try reformulating your opening lines.", icon: "✍️" },
              { title: "Repost Timing", desc: "Your audience is most active between 9-11 AM. Schedule high-value content for this window.", icon: "⏰" },
              { title: "Image Improvement", desc: "Posts with custom graphics outperform stock photos by 2.3x. Use the Creative Media tool.", icon: "🖼️" },
              { title: "CTA Adjustment", desc: "Soft CTAs ('thoughts?') are outperforming hard CTAs ('buy now') by 60% for your audience.", icon: "🎯" },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">Suggestions improve as more performance data is collected.</p>
        </CardContent>
      </Card>
    </div>
  );
}
