import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ImagePlus, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CampaignOption {
  id: string;
  label: string;
}

interface Props {
  platform: string;
  imageUrl: string | null;
  prompt: string;
}

export default function StrategyImageInline({ platform, imageUrl, prompt }: Props) {
  const { toast } = useToast();
  const [savedToBrand, setSavedToBrand] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  const [pushOpen, setPushOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [pushMode, setPushMode] = useState<"existing" | "new">("existing");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [pushing, setPushing] = useState(false);

  const handleSaveToBrand = async () => {
    if (!imageUrl) return;
    setSavingBrand(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp?.user;
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase.from("brand_assets").insert({
        user_id: user.id,
        asset_type: "image",
        value: imageUrl,
        name: `${platform} generated visual`,
        metadata: { source: "strategy", platform, prompt: prompt.slice(0, 500) },
      });
      if (error) throw error;
      setSavedToBrand(true);
      toast({ title: "Saved to Brand Assets", description: "You can find it in your brand library." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Could not save image.", variant: "destructive" });
    } finally {
      setSavingBrand(false);
    }
  };

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp?.user;
      if (!user) return;
      const { data, error } = await supabase
        .from("campaign_drafts")
        .select("id, campaign_idea, prompt, content_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const opts: CampaignOption[] = (data || []).map((d: any) => ({
        id: d.id,
        label:
          (d.campaign_idea?.toString().slice(0, 60) ||
            d.prompt?.toString().slice(0, 60) ||
            d.content_type?.toString() ||
            "Untitled draft") + ` · ${new Date(d.created_at).toLocaleDateString()}`,
      }));
      setCampaigns(opts);
      if (opts.length > 0 && !selectedCampaign) setSelectedCampaign(opts[0].id);
      else if (opts.length === 0) setPushMode("new");
    } catch (e: any) {
      toast({ title: "Couldn't load campaigns", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setCampaignsLoading(false);
    }
  };

  const openPush = () => {
    setPushOpen(true);
    void loadCampaigns();
  };

  const handlePush = async () => {
    if (!imageUrl) return;
    setPushing(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp?.user;
      if (!user) throw new Error("Not signed in");

      if (pushMode === "existing") {
        if (!selectedCampaign) throw new Error("Pick a campaign");
        const { data: existing, error: fetchErr } = await supabase
          .from("campaign_drafts")
          .select("image_prompt, tags")
          .eq("id", selectedCampaign)
          .single();
        if (fetchErr) throw fetchErr;
        const newImagePrompt = [existing?.image_prompt, imageUrl].filter(Boolean).join("\n");
        const newTags = Array.from(new Set([...(existing?.tags || []), `image:${imageUrl}`]));
        const { error: updErr } = await supabase
          .from("campaign_drafts")
          .update({ image_prompt: newImagePrompt, tags: newTags })
          .eq("id", selectedCampaign);
        if (updErr) throw updErr;
        toast({ title: "Image attached", description: "Added to the selected campaign draft." });
      } else {
        const name = newCampaignName.trim() || `${platform} visual draft`;
        const { error: insErr } = await supabase.from("campaign_drafts").insert({
          user_id: user.id,
          campaign_idea: name,
          content_type: "image",
          prompt: prompt.slice(0, 500),
          image_prompt: imageUrl,
          tags: [`image:${imageUrl}`, `platform:${platform.toLowerCase()}`],
        });
        if (insErr) throw insErr;
        toast({ title: "New campaign created", description: `"${name}" was created with this image.` });
      }
      setPushOpen(false);
      setNewCampaignName("");
    } catch (e: any) {
      toast({ title: "Push failed", description: e?.message || "Could not push image.", variant: "destructive" });
    } finally {
      setPushing(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-md overflow-hidden border border-border bg-muted/30">
        <img
          src={imageUrl}
          alt={`Generated ${platform} visual`}
          className="w-full h-auto max-h-[420px] object-contain"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleSaveToBrand} disabled={savingBrand || savedToBrand}>
          {savingBrand ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : savedToBrand ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <ImagePlus className="w-4 h-4 mr-2" />
          )}
          {savedToBrand ? "Saved to Brand Assets" : "Save to Brand Assets"}
        </Button>
        <Button onClick={openPush}>
          <Send className="w-4 h-4 mr-2" /> Push to Campaign
        </Button>
      </div>

      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push image to a campaign</DialogTitle>
            <DialogDescription>
              Attach this generated image to an existing campaign draft, or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={pushMode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setPushMode("existing")}
                className="flex-1"
              >
                Existing campaign
              </Button>
              <Button
                type="button"
                variant={pushMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setPushMode("new")}
                className="flex-1"
              >
                New campaign
              </Button>
            </div>

            {pushMode === "existing" ? (
              <div>
                <Label className="text-xs text-muted-foreground">Select a campaign</Label>
                {campaignsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading campaigns...
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-3">
                    No existing campaigns. Switch to "New campaign" above.
                  </div>
                ) : (
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a draft" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="new-camp-name" className="text-xs text-muted-foreground">
                  Campaign name
                </Label>
                <Input
                  id="new-camp-name"
                  placeholder={`${platform} visual draft`}
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPushOpen(false)} disabled={pushing}>
              Cancel
            </Button>
            <Button
              onClick={handlePush}
              disabled={pushing || (pushMode === "existing" && (!selectedCampaign || campaigns.length === 0))}
            >
              {pushing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pushing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Push image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
