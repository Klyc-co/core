import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown, Check, Loader2, Download, Trash2, AlertTriangle,
  MessageSquare, Brain, Globe, Bell, Eye, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Types ──

interface PersonalityData {
  tone: string;
  verbosity: string;
  explanation_detail: number;
  default_mode: string;
  confidence_threshold: number;
  approval_rule: string;
  industry: string[];
  competitor_tracking: boolean;
  alert_style: string;
  checkin_frequency: string;
  proactive_suggestions: boolean;
  show_reasoning: number;
  adaptation_level: string;
}

const DEFAULTS: PersonalityData = {
  tone: "professional",
  verbosity: "standard",
  explanation_detail: 5,
  default_mode: "guided",
  confidence_threshold: 60,
  approval_rule: "ask_big_decisions",
  industry: [],
  competitor_tracking: false,
  alert_style: "chat_bubble",
  checkin_frequency: "weekly",
  proactive_suggestions: true,
  show_reasoning: 6,
  adaptation_level: "standard",
};

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", desc: "Formal, precise, corporate" },
  { value: "casual", label: "Casual", desc: "Relaxed, friendly, startup vibe" },
  { value: "direct", label: "Direct", desc: "Fast, decisive, no fluff" },
  { value: "encouraging", label: "Encouraging", desc: "Motivational, supportive, coaching" },
  { value: "technical", label: "Technical", desc: "Data-driven, research-focused" },
];

const VERBOSITY_OPTIONS = [
  { value: "brief", label: "Brief", desc: "Just the decision, 1-2 sentences" },
  { value: "standard", label: "Standard", desc: "Recommendation + 2-3 key reasons" },
  { value: "detailed", label: "Detailed", desc: "Full reasoning with context and alternatives" },
];

const MODE_OPTIONS = [
  { value: "guided", label: "Guided", desc: "Always shows options before acting" },
  { value: "hybrid", label: "Hybrid", desc: "Acts on confident decisions, asks on uncertain ones" },
  { value: "solo", label: "Solo", desc: "Acts autonomously, you review after" },
];

const APPROVAL_OPTIONS = [
  { value: "always_ask", label: "Always Ask" },
  { value: "ask_publishing", label: "Ask for Publishing" },
  { value: "ask_big_decisions", label: "Ask for Big Decisions" },
  { value: "never_ask", label: "Never Ask" },
];

const ALERT_OPTIONS = [
  { value: "chat_bubble", label: "Chat Bubble" },
  { value: "banner", label: "Banner" },
  { value: "email_digest", label: "Email Digest" },
  { value: "quiet", label: "Quiet" },
  { value: "off", label: "Off" },
];

const CHECKIN_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "realtime", label: "Real-time" },
];

const ADAPTATION_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "light", label: "Light" },
  { value: "standard", label: "Standard" },
  { value: "aggressive", label: "Aggressive" },
];

const INDUSTRY_OPTIONS = [
  "Social Media Marketing", "E-commerce", "SaaS", "Digital Advertising",
  "Content Marketing", "Influencer Management", "Brand Management", "PR",
  "Event Marketing", "Performance Marketing", "Local Business", "Nonprofit",
  "Education", "Healthcare", "B2B Lead Gen", "Real Estate", "Finance",
];

// ── Component ──

