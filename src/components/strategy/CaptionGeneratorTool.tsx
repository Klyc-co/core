import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Check, Captions, X } from "lucide-react";
import { SiX, SiInstagram, SiTiktok } from "react-icons/si";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LinkedInIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

type PlatformKey = "tiktok" | "instagram" | "linkedin" | "twitter";

interface CaptionData {
  caption: string;
  hashtags: string[];
}

const PLATFORM_META: Record<PlatformKey, { label: string; icon: React.ReactNode }> = {
  tiktok: { label: "TikTok", icon: <SiTiktok size={16} /> },
  instagram: { label: "Instagram", icon: <SiInstagram size={16} color="#E4405F" /> },
  linkedin: { label: "LinkedIn", icon: <LinkedInIcon size={16} /> },
  twitter: { label: "X / Twitter", icon: <SiX size={16} /> },
};

export default function CaptionGeneratorTool() {
  const { toast } = useToast();
  const [campaignIdea, setCampaignIdea] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentType, setContentType] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [captions, setCaptions] = useState<Record<PlatformKey, CaptionData> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleGenerate = async () => {
    if (!campaignIdea.trim()) {
      toast({ title: "Add a campaign idea", description: "Describe what the post is about.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCaptions(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-captions", {
        body: { campaignIdea, targetAudience, contentType, tags },
      });
      if (error) throw error;
      if (!data?.captions) throw new Error("No captions returned");
      setCaptions(data.captions);
    } catch (e: any) {
      toast({ title: "Failed to generate captions", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyCaption = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Captions className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Caption Generator</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Generate platform-native captions with hashtags optimized for each social network.
          </p>

          <div>
            <label className="text-sm font-medium mb-1 block">Campaign Idea / Post Topic</label>
            <Textarea
              placeholder="e.g. Launching our new sustainable sneaker line — eco-friendly materials, bold colors, made for city streets."
              value={campaignIdea}
              onChange={(e) => setCampaignIdea(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Target Audience</label>
              <Input
                placeholder="e.g. Gen Z urban professionals"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content Type</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product Launch">Product Launch</SelectItem>
                  <SelectItem value="Behind the Scenes">Behind the Scenes</SelectItem>
                  <SelectItem value="Educational">Educational</SelectItem>
                  <SelectItem value="Promotion / Sale">Promotion / Sale</SelectItem>
                  <SelectItem value="Storytelling">Storytelling</SelectItem>
                  <SelectItem value="Announcement">Announcement</SelectItem>
                  <SelectItem value="User Generated Content">User Generated Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Existing Tags / Keywords (optional)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))}>
                    #{t} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleGenerate} disabled={loading || !campaignIdea.trim()} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Captions
          </Button>
        </CardContent>
      </Card>

      {captions && (
        <div className="space-y-3">
          {(Object.keys(PLATFORM_META) as PlatformKey[]).map((key) => {
            const data = captions[key];
            if (!data) return null;
            const meta = PLATFORM_META[key];
            const isCopied = copiedKey === key;
            return (
              <Card key={key} className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {meta.icon}
                      <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{data.caption.length} chars</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyCaption(key, data.caption)}>
                      {isCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {isCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded p-3">
                    {data.caption}
                  </div>
                  {data.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.hashtags.map((h, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
