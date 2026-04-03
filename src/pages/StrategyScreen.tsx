import { useState } from "react";
import { useKlycPipeline, CampaignInput, StageResult } from "@/hooks/useKlycPipeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Zap, Search, Package, BookOpen, PenTool, Share2, Image, ShieldCheck, BarChart3,
  Loader2, CheckCircle2, XCircle, ChevronDown, RotateCcw, Download, Send, Rocket, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CampaignStepper, { type CampaignStep } from "@/components/campaign/CampaignStepper";

// ── Constants ──

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "LinkedIn", "Twitter/X", "Facebook", "YouTube"];
const OBJECTIVE_OPTIONS = ["Brand Awareness", "Lead Generation", "Sales Conversion", "Engagement", "Product Launch", "Thought Leadership"];

const STAGE_META: Record<string, { label: string; icon: typeof Zap }> = {
  normalizer: { label: "Normalizer", icon: Zap },
  research: { label: "Research", icon: Search },
  product: { label: "Product", icon: Package },
  narrative: { label: "Narrative", icon: BookOpen },
  social: { label: "Social", icon: Share2 },
  image: { label: "Image", icon: Image },
  editor: { label: "Editor", icon: PenTool },
  approval: { label: "Approval", icon: ShieldCheck },
  analytics: { label: "Analytics", icon: BarChart3 },
};

// ── Platform Pill Selector ──