export default function PersonalitySettings() {
  const [data, setData] = useState<PersonalityData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const existsRef = useRef(false);

  // Load
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: row } = await supabase
        .from("personality_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row) {
        existsRef.current = true;
        setData({
          tone: row.tone,
          verbosity: row.verbosity,
          explanation_detail: row.explanation_detail,
          default_mode: row.default_mode,
          confidence_threshold: row.confidence_threshold,
          approval_rule: row.approval_rule,
          industry: row.industry || [],
          competitor_tracking: row.competitor_tracking,
          alert_style: row.alert_style,
          checkin_frequency: row.checkin_frequency,
          proactive_suggestions: row.proactive_suggestions,
          show_reasoning: row.show_reasoning,
          adaptation_level: row.adaptation_level,
        });
      }
      setLoading(false);
    })();
  }, []);

  // Auto-save (debounced 500ms)
  const persist = useCallback(async (next: PersonalityData) => {
    setSaveStatus("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (existsRef.current) {
        await supabase.from("personality_settings").update(next).eq("user_id", user.id);
      } else {
        await supabase.from("personality_settings").insert({ ...next, user_id: user.id });
        existsRef.current = true;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      toast.error("Failed to save settings");
      setSaveStatus("idle");
    }
  }, []);

  const update = useCallback((patch: Partial<PersonalityData>) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => persist(next), 500);
      return next;
    });
  }, [persist]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "klyc-personality-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const handleResetLearning = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    update({ adaptation_level: "off", show_reasoning: 6 });
    toast.success("Learning data reset");
  };

  const handleDeleteAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("personality_settings").delete().eq("user_id", user.id);
    existsRef.current = false;
    setData(DEFAULTS);
    toast.success("All personality data deleted");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Personality & Behavior</h2>
          <p className="text-sm text-muted-foreground">Customize how Klyc communicates and makes decisions</p>
        </div>
        {saveStatus !== "idle" && (
          <Badge variant="outline" className={cn("text-xs transition-opacity", saveStatus === "saved" && "text-success")}>
            {saveStatus === "saving" ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving…</>
            ) : (
              <><Check className="w-3 h-3 mr-1" />Saved</>
            )}
          </Badge>
        )}
      </div>

      {/* Section 1: Communication Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Communication Style
          </CardTitle>
          <CardDescription>How Klyc talks to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tone */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tone</Label>
            <RadioGroup value={data.tone} onValueChange={v => update({ tone: v })} className="space-y-1.5">
              {TONE_OPTIONS.map(o => (
                <label key={o.value} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                  data.tone === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}>
                  <RadioGroupItem value={o.value} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{o.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {o.desc}</span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Verbosity */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Verbosity</Label>
            <RadioGroup value={data.verbosity} onValueChange={v => update({ verbosity: v })} className="space-y-1.5">
              {VERBOSITY_OPTIONS.map(o => (
                <label key={o.value} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                  data.verbosity === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}>
                  <RadioGroupItem value={o.value} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{o.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {o.desc}</span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Explanation Detail */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">How much reasoning should Klyc show?</Label>
            <div className="px-1">
              <Slider
                value={[data.explanation_detail]}
                onValueChange={([v]) => update({ explanation_detail: v })}
                min={0} max={10} step={1}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">Just decide</span>
                <span className="text-[10px] text-muted-foreground font-mono">{data.explanation_detail}</span>
                <span className="text-[10px] text-muted-foreground">Show everything</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Decision-Making Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Decision-Making Mode
          </CardTitle>
          <CardDescription>How Klyc handles decisions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Default Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Default Mode</Label>
            <RadioGroup value={data.default_mode} onValueChange={v => update({ default_mode: v })} className="space-y-1.5">
              {MODE_OPTIONS.map(o => (
                <label key={o.value} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                  data.default_mode === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}>
                  <RadioGroupItem value={o.value} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{o.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {o.desc}</span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Confidence Threshold (only for hybrid) */}
          {data.default_mode === "hybrid" && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-xs font-medium">How confident should Klyc be before acting alone?</Label>
              <div className="px-1">
                <Slider
                  value={[data.confidence_threshold]}
                  onValueChange={([v]) => update({ confidence_threshold: v })}
                  min={0} max={100} step={5}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Ask often</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{data.confidence_threshold}%</span>
                  <span className="text-[10px] text-muted-foreground">Act freely</span>
                </div>
              </div>
            </div>
          )}

          {/* Approval Rule */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Approval Rule</Label>
            <Select value={data.approval_rule} onValueChange={v => update({ approval_rule: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPROVAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Toggle */}
      <Button
        variant="ghost"
        className="w-full justify-between text-sm text-muted-foreground"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        Advanced Settings
        <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
      </Button>

      {showAdvanced && (
        <div className="space-y-6 animate-fade-in">
          {/* Section 3: Context & Industry */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Context & Industry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Your Industry</Label>
                <div className="flex flex-wrap gap-1.5">
                  {INDUSTRY_OPTIONS.map(ind => {
                    const selected = data.industry.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? data.industry.filter(i => i !== ind)
                            : [...data.industry, ind];
                          update({ industry: next });
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs border transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                        )}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Competitor Tracking</Label>
                  <p className="text-[10px] text-muted-foreground">Enable monitoring of competitor activity</p>
                </div>
                <Switch
                  checked={data.competitor_tracking}
                  onCheckedChange={v => update({ competitor_tracking: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notifications & Proactivity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Alert Style</Label>
                  <Select value={data.alert_style} onValueChange={v => update({ alert_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALERT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Check-in Frequency</Label>
                  <Select value={data.checkin_frequency} onValueChange={v => update({ checkin_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHECKIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Proactive Suggestions</Label>
                  <p className="text-[10px] text-muted-foreground">Klyc can proactively suggest actions</p>
                </div>
                <Switch
                  checked={data.proactive_suggestions}
                  onCheckedChange={v => update({ proactive_suggestions: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Learning & Transparency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Learning & Transparency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Show Reasoning</Label>
                <div className="px-1">
                  <Slider
                    value={[data.show_reasoning]}
                    onValueChange={([v]) => update({ show_reasoning: v })}
                    min={0} max={10} step={1}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Minimal</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{data.show_reasoning}</span>
                    <span className="text-[10px] text-muted-foreground">Maximum</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Adaptation Level</Label>
                <Select value={data.adaptation_level} onValueChange={v => update({ adaptation_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADAPTATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Reset Learning Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Learning Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all learned preferences and patterns. Klyc will start fresh.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetLearning} className="bg-destructive text-destructive-foreground">
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Section 6: Export & Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Export & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Settings (JSON)
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                    Delete All Personality Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your personality settings and reset to defaults. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground">
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
