import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2, Send } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface PendingApproval {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_id: string;
  source: "campaign" | "post";
  image_url?: string | null;
  post_text?: string | null;
  scheduled_campaigns: {
    id: string;
    campaign_name: string;
    platforms: string[];
    scheduled_date: string;
    scheduled_time: string;
  } | null;
  campaign_drafts: {
    id: string;
    campaign_idea: string | null;
    content_type: string | null;
    created_at: string;
  } | null;
}

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
  facebook: "bg-[#1877F2]",
  twitter: "bg-neutral-900",
  linkedin: "bg-[#0A66C2]",
  tiktok: "bg-neutral-900",
  youtube: "bg-[#FF0000]",
  pinterest: "bg-[#E60023]",
  threads: "bg-neutral-900",
  snapchat: "bg-[#FFFC00]",
};

const PendingApprovals = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchApprovals(user.id);
      }
    });
  }, [navigate]);

  const fetchApprovals = async (userId: string) => {
    try {
      const [campaignRes, postQueueRes] = await Promise.all([
        supabase
          .from("campaign_approvals")
          .select(`
            *,
            scheduled_campaigns (*),
            campaign_drafts (*)
          `)
          .eq("marketer_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("post_queue")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending_approval")
          .order("created_at", { ascending: false }),
      ]);

      const campaignApprovals: PendingApproval[] = (campaignRes.data || []).map((a: any) => ({
        ...a,
        source: "campaign" as const,
      }));

      const postApprovals: PendingApproval[] = (postQueueRes.data || []).map((p: any) => ({
        id: p.id,
        status: "pending",
        notes: p.approval_notes,
        created_at: p.created_at,
        updated_at: p.updated_at,
        client_id: p.client_id || "",
        source: "post" as const,
        image_url: p.image_url,
        post_text: p.post_text,
        scheduled_campaigns: null,
        campaign_drafts: null,
      }));

      const merged = [...campaignApprovals, ...postApprovals].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setApprovals(merged);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 text-white gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Changes Requested
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending Review
          </Badge>
        );
    }
  };

  const pendingCount = approvals.filter(a => a.status === "pending").length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;
  const rejectedCount = approvals.filter(a => a.status === "rejected").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pending Approvals</h1>
          <p className="text-muted-foreground">
            Track campaigns sent for client approval
          </p>
          
          {/* Status Summary */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{pendingCount} Pending</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{approvedCount} Approved</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-500" />
              <span>{rejectedCount} Changes Requested</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : approvals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No approvals yet</h3>
              <p className="text-muted-foreground mb-4">
                When you send campaigns for client approval, they'll appear here.
              </p>
              <Button onClick={() => navigate("/campaigns/new")}>
                Create New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => {
              const campaignName = approval.scheduled_campaigns?.campaign_name 
                || approval.campaign_drafts?.campaign_idea 
                || "Untitled Campaign";
              const isDraft = !!approval.campaign_drafts && !approval.scheduled_campaigns;
              
              return (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {campaignName}
                          </h3>
                          {getStatusBadge(approval.status)}
                          {isDraft && (
                            <Badge variant="outline" className="text-xs">
                              Draft
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Sent {new Date(approval.created_at).toLocaleDateString()}
                          </div>
                          {approval.scheduled_campaigns?.scheduled_date && (
                            <span>
                              Scheduled for {new Date(approval.scheduled_campaigns.scheduled_date).toLocaleDateString()}
                            </span>
                          )}
                          {isDraft && approval.campaign_drafts?.content_type && (
                            <span className="capitalize">
                              {approval.campaign_drafts.content_type.replace("-", " ")}
                            </span>
                          )}
                        </div>

                        {approval.scheduled_campaigns?.platforms && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {approval.scheduled_campaigns.platforms.map((platform) => (
                              <span
                                key={platform}
                                className={`px-2 py-0.5 rounded text-xs text-white ${platformColors[platform] || "bg-secondary"}`}
                              >
                                {platform}
                              </span>
                            ))}
                          </div>
                        )}

                        {approval.notes && approval.status !== "pending" && (
                          <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Client Feedback:</span> {approval.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {isDraft && approval.campaign_drafts && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/campaigns/drafts/${approval.campaign_drafts!.id}`)}
                          >
                            View Draft
                          </Button>
                        )}
                        {approval.status === "approved" && approval.scheduled_campaigns && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/campaigns/schedule")}
                          >
                            View in Schedule
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PendingApprovals;
