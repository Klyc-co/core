import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { recordApprovalDecision } from "@/lib/approvalMemory";
import ClientHeader from "@/components/ClientHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Eye, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Approval {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  campaign_drafts: {
    campaign_idea: string | null;
    content_type: string | null;
    target_audience: string | null;
    video_script: string | null;
    post_caption: string | null;
  } | null;
  scheduled_campaigns: {
    campaign_name: string;
    platforms: string[];
    scheduled_date: string;
  } | null;
}

const ClientApprovals = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/client/auth");
      } else {
        setUser(user);
        fetchApprovals(user.id);
      }
    });
  }, [navigate]);

  const fetchApprovals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_approvals")
        .select(`
          *,
          campaign_drafts (*),
          scheduled_campaigns (*)
        `)
        .eq("client_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (status: "approved" | "rejected") => {
    if (!selectedApproval || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("campaign_approvals")
        .update({
          status,
          notes: reviewNotes || null,
        })
        .eq("id", selectedApproval.id);

      if (error) throw error;

      // ── Persist decision into Client Brain examples_cache ──
      const contentId = selectedApproval.campaign_drafts?.id
        || selectedApproval.scheduled_campaigns?.id
        || selectedApproval.id;
      const contentPreview = selectedApproval.campaign_drafts?.post_caption
        || selectedApproval.campaign_drafts?.campaign_idea
        || selectedApproval.scheduled_campaigns?.campaign_name
        || "";
      const platforms = selectedApproval.scheduled_campaigns?.platforms || [];

      await recordApprovalDecision(user.id, {
        content_id: contentId || selectedApproval.id,
        decision: status,
        platform: platforms[0] || selectedApproval.campaign_drafts?.content_type || undefined,
        content_preview: contentPreview || undefined,
        reason: status === "rejected" ? (reviewNotes || "No reason provided") : undefined,
      });

      toast({
        title: status === "approved" ? "Campaign Approved!" : "Campaign Rejected",
        description: status === "approved" 
          ? "The campaign has been approved and your marketer will be notified."
          : "Your feedback has been sent to your marketer.",
      });

      setSelectedApproval(null);
      setReviewNotes("");
      fetchApprovals(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const pendingCount = approvals.filter(a => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve campaigns before they go live
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-500 font-medium">
                ({pendingCount} pending)
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : approvals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No approvals yet</h3>
              <p className="text-muted-foreground">
                When your marketing team sends campaigns for approval, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <Card key={approval.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {approval.scheduled_campaigns?.campaign_name || 
                           approval.campaign_drafts?.campaign_idea?.slice(0, 50) || 
                           "Untitled Campaign"}
                        </h3>
                        {getStatusBadge(approval.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(approval.created_at).toLocaleDateString()}
                        </div>
                        {approval.campaign_drafts?.content_type && (
                          <Badge variant="outline">
                            {approval.campaign_drafts.content_type}
                          </Badge>
                        )}
                        {approval.scheduled_campaigns?.platforms.map(p => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))}
                      </div>

                      {approval.campaign_drafts?.campaign_idea && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {approval.campaign_drafts.campaign_idea}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setReviewNotes(approval.notes || "");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Campaign</DialogTitle>
              <DialogDescription>
                Review the campaign details and approve or request changes.
              </DialogDescription>
            </DialogHeader>

            {selectedApproval && (
              <div className="space-y-6 py-4">
                {selectedApproval.campaign_drafts?.campaign_idea && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Campaign Idea</h4>
                    <p className="text-foreground">{selectedApproval.campaign_drafts.campaign_idea}</p>
                  </div>
                )}

                {selectedApproval.campaign_drafts?.target_audience && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Target Audience</h4>
                    <p className="text-foreground">{selectedApproval.campaign_drafts.target_audience}</p>
                  </div>
                )}

                {selectedApproval.campaign_drafts?.video_script && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Video Script</h4>
                    <p className="text-foreground whitespace-pre-wrap">{selectedApproval.campaign_drafts.video_script}</p>
                  </div>
                )}

                {selectedApproval.campaign_drafts?.post_caption && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Post Caption</h4>
                    <p className="text-foreground whitespace-pre-wrap">{selectedApproval.campaign_drafts.post_caption}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Your Feedback</h4>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes or feedback for your marketing team..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleApproval("rejected")}
                disabled={submitting || selectedApproval?.status !== "pending"}
                className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button
                onClick={() => handleApproval("approved")}
                disabled={submitting || selectedApproval?.status !== "pending"}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ClientApprovals;
