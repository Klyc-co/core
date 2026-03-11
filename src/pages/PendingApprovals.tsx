import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2, Send, Pencil, Eye, Rocket, Save, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  content_type?: string;
  scheduled_at?: string | null;
  video_url?: string | null;
  media_urls?: string[] | null;
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
    campaign_objective: string | null;
    content_type: string | null;
    post_caption: string | null;
    image_prompt: string | null;
    video_script: string | null;
    article_outline: string | null;
    target_audience: string | null;
    created_at: string;
  } | null;
}

const PendingApprovals = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingApproval | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);

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
          .select(`*, scheduled_campaigns (*), campaign_drafts (*)`)
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
        content_type: p.content_type,
        scheduled_at: p.scheduled_at,
        video_url: p.video_url,
        media_urls: p.media_urls,
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

  const openDetail = (approval: PendingApproval) => {
    setSelected(approval);
    setEditText(
      approval.source === "post"
        ? approval.post_text || ""
        : approval.campaign_drafts?.post_caption || approval.campaign_drafts?.campaign_idea || ""
    );
    setScheduleDate(
      approval.scheduled_at ? new Date(approval.scheduled_at)
      : approval.scheduled_campaigns?.scheduled_date ? new Date(approval.scheduled_campaigns.scheduled_date)
      : new Date(Date.now() + 86400000) // default tomorrow
    );
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (selected.source === "post") {
        const { error } = await supabase
          .from("post_queue")
          .update({ post_text: editText, updated_at: new Date().toISOString() })
          .eq("id", selected.id);
        if (error) throw error;
        setSelected({ ...selected, post_text: editText });
        setApprovals(prev => prev.map(a => a.id === selected.id ? { ...a, post_text: editText } : a));
      } else if (selected.campaign_drafts) {
        const { error } = await supabase
          .from("campaign_drafts")
          .update({ post_caption: editText, updated_at: new Date().toISOString() })
          .eq("id", selected.campaign_drafts.id);
        if (error) throw error;
      }
      toast.success("Changes saved");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selected || !scheduleDate) {
      toast.error("Please select a launch date first");
      return;
    }
    setSaving(true);
    try {
      if (selected.source === "post") {
        const { error } = await supabase
          .from("post_queue")
          .update({
            status: "scheduled",
            approved_at: new Date().toISOString(),
            scheduled_at: scheduleDate.toISOString(),
          })
          .eq("id", selected.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_approvals")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", selected.id);
        if (error) throw error;
      }
      toast.success("Approved & scheduled!");
      setApprovals(prev => prev.filter(a => a.id !== selected.id));
      setSelected(null);
      navigate("/home");
    } catch (err) {
      toast.error("Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selected || !user) return;
    setPublishing(true);
    try {
      if (selected.source === "post") {
        // Move to scheduled status first if not already approved
        const { error: updateErr } = await supabase
          .from("post_queue")
          .update({
            status: "scheduled",
            approved_at: new Date().toISOString(),
            scheduled_at: new Date().toISOString(),
          })
          .eq("id", selected.id);
        if (updateErr) throw updateErr;

        // Call publish edge function
        const { error } = await supabase.functions.invoke("publish-post", {
          body: { postId: selected.id },
        });
        if (error) throw error;
        toast.success("Post published successfully!");
      } else {
        toast.info("Use the Schedule page to publish campaign drafts");
      }
      setApprovals(prev => prev.filter(a => a.id !== selected.id));
      setSelected(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 text-white gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Changes Requested</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending Review</Badge>;
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
          <Button variant="ghost" onClick={() => navigate("/campaigns")} className="text-primary hover:text-primary/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pending Approvals</h1>
          <p className="text-muted-foreground">Track campaigns sent for client approval</p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-amber-500" /><span>{pendingCount} Pending</span></div>
            <div className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500" /><span>{approvedCount} Approved</span></div>
            <div className="flex items-center gap-2 text-sm"><XCircle className="w-4 h-4 text-red-500" /><span>{rejectedCount} Changes Requested</span></div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : approvals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No approvals yet</h3>
              <p className="text-muted-foreground mb-4">When you send campaigns for client approval, they'll appear here.</p>
              <Button onClick={() => navigate("/campaigns/new")}>Create New Campaign</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvals.map((approval) => {
              const isPost = approval.source === "post";
              const title = isPost
                ? (approval.post_text?.slice(0, 60) || "AI Generated Post")
                : (approval.scheduled_campaigns?.campaign_name || approval.campaign_drafts?.campaign_idea || "Untitled Campaign");

              return (
                <Card
                  key={approval.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group overflow-hidden"
                  onClick={() => openDetail(approval)}
                >
                  {isPost && approval.image_url && (
                    <div className="aspect-video bg-secondary overflow-hidden">
                      <img src={approval.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(approval.status)}
                      {isPost && <Badge variant="outline" className="text-[10px]">AI Post</Badge>}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-2">{title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(approval.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3.5 h-3.5" /> View & Edit
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setIsEditing(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selected.source === "post" ? "Post Detail" : "Campaign Detail"}
                  {getStatusBadge(selected.status)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Image */}
                {selected.source === "post" && selected.image_url && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={selected.image_url} alt="" className="w-full max-h-[400px] object-contain bg-secondary" />
                  </div>
                )}

                {/* Video */}
                {selected.source === "post" && selected.video_url && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <video src={selected.video_url} controls className="w-full max-h-[400px]" />
                  </div>
                )}

                {/* Caption / Text */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      {selected.source === "post" ? "Post Caption" : "Campaign Content"}
                    </label>
                    {!isEditing && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          <Save className="w-3 h-3 mr-1" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-secondary/30 rounded-lg text-sm text-foreground whitespace-pre-wrap">
                      {selected.source === "post"
                        ? selected.post_text || "No caption"
                        : selected.campaign_drafts?.post_caption
                          || selected.campaign_drafts?.campaign_idea
                          || "No content"}
                    </div>
                  )}
                </div>

                {/* Campaign-specific details */}
                {selected.source === "campaign" && selected.campaign_drafts && (
                  <div className="space-y-3">
                    {selected.campaign_drafts.target_audience && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Target Audience</label>
                        <p className="text-sm text-foreground mt-1">{selected.campaign_drafts.target_audience}</p>
                      </div>
                    )}
                    {selected.campaign_drafts.campaign_objective && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Objective</label>
                        <p className="text-sm text-foreground mt-1">{selected.campaign_drafts.campaign_objective}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Platforms */}
                {selected.scheduled_campaigns?.platforms && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Platforms</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selected.scheduled_campaigns.platforms.map((p) => (
                        <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Launch Date */}
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Launch Date
                  </label>
                  {selected.status === "pending" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm text-foreground">
                      {selected.scheduled_at
                        ? format(new Date(selected.scheduled_at), "PPP")
                        : selected.scheduled_campaigns?.scheduled_date
                          ? format(new Date(selected.scheduled_campaigns.scheduled_date), "PPP")
                          : "Not set"}
                    </p>
                  )}
                </div>

                {/* Meta info */}
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  Created {new Date(selected.created_at).toLocaleString()}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  {selected.status === "pending" && (
                    <Button onClick={handleApprove} disabled={saving} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {saving ? "Approving..." : "Approve"}
                    </Button>
                  )}
                  {selected.source === "post" && (
                    <Button
                      onClick={handlePublish}
                      disabled={publishing}
                      variant={selected.status === "pending" ? "outline" : "default"}
                      className="flex-1"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      {publishing ? "Publishing..." : "Publish Now"}
                    </Button>
                  )}
                  {selected.source === "campaign" && selected.campaign_drafts && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelected(null);
                        navigate(`/campaigns/drafts/${selected.campaign_drafts!.id}`);
                      }}
                    >
                      Open Full Draft
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovals;
