import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check, TrendingUp, Palette, Music, X, Search, Captions } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

function ResultDisplay({ result, loading, onCopy, copied }: { result: string | null; loading: boolean; onCopy: () => void; copied: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
      </div>
    );
  }
  if (!result) return null;
  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">Generated Content</span>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="prose prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-wrap">{result}</div>
      </CardContent>
    </Card>
  );
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
  const { loading, result, generate, copyResult, copied } = useAIGenerate();
  const { loading: viralLoading, result: viralResult, generate: generateViral, copyResult: copyViral, copied: viralCopied } = useAIGenerate();

  const toggleColor = (value: string) => {
    setSelectedColors((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const colorContext = selectedColors.length > 0 ? `\nColor Palette Preference: ${selectedColors.join(", ")}` : "";
  const vibeContext = visualVibe ? `\nVisual Vibe: ${visualVibe}` : "";
  const musicContext = musicSearch.trim() ? `\nMusic/Audio Reference: "${musicSearch}" — suggest content that pairs well with this song/audio mood.` : "";
  const subtitleContext = subtitleEntries.length > 0 ? `\nSubtitles/Captions:\n${subtitleEntries.map((e) => `[${e.time}] ${e.text}`).join("\n")}\nIncorporate these timed subtitles into the content.` : "";
  const handleGenerate = () => {
    generate(`You are an expert ${platform} content creator. Create platform-native content for:
Topic: ${topic}
Audience: ${audience}
Tone: ${tone || "Professional yet engaging"}${colorContext}${vibeContext}${musicContext}${subtitleContext}

Generate the following formats optimized for ${platform}:
${formats}

Make the content native to ${platform}'s style, length, and best practices.${selectedColors.length > 0 ? " Incorporate the specified color palette into visual direction notes." : ""}${visualVibe ? " Align visual suggestions with the specified vibe." : ""}`);
  };

  const handleShowViral = () => {
    generateViral(`You are a social media trend analyst specializing in ${platform}. Research and present the most popular, viral, and high-performing posts related to:

Topic: ${topic}
Target Audience: ${audience}
Tone preference: ${tone || "Any"}${colorContext}${vibeContext}${subtitleContext}

Provide 5-7 examples of viral/popular ${platform} posts about this topic. For each post include:
1. **Post Summary** — What the post was about (reconstruct the key message)
2. **Why It Went Viral** — The psychological or strategic hook that made it spread
3. **Engagement Pattern** — Estimated engagement level (high/very high/mega viral) and what type of engagement it drove (shares, saves, comments, etc.)
4. **Key Takeaway** — What the user can learn and replicate from this post
5. **Suggested Adaptation** — How the user could create a similar post for their audience (${audience})

Focus on recent, trending content patterns on ${platform}. Include specific content structures, hooks, and formats that are currently performing well.`);
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
          <Button onClick={handleGenerate} disabled={loading || !topic} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate {platform} Content
          </Button>
        </CardContent>
      </Card>
      <ResultDisplay result={result} loading={loading} onCopy={copyResult} copied={copied} />
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
    </div>
  );
}

export default function PlatformContentTool() {
  return (
    <Tabs defaultValue="linkedin" className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        <TabsTrigger value="linkedin" className="text-xs sm:text-sm">LinkedIn</TabsTrigger>
        <TabsTrigger value="twitter" className="text-xs sm:text-sm">X / Twitter</TabsTrigger>
        <TabsTrigger value="instagram" className="text-xs sm:text-sm">Instagram</TabsTrigger>
        <TabsTrigger value="tiktok" className="text-xs sm:text-sm">TikTok</TabsTrigger>
        <TabsTrigger value="youtube" className="text-xs sm:text-sm">YouTube</TabsTrigger>
      </TabsList>

      <TabsContent value="linkedin">
        <PlatformTab platform="LinkedIn" formats="1. Post draft (text post, 1300 chars max)\n2. Carousel outline (8-10 slides)\n3. Thread version (5-7 connected posts)" />
      </TabsContent>
      <TabsContent value="twitter">
        <PlatformTab platform="X / Twitter" formats="1. Single tweet (280 chars)\n2. Thread (5-7 tweets)\n3. Quote tweet angles (3 options)" />
      </TabsContent>
      <TabsContent value="instagram">
        <PlatformTab platform="Instagram" formats="1. Caption (with hashtags)\n2. Carousel outline (8-10 slides)\n3. Reel script (30-60 sec)\n4. Story sequence (5 slides)" />
      </TabsContent>
      <TabsContent value="tiktok">
        <PlatformTab platform="TikTok" formats="1. Video script (30-60 sec)\n2. Hook options (5 scroll-stopping openers)\n3. Trending format adaptation\n4. Caption with hashtags" />
      </TabsContent>
      <TabsContent value="youtube">
        <PlatformTab platform="YouTube" formats="1. Video title options (5)\n2. Description with timestamps\n3. Script outline\n4. Shorts script (60 sec)" />
      </TabsContent>
    </Tabs>
  );
}
