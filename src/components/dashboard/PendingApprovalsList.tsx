import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ArrowRight, Image as ImageIcon } from "lucide-react";

interface ApprovalItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  source: "campaign" | "post";
  image_url?: string | null;
}

const PendingApprovalsList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [campaignRes, postRes] = await Promise.all([
        supabase
          .from("campaign_approvals")
          .select("id, status, created_at, campaign_drafts(campaign_idea), scheduled_campaigns(campaign_name)")
          .eq("marketer_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("post_queue")
          .select("id, status, created_at, post_text, image_url")
          .eq("user_id", user.id)
          .eq("status", "pending_approval")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const mapped: ApprovalItem[] = [];

      (campaignRes.data || []).forEach((a: any) => {
        mapped.push({
          id: a.id,
          title: a.scheduled_campaigns?.campaign_name || a.campaign_drafts?.campaign_idea || "Campaign",
          status: a.status,
          created_at: a.created_at,
          source: "campaign",
        });
      });

      (postRes.data || []).forEach((p: any) => {
        mapped.push({
          id: p.id,
          title: p.post_text?.slice(0, 60) || "AI Generated Post",
          status: p.status,
          created_at: p.created_at,
          source: "post",
          image_url: p.image_url,
        });
      });

      mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(mapped.slice(0, 8));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Approvals
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{items.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/campaigns/pending")}>
            View All <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            All caught up! No pending approvals.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => navigate("/campaigns/pending")}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-300 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingApprovalsList;
