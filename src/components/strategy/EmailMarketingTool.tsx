import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Zap, Clock, Type, BarChart3, Sparkles, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function EmailMarketingTool() {
  return (
    <Tabs defaultValue="campaign-builder" className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        <TabsTrigger value="campaign-builder" className="gap-1.5 text-xs sm:text-sm"><Mail className="w-3.5 h-3.5" />Campaign Builder</TabsTrigger>
        <TabsTrigger value="email-writer" className="gap-1.5 text-xs sm:text-sm"><Type className="w-3.5 h-3.5" />Email Writer</TabsTrigger>
        <TabsTrigger value="automation" className="gap-1.5 text-xs sm:text-sm"><Zap className="w-3.5 h-3.5" />Automation Sequences</TabsTrigger>
        <TabsTrigger value="subject-lines" className="gap-1.5 text-xs sm:text-sm"><Sparkles className="w-3.5 h-3.5" />Subject Line Generator</TabsTrigger>
        <TabsTrigger value="performance" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="w-3.5 h-3.5" />Performance Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="campaign-builder"><CampaignBuilderTab /></TabsContent>
      <TabsContent value="email-writer"><EmailWriterTab /></TabsContent>
      <TabsContent value="automation"><AutomationTab /></TabsContent>
      <TabsContent value="subject-lines"><SubjectLineTab /></TabsContent>
      <TabsContent value="performance"><PerformanceInsightsTab /></TabsContent>
    </Tabs>
  );
}

function useAIGenerate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const { toast } = useToast();

  const generate = async (prompt: string) => {
    setLoading(true);
    setResult("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-strategy-content", {
        body: { prompt, userId: user.id },
      });
      if (error) throw error;
      setResult(data?.content || "No content generated.");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { loading, result, generate };
}

function CampaignBuilderTab() {
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState("");
  const { loading, result, generate } = useAIGenerate();

  const handleGenerate = () => {
    if (!goal) return;
    generate(`Create an email marketing campaign plan.\n\nCampaign Goal: ${goal}\nAudience Segment: ${audience || "General"}\nCampaign Length: ${length || "3 email sequence"}\n\nGenerate:\n1. Campaign structure overview\n2. Email sequence outline (subject, purpose, CTA for each email)\n3. Recommended send schedule with timing\n4. CTA strategy across the sequence`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Campaign Builder</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Campaign Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product launch">Product Launch</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="lead nurture">Lead Nurture</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience Segment</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. New subscribers" />
            </div>
            <div className="space-y-2">
              <Label>Campaign Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single email">Single Email</SelectItem>
                  <SelectItem value="3 email sequence">3 Email Sequence</SelectItem>
                  <SelectItem value="5 email sequence">5 Email Sequence</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !goal}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Mail className="w-4 h-4 mr-2" />Build Campaign</>}
          </Button>
        </CardContent>
      </Card>
      {result && <ResultCard content={result} />}
    </div>
  );
}

function EmailWriterTab() {
  const [campaignType, setCampaignType] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const { loading, result, generate } = useAIGenerate();

  const handleGenerate = () => {
    if (!campaignType) return;
    generate(`Write a complete marketing email.\n\nCampaign Type: ${campaignType}\nAudience: ${audience || "General"}\nTone: ${tone || "Professional"}\n\nGenerate:\n1. Subject line\n2. Preview text\n3. Full email body with sections\n4. CTA block\n5. Two alternate versions with different angles`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Email Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product launch">Product Launch</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="re-engagement">Re-engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. SaaS founders" />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !campaignType}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Writing...</> : <><Type className="w-4 h-4 mr-2" />Write Email</>}
          </Button>
        </CardContent>
      </Card>
      {result && <ResultCard content={result} />}
    </div>
  );
}

