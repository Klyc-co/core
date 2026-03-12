import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function StrategyMessagingTool() {
  return (
    <Tabs defaultValue="framework" className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        <TabsTrigger value="framework" className="text-xs sm:text-sm">Messaging Framework</TabsTrigger>
        <TabsTrigger value="hooks" className="text-xs sm:text-sm">Hooks Generator</TabsTrigger>
        <TabsTrigger value="cta" className="text-xs sm:text-sm">CTA Builder</TabsTrigger>
        <TabsTrigger value="angles" className="text-xs sm:text-sm">Campaign Angles</TabsTrigger>
      </TabsList>

      <TabsContent value="framework"><MessagingFrameworkTab /></TabsContent>
      <TabsContent value="hooks"><HooksGeneratorTab /></TabsContent>
      <TabsContent value="cta"><CTABuilderTab /></TabsContent>
      <TabsContent value="angles"><CampaignAnglesTab /></TabsContent>
    </Tabs>
  );
}

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
          <span className="text-sm font-semibold text-foreground">Result</span>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="prose prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-wrap">
          {result}
        </div>
      </CardContent>
    </Card>
  );
}

function MessagingFrameworkTab() {
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [landscape, setLandscape] = useState("");
  const { loading, result, generate, copyResult, copied } = useAIGenerate();

  const handleGenerate = () => {
    generate(`You are a brand strategist. Create a comprehensive messaging framework based on:
Brand Objective: ${objective}
Target Audience: ${audience}
Key Differentiator: ${differentiator}
Competitor Landscape: ${landscape}

Output the following sections clearly formatted:
1. Messaging Pillars (3-5 core pillars)
2. Brand Positioning Statement
3. Value Proposition
4. Tone Direction`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Brand Objective</label>
            <Input placeholder="e.g., Become the go-to platform for..." value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Target Audience</label>
            <Input placeholder="e.g., Small business owners aged 25-45" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Key Differentiator</label>
            <Input placeholder="What sets you apart?" value={differentiator} onChange={(e) => setDifferentiator(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Competitor Landscape</label>
            <Textarea placeholder="Brief overview of competitors..." value={landscape} onChange={(e) => setLandscape(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !objective} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Framework
          </Button>
        </CardContent>
      </Card>
      <ResultDisplay result={result} loading={loading} onCopy={copyResult} copied={copied} />
    </div>
  );
}

function HooksGeneratorTab() {
  const [platform, setPlatform] = useState("");
  const [topic, setTopic] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const { loading, result, generate, copyResult, copied } = useAIGenerate();

  const handleGenerate = () => {
    generate(`You are a social media copywriter. Generate 10 scroll-stopping hook options for:
Platform: ${platform}
Topic: ${topic}
Audience: ${audienceType}

Make them punchy, curiosity-driven, and platform-native. Number each one.`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Platform</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="X / Twitter">X / Twitter</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Topic</label>
            <Input placeholder="e.g., AI in marketing" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Audience Type</label>
            <Input placeholder="e.g., B2B founders, Gen Z consumers" value={audienceType} onChange={(e) => setAudienceType(e.target.value)} />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !platform || !topic} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Hooks
          </Button>
        </CardContent>
      </Card>
      <ResultDisplay result={result} loading={loading} onCopy={copyResult} copied={copied} />
    </div>
  );
}

function CTABuilderTab() {
  const [goal, setGoal] = useState("");
  const { loading, result, generate, copyResult, copied } = useAIGenerate();

  const handleGenerate = () => {
    generate(`You are a conversion copywriter. Generate CTA variations for the campaign goal: ${goal}

Provide:
1. Standard CTA variations (5 options)
2. Urgency CTAs (5 options)
3. Authority CTAs (5 options)

Make them actionable, specific, and compelling.`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Campaign Goal</label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Awareness">Awareness</SelectItem>
                <SelectItem value="Leads">Leads</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !goal} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate CTAs
          </Button>
        </CardContent>
      </Card>
      <ResultDisplay result={result} loading={loading} onCopy={copyResult} copied={copied} />
    </div>
  );
}

function CampaignAnglesTab() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("");
  const [audience, setAudience] = useState("");
  const { loading, result, generate, copyResult, copied } = useAIGenerate();

  const handleGenerate = () => {
    generate(`You are a creative strategist. Generate 6-8 campaign directions for:
Topic: ${topic}
Platform: ${platform}
Audience: ${audience}

For each direction provide:
- Campaign angle name
- Core theme
- Content approach
- Why it works for this audience`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Topic</label>
            <Input placeholder="e.g., Product launch, brand awareness" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Platform</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="X / Twitter">X / Twitter</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="Multi-platform">Multi-platform</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Audience</label>
            <Input placeholder="e.g., SaaS founders, fitness enthusiasts" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !topic} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Campaign Angles
          </Button>
        </CardContent>
      </Card>
      <ResultDisplay result={result} loading={loading} onCopy={copyResult} copied={copied} />
    </div>
  );
}
