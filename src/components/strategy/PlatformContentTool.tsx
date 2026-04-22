import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check, TrendingUp, Palette, Music, X, Search, Captions, ChevronDown, Users, MapPin } from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

const LinkedInIcon = ({ size = 20, color = "#0A66C2" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const PLATFORM_ICONS: Record<string, { icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  linkedin: { icon: LinkedInIcon, color: "#0A66C2" },
  twitter: { icon: SiX, color: "#000000" },
  instagram: { icon: SiInstagram, color: "#E4405F" },
  tiktok: { icon: SiTiktok, color: "#000000" },
  youtube: { icon: SiYoutube, color: "#FF0000" },
};
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import BrandColorsTool from "@/components/strategy/BrandColorsTool";
import CharactersTool from "@/components/strategy/CharactersTool";
import SceneSettingTool from "@/components/strategy/SceneSettingTool";
import PlatformPostActions from "@/components/strategy/PlatformPostActions";
import StrategyImageInline from "@/components/strategy/StrategyImageInline";

function useAIGenerate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generate = async (prompt: string) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: { prompt, model: "google/gemini-2.5-flash" },
      });
      if (error) throw error;
      setResult(data?.result || data?.text || "No result returned.");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return { loading, result, generate, copyResult, copied };
}

const COLOR_OPTIONS = [
  { value: "Warm Tones", colors: ["#FF6B6B", "#FFA07A", "#FFD93D"] },
  { value: "Cool Tones", colors: ["#6C63FF", "#48C9B0", "#5DADE2"] },
  { value: "Earth Tones", colors: ["#A0522D", "#8B7355", "#6B8E23"] },
  { value: "Neon / Bold", colors: ["#FF00FF", "#00FF87", "#FFE600"] },
  { value: "Pastel", colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF"] },
  { value: "Monochrome", colors: ["#333333", "#777777", "#BBBBBB"] },
  { value: "Luxury / Dark", colors: ["#1A1A2E", "#C9A94E", "#E0E0E0"] },
];

const VIBE_OPTIONS = [
  "Minimalist & Clean",
  "Bold & Energetic",
  "Retro / Vintage",
  "Futuristic / Techy",
  "Organic / Natural",
  "Playful / Fun",
  "Elegant / Luxurious",
  "Street / Urban",
];

function PlatformTab({ platform, formats }: { platform: string; formats: string }) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [visualVibe, setVisualVibe] = useState("");
  const [musicSearch, setMusicSearch] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [subtitleTimestamp, setSubtitleTimestamp] = useState("");
  const [subtitleEntries, setSubtitleEntries] = useState<{ time: string; text: string }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionData, setCaptionData] = useState<{ caption: string; hashtags: string[] } | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const { toast } = useToast();
  const { loading: viralLoading, result: viralResult, generate: generateViral, copyResult: copyViral, copied: viralCopied } = useAIGenerate();

  // Map display platform name to caption API key
  const captionPlatformKey = ((): "tiktok" | "instagram" | "linkedin" | "twitter" => {
    const p = platform.toLowerCase();
    if (p.includes("tiktok")) return "tiktok";
    if (p.includes("instagram")) return "instagram";
    if (p.includes("linkedin")) return "linkedin";
    return "twitter";
  })();

  const handleGenerateCaption = async () => {
    setCaptionLoading(true);
    setCaptionData(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-captions", {
        body: {
          campaignIdea: `${topic}${tone ? ` (Tone: ${tone})` : ""}${visualVibe ? ` (Visual vibe: ${visualVibe})` : ""}`,
          targetAudience: audience,
          contentType: `${platform} post`,
          tags: [],
        },
      });
      if (error) throw error;
      const c = data?.captions?.[captionPlatformKey];
      if (!c) throw new Error("No caption returned");
      setCaptionData({ caption: c.caption || "", hashtags: c.hashtags || [] });
    } catch (e: any) {
      toast({ title: "Caption generation failed", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setCaptionLoading(false);
    }
  };

  const copyCaption = () => {
    if (!captionData) return;
    navigator.clipboard.writeText(captionData.caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const toggleColor = (value: string) => {
    setSelectedColors((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const colorContext = selectedColors.length > 0 ? `\nColor Palette Preference: ${selectedColors.join(", ")}` : "";
  const vibeContext = visualVibe ? `\nVisual Vibe: ${visualVibe}` : "";
  const musicContext = musicSearch.trim() ? `\nMusic/Audio Reference: "${musicSearch}"` : "";
  const subtitleContext = subtitleEntries.length > 0 ? `\nOn-image text/captions:\n${subtitleEntries.map((e) => `[${e.time}] ${e.text}`).join("\n")}` : "";

  const handleGenerateImage = async () => {
    const builtPrompt = `A scroll-stopping ${platform} visual.
Topic: ${topic}
Audience: ${audience}
Tone: ${tone || "Professional yet engaging"}${colorContext}${vibeContext}${musicContext}${subtitleContext}

Format guidance for ${platform}:
${formats}

Make it native to ${platform}, high quality, on-brand, visually striking.`;
    setImagePrompt(builtPrompt);
    setImageLoading(true);
    setImageUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("strategy-image-gen", {
        body: { prompt: builtPrompt, platform },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "No image returned");
      setImageUrl(data.url);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Could not generate image.", variant: "destructive" });
    } finally {
      setImageLoading(false);
    }
  };

  const handleShowViral = () => {
    generateViral(`You are a social media trend analyst specializing in ${platform}. Research and present the most popular, viral, and high-performing posts related to:

Topic: ${topic}
Target Audience: ${audience}
Tone preference: ${tone || "Any"}${colorContext}${vibeContext}${subtitleContext}

Provide 5-7 examples of viral/popular ${platform} posts about this topic. For each post include:
1. **Post Summary** — What the post was about (reconstruct the key message)
2. **Why It Went Viral** — The psychological or strategic hook that made it spread
3. **Engagement Pattern** — Estimated engagement level and what type of engagement it drove
4. **Key Takeaway** — What the user can learn and replicate from this post
5. **Suggested Adaptation** — How the user could create a similar post for their audience (${audience})

Focus on recent, trending content patterns on ${platform}.`);
  };

  const inputsFilled = topic.trim().length > 0;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Topic</label>
            <Input placeholder="What's the content about?" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Audience</label>
            <Input placeholder="Who is this for?" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Bold & Provocative">Bold & Provocative</SelectItem>
                <SelectItem value="Educational">Educational</SelectItem>
                <SelectItem value="Inspirational">Inspirational</SelectItem>
                <SelectItem value="Humorous">Humorous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Color Palette
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleColor(opt.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                    selectedColors.includes(opt.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="flex gap-0.5">
                    {opt.colors.map((c) => (
                      <span key={c} className="w-3 h-3 rounded-full inline-block border border-border/50" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  {opt.value}
                </button>
              ))}
            </div>
            {selectedColors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {selectedColors.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleColor(c)}>
                    {c} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Visual Vibe</label>
            <Select value={visualVibe} onValueChange={setVisualVibe}>
              <SelectTrigger><SelectValue placeholder="Select visual vibe" /></SelectTrigger>
              <SelectContent>
                {VIBE_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5" /> Song / Audio Reference
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search for a song or artist..."
                value={musicSearch}
                onChange={(e) => setMusicSearch(e.target.value)}
                className="pl-8"
              />
              {musicSearch && (
                <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setMusicSearch("")}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Captions className="w-3.5 h-3.5" /> Subtitles / Captions
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="00:00"
                  value={subtitleTimestamp}
                  onChange={(e) => setSubtitleTimestamp(e.target.value)}
                  className="w-20 text-center font-mono text-xs"
                />
                <Input
                  placeholder="Enter subtitle text..."
                  value={subtitleText}
                  onChange={(e) => setSubtitleText(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subtitleText.trim()) {
                      setSubtitleEntries((prev) => [...prev, { time: subtitleTimestamp || "00:00", text: subtitleText.trim() }]);
                      setSubtitleText("");
                      setSubtitleTimestamp("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!subtitleText.trim()}
                  onClick={() => {
                    setSubtitleEntries((prev) => [...prev, { time: subtitleTimestamp || "00:00", text: subtitleText.trim() }]);
                    setSubtitleText("");
                    setSubtitleTimestamp("");
                  }}
                >
                  Add
                </Button>
              </div>
              {subtitleEntries.length > 0 && (
                <div className="space-y-1">
                  {subtitleEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                      <span className="font-mono text-muted-foreground w-12 shrink-0">{entry.time}</span>
                      <span className="flex-1 text-foreground">{entry.text}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setSubtitleEntries((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={handleShowViral} disabled={viralLoading || !inputsFilled} className="w-full">
            {viralLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            Show Viral Posts
          </Button>
          <Button onClick={handleGenerateImage} disabled={imageLoading || !inputsFilled} className="w-full">
            {imageLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate {platform} Image
          </Button>
          <StrategyImageInline platform={platform} imageUrl={imageUrl} prompt={imagePrompt} />

          <div className="border-t border-border pt-3 mt-1 space-y-2">
            <div className="flex items-center gap-1.5">
              <Captions className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Caption Generator</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a {platform}-native caption with hashtags from your topic & audience.
            </p>
            <Button variant="outline" onClick={handleGenerateCaption} disabled={captionLoading || !inputsFilled} className="w-full">
              {captionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Captions className="w-4 h-4 mr-2" />}
              Generate {platform} Caption
            </Button>
            {captionData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{captionData.caption.length} characters</span>
                  <Button variant="ghost" size="sm" onClick={copyCaption}>
                    {captionCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {captionCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded p-3">
                  {captionData.caption}
                </div>
                {captionData.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {captionData.hashtags.map((h, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {(viralResult || viralLoading) && (
        <Card className={viralResult ? "border-primary/30" : ""}>
          <CardContent className="pt-4">
            {viralLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Finding viral posts...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Viral & Trending Posts
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyViral}>
                    {viralCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {viralCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-wrap">{viralResult}</div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <PlatformPostActions platform={platform} generatedContent={imageUrl} />
    </div>
  );
}

export default function PlatformContentTool() {
  const [colorsOpen, setColorsOpen] = useState(false);
  const [charsOpen, setCharsOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* ─── Collapsible Configuration Sections ─────────────────── */}
      <Collapsible open={colorsOpen} onOpenChange={setColorsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Brand Color Palette</div>
                  <div className="text-xs text-muted-foreground">Define your brand's role-based color map for content generation</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${colorsOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <BrandColorsTool />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={charsOpen} onOpenChange={setCharsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Characters</div>
                  <div className="text-xs text-muted-foreground">Define the people and characters appearing in your content</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${charsOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <CharactersTool />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={sceneOpen} onOpenChange={setSceneOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Scene & Setting</div>
                  <div className="text-xs text-muted-foreground">Describe the visual environment and atmosphere for your content</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${sceneOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <SceneSettingTool />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── Platform Tabs ──────────────────────────────────────── */}
      <Tabs defaultValue="linkedin" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {(["linkedin", "twitter", "instagram", "tiktok", "youtube"] as const).map((key) => {
            const { icon: Icon, color } = PLATFORM_ICONS[key];
            const labels: Record<string, string> = { linkedin: "LinkedIn", twitter: "X / Twitter", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
            return (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm flex items-center gap-1.5">
                <Icon size={16} color={color} />
                {labels[key]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="linkedin">
          <PlatformTab platform="LinkedIn" formats="Square or 4:5 portrait visual; clean, professional; strong headline overlay; minimal busy background." />
        </TabsContent>
        <TabsContent value="twitter">
          <PlatformTab platform="X / Twitter" formats="16:9 or square; punchy single-message visual; readable on small screens; bold contrast." />
        </TabsContent>
        <TabsContent value="instagram">
          <PlatformTab platform="Instagram" formats="4:5 portrait or 1:1 square; rich color, lifestyle/aesthetic; hero subject; thumbstop quality." />
        </TabsContent>
        <TabsContent value="tiktok">
          <PlatformTab platform="TikTok" formats="9:16 vertical; high-energy, native feel; bold subject; room for caption overlay at top/bottom safe zones." />
        </TabsContent>
        <TabsContent value="youtube">
          <PlatformTab platform="YouTube" formats="16:9 thumbnail style; expressive subject + bold short headline; high contrast; clickable composition." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
