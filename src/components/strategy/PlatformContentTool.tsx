import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

function PlatformTab({ platform, formats }: { platform: string; formats: string }) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const { loading, result, generate, copyResult, copied } = useAIGenerate();

  const handleGenerate = () => {
    generate(`You are an expert ${platform} content creator. Create platform-native content for:
Topic: ${topic}
Audience: ${audience}
Tone: ${tone || "Professional yet engaging"}

Generate the following formats optimized for ${platform}:
${formats}

Make the content native to ${platform}'s style, length, and best practices.`);
  };

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
          <Button onClick={handleGenerate} disabled={loading || !topic} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate {platform} Content
          </Button>
        </CardContent>
      </Card>
      <ResultDisplay result={result} loading={loading} onCopy={copyResult} copied={copied} />
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