function AutomationTab() {
  const templates = [
    { id: "welcome", label: "Welcome Series", desc: "Onboard new subscribers with a warm introduction sequence" },
    { id: "lead-nurture", label: "Lead Nurture", desc: "Guide prospects through awareness to conversion" },
    { id: "product-launch", label: "Product Launch", desc: "Build anticipation and drive launch day sales" },
    { id: "re-engagement", label: "Re-engagement", desc: "Win back inactive subscribers" },
    { id: "onboarding", label: "Customer Onboarding", desc: "Help new customers get started and find value" },
  ];

  const [selected, setSelected] = useState("");
  const { loading, result, generate } = useAIGenerate();

  const handleGenerate = () => {
    if (!selected) return;
    const tmpl = templates.find((t) => t.id === selected);
    generate(`Create a complete ${tmpl?.label} email automation sequence.\n\nGenerate:\n1. Full sequence of 4-6 emails\n2. Timing between each email (delay in days/hours)\n3. For each email: subject line, purpose, key message, and CTA\n4. Trigger conditions and exit criteria`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Automation Sequences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Label>Select Template</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${selected === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <div className="text-sm font-medium text-foreground">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
          <Button onClick={handleGenerate} disabled={loading || !selected}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Zap className="w-4 h-4 mr-2" />Generate Sequence</>}
          </Button>
        </CardContent>
      </Card>
      {result && <ResultCard content={result} />}
    </div>
  );
}

function SubjectLineTab() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const { loading, result, generate } = useAIGenerate();

  const handleGenerate = () => {
    if (!topic) return;
    generate(`Generate 10 email subject lines.\n\nTopic: ${topic}\nTone: ${tone || "Engaging"}\nAudience: ${audience || "General"}\n\nFor each subject line, provide:\n1. The subject line\n2. Estimated open-rate probability score (Low / Medium / High / Very High)\n3. Why it works (one sentence)\n\nInclude a mix of curiosity, urgency, benefit-driven, and personalization approaches.`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Subject Line Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Spring sale announcement" />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="engaging">Engaging</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="curious">Curious</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. E-commerce shoppers" />
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !topic}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Subject Lines</>}
          </Button>
        </CardContent>
      </Card>
      {result && <ResultCard content={result} />}
    </div>
  );
}

function PerformanceInsightsTab() {
  const { loading, result, generate } = useAIGenerate();

  const handleGenerate = () => {
    generate(`As an email marketing optimization expert, provide comprehensive performance improvement recommendations.\n\nCover these areas:\n\n1. **Open Rate Optimization**\n   - Subject line best practices\n   - Send time optimization\n   - Sender name strategies\n\n2. **Click Rate Improvement**\n   - CTA placement and design\n   - Content structure\n   - Link strategies\n\n3. **Conversion Rate Enhancement**\n   - Landing page alignment\n   - Offer positioning\n   - Urgency and scarcity tactics\n\n4. **General AI Suggestions**\n   - Specific actionable improvements\n   - A/B testing recommendations\n   - Segmentation strategies`);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Open Rate</p>
            <p className="text-2xl font-bold text-foreground">—</p>
            <Badge variant="outline" className="mt-1 text-xs">No data yet</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Click Rate</p>
            <p className="text-2xl font-bold text-foreground">—</p>
            <Badge variant="outline" className="mt-1 text-xs">No data yet</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Conversion</p>
            <p className="text-2xl font-bold text-foreground">—</p>
            <Badge variant="outline" className="mt-1 text-xs">No data yet</Badge>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">AI Optimization Suggestions</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><BarChart3 className="w-4 h-4 mr-2" />Get Optimization Tips</>}
          </Button>
        </CardContent>
      </Card>
      {result && <ResultCard content={result} />}
    </div>
  );
}

function ResultCard({ content }: { content: string }) {
  const { toast } = useToast();
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">AI Output</h3>
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(content); toast({ title: "Copied!" }); }}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
          </Button>
        </div>
        <div className="prose prose-sm max-w-none text-foreground">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
