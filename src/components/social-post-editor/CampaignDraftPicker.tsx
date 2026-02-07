import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, FileText, Sparkles, Calendar, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CampaignDraft } from "./types";
import { format } from "date-fns";

interface CampaignDraftPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDraft: (draft: CampaignDraft) => void;
}

export default function CampaignDraftPicker({
  open,
  onOpenChange,
  onSelectDraft,
}: CampaignDraftPickerProps) {
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadDrafts();
    }
  }, [open]);

  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      const { data, error } = await supabase
        .from("campaign_drafts")
        .select("id, campaign_idea, post_caption, image_prompt, content_type, target_audience, tags, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Failed to load campaign drafts:", error);
      toast.error("Failed to load campaign drafts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (draft: CampaignDraft) => {
    onSelectDraft(draft);
    onOpenChange(false);
  };

  const getContentTypeLabel = (type: string | null) => {
    switch (type) {
      case "social-video": return "Social Video";
      case "visual-post": return "Visual Post";
      case "written": return "Written";
      case "video-ad": return "Video Ad";
      default: return type || "Campaign";
    }
  };

  const getContentTypeColor = (type: string | null) => {
    switch (type) {
      case "social-video": return "bg-blue-500/20 text-blue-600";
      case "visual-post": return "bg-purple-500/20 text-purple-600";
      case "written": return "bg-green-500/20 text-green-600";
      case "video-ad": return "bg-orange-500/20 text-orange-600";
      default: return "bg-gray-500/20 text-gray-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Use Campaign Draft
          </DialogTitle>
          <DialogDescription>
            Select a saved campaign draft to import its content into the editor
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No campaign drafts found</p>
              <p className="text-sm mt-1">Generate campaign ideas first to use them here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => handleSelect(draft)}
                  className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Content type badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getContentTypeColor(draft.content_type)}`}>
                          {getContentTypeLabel(draft.content_type)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(draft.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      {/* Campaign idea */}
                      <h4 className="font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {draft.campaign_idea || "Untitled Campaign"}
                      </h4>

                      {/* Post caption preview */}
                      {draft.post_caption && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {draft.post_caption}
                        </p>
                      )}

                      {/* Tags */}
                      {draft.tags && draft.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          {draft.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {draft.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{draft.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Use button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Use This
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