function PlatformSelector({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (p: string) => {
    onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORM_OPTIONS.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => toggle(p)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            selected.includes(p)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Viral Score Gauge (SVG ring) ──

function ViralGauge({ score }: { score: number }) {
  const normalized = Math.min(Math.max(score, 0), 10);
  const pct = normalized / 10;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = normalized < 5 ? "hsl(var(--destructive))" : normalized < 7.5 ? "hsl(var(--warning))" : "hsl(var(--success))";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          className="transition-all duration-1000"
        />
        <text x="50" y="54" textAnchor="middle" className="fill-foreground text-lg font-bold" fontSize="18">
          {normalized.toFixed(1)}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium">Viral Score</span>
    </div>
  );
}

// ── Stage Card ──

function StageCard({ result }: { result: StageResult }) {
  const meta = STAGE_META[result.focus] || { label: result.focus, icon: Zap };
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  result.status === "running" && "bg-primary/10",
                  result.status === "complete" && "bg-success/10",
                  result.status === "error" && "bg-destructive/10",
                  result.status === "skipped" && "bg-muted",
                  result.status === "pending" && "bg-muted/50",
                )}>
                  {result.status === "running" ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : result.status === "complete" ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : result.status === "error" ? (
                    <XCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{meta.label}</p>
                  {result.description && (
                    <p className="text-xs text-muted-foreground">{result.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {result.durationMs > 0 && (
                  <span className="text-xs text-muted-foreground">{(result.durationMs / 1000).toFixed(1)}s</span>
                )}
                {result.tokens && (
                  <span className="text-xs text-muted-foreground">{result.tokens.input + result.tokens.output} tok</span>
                )}
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-3">
            {result.error ? (
              <p className="text-sm text-destructive">{result.error}</p>
            ) : result.data ? (
              <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-60 text-foreground">
                {typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground italic">No output data</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Main Page ──

const PIPELINE_ORDER = ["normalizer", "research", "product", "narrative", "social", "image", "editor", "approval", "analytics"];

export default function StrategyScreen() {
  const pipeline = useKlycPipeline();
  const navigate = useNavigate();
  const [savingDraft, setSavingDraft] = useState(false);
  const [form, setForm] = useState({
    campaignName: "",
    productInfo: "",
    targetAudience: "",
    platforms: [] as string[],
    objective: "",
    campaignBrief: "",
    brandVoice: "",
    keywords: "",
  });

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleLaunch = () => {
    const input: CampaignInput = {
      campaignBrief: `${form.campaignName}: ${form.campaignBrief}`,
      productInfo: form.productInfo,
      targetAudience: form.targetAudience,
      platforms: form.platforms,
      objective: form.objective,
      brandVoice: form.brandVoice,
      keywords: form.keywords.split(",").map(k => k.trim()).filter(Boolean),
    };
    pipeline.launch(input);
  };

  const hasStages = Object.keys(pipeline.stages).length > 0;
  const totalTokens = Object.values(pipeline.stages).reduce(
    (acc, s) => acc + (s.tokens?.input ?? 0) + (s.tokens?.output ?? 0), 0
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Strategy Pipeline</h1>
          <p className="text-sm text-muted-foreground">Launch a full 9-stage campaign strategy with KNP compression</p>
        </div>
      </div>

      {/* Campaign Brief Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign Brief</CardTitle>
          <CardDescription>Fill in the details for your campaign strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Name</Label>
              <Input placeholder="e.g. Summer Launch 2026" value={form.campaignName} onChange={e => updateField("campaignName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand / Product</Label>
              <Input placeholder="e.g. NovaSkin Hydrating Serum" value={form.productInfo} onChange={e => updateField("productInfo", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Audience</Label>
              <Input placeholder="e.g. Eco-conscious women 25-35" value={form.targetAudience} onChange={e => updateField("targetAudience", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objective</Label>
              <Select value={form.objective} onValueChange={v => updateField("objective", v)}>
                <SelectTrigger><SelectValue placeholder="Select objective" /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Platforms</Label>
            <PlatformSelector selected={form.platforms} onChange={v => updateField("platforms", v)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Key Message / Brief</Label>
            <Textarea placeholder="Describe your campaign goals, key message, and any specific requirements..." value={form.campaignBrief} onChange={e => updateField("campaignBrief", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tone / Voice</Label>
              <Input placeholder="e.g. casual, authentic, bold" value={form.brandVoice} onChange={e => updateField("brandVoice", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keywords (comma-separated)</Label>
              <Input placeholder="e.g. sustainable, eco, fashion" value={form.keywords} onChange={e => updateField("keywords", e.target.value)} />
            </div>
          </div>

          <Button
            onClick={handleLaunch}
            disabled={pipeline.isRunning || !form.campaignBrief.trim()}
            className="w-full"
          >
            {pipeline.isRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Pipeline Running...</>
            ) : (
              <><Rocket className="w-4 h-4 mr-2" />Launch Strategy</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline Visualization */}
      {hasStages && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Pipeline Stages</h2>
          <div className="space-y-2">
            {PIPELINE_ORDER.map(focus => {
              const result = pipeline.stages[focus];
              if (!result) return null;
              return <StageCard key={focus} result={result} />;
            })}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {pipeline.summary && !pipeline.isRunning && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-start gap-6">
              {/* Viral Score */}
              {pipeline.viralScore != null && <ViralGauge score={pipeline.viralScore} />}

              {/* Stats */}
              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Total Time</p>
                    <p className="font-semibold text-foreground">{(pipeline.summary.totalMs / 1000).toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Stages</p>
                    <p className="font-semibold text-foreground">{pipeline.summary.completedCount}/{pipeline.summary.stageCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Tokens</p>
                    <p className="font-semibold text-foreground">{totalTokens.toLocaleString()}</p>
                  </div>
                  {pipeline.compression && (
                    <div>
                      <p className="text-muted-foreground text-xs">KNP Compression</p>
                      <p className="font-semibold text-foreground">{pipeline.compression.knpCompression}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { pipeline.cancel(); window.location.reload(); }}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />New Strategy
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={savingDraft}
                onClick={async () => {
                  setSavingDraft(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from("campaign_drafts").insert({
                        user_id: user.id,
                        prompt: form.campaignBrief,
                        campaign_idea: form.campaignName,
                        target_audience: form.targetAudience,
                        campaign_objective: form.objective,
                        tags: form.platforms,
                      });
                    }
                    toast.success("Draft saved", { duration: 3000 });
                  } catch {
                    toast.error("Failed to save draft");
                  } finally {
                    setSavingDraft(false);
                  }
                }}
              >
                {savingDraft ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save Draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ stages: pipeline.stages, summary: pipeline.summary, compression: pipeline.compression, viralScore: pipeline.viralScore }, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `strategy-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Strategy exported");
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />Export
              </Button>
              <Button size="sm" onClick={() => navigate("/klyc-chat")}>
                <Send className="w-3.5 h-3.5 mr-1.5" />Send to Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
