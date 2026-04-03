import { useState } from "react";
import { Check, ArrowRight, Lightbulb, Palette, Globe, Users, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// ─── Types ─────────────────────────────────────────────────────

export interface SmartPromptOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
  confidence?: number;
}

export interface SmartPromptCardProps {
  question: string;
  options: SmartPromptOption[];
  allowCustom?: boolean;
  customPlaceholder?: string;
  onSelect: (optionId: string | { custom: string }) => void;
  category?: "strategy" | "creative" | "platform" | "audience" | "approval";
  viralScore?: ViralScoreData;
  approvalData?: ApprovalGateData;
}

export interface ViralScoreData {
  score: number;
  components: {
    engagement: number;
    velocity: number;
    novelty: number;
    dwell: number;
    community_spread: number;
    emotional_energy: number;
  };
  recommendation: "AMPLIFY" | "MONITOR" | "PAUSE" | "ARCHIVE";
}

export interface ApprovalGateData {
  factual: number;
  brand: number;
  audience: number;
  quality: number;
  composite: number;
  decision: "approved" | "revision_requested" | "rejected";
  revisionNotes?: string;
  iteration: number;
}

// ─── Category Config ───────────────────────────────────────────

const CATEGORY_ICON: Record<string, typeof Lightbulb> = {
  strategy: Lightbulb,
  creative: Palette,
  platform: Globe,
  audience: Users,
  approval: ShieldCheck,
};

const CATEGORY_ACCENT: Record<string, string> = {
  strategy: "border-primary/50",
  creative: "border-accent/50",
  platform: "border-warning/50",
  audience: "border-success/50",
  approval: "border-destructive/50",
};

// ─── Viral Score Gauge ─────────────────────────────────────────

const ViralScoreGauge = ({ data }: { data: ViralScoreData }) => {
  const displayScore = (data.score * 10).toFixed(1);
  const pct = data.score * 100;
  const [expanded, setExpanded] = useState(false);

  const gaugeColor =
    data.score < 0.5 ? "text-destructive" :
    data.score < 0.75 ? "text-warning" :
    "text-success";

  const bgColor =
    data.score < 0.5 ? "bg-destructive/15" :
    data.score < 0.75 ? "bg-warning/15" :
    "bg-success/15";

  const REC_STYLES: Record<string, { bg: string; text: string }> = {
    AMPLIFY: { bg: "bg-success/15", text: "text-success" },
    MONITOR: { bg: "bg-warning/15", text: "text-warning" },
    PAUSE: { bg: "bg-destructive/15", text: "text-destructive" },
    ARCHIVE: { bg: "bg-muted", text: "text-muted-foreground" },
  };

  const rec = REC_STYLES[data.recommendation];

  const COMP_LABELS: { key: keyof typeof data.components; label: string }[] = [
    { key: "engagement", label: "Engagement" },
    { key: "velocity", label: "Velocity" },
    { key: "novelty", label: "Novelty" },
    { key: "dwell", label: "Dwell" },
    { key: "community_spread", label: "Spread" },
    { key: "emotional_energy", label: "Energy" },
  ];

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3"
      >
        {/* Circular gauge */}
        <div className={cn("relative w-14 h-14 rounded-full flex items-center justify-center", bgColor)}>
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="28" cy="28" r="24" fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${pct * 1.508} ${150.8 - pct * 1.508}`}
              className={gaugeColor}
              strokeLinecap="round"
            />
          </svg>
          <span className={cn("text-sm font-bold font-mono", gaugeColor)}>{displayScore}</span>
        </div>

        <div className="flex-1 text-left">
          <p className="text-xs font-medium text-foreground">Viral Score</p>
          <Badge className={cn("text-[10px] mt-0.5 border-0", rec.bg, rec.text)}>
            {data.recommendation}
          </Badge>
        </div>

        <TrendingUp className={cn("w-4 h-4 transition-transform", expanded && "rotate-180", "text-muted-foreground")} />
      </button>

      {expanded && (
        <div className="space-y-1.5 pt-1 animate-fade-in">
          {COMP_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14 truncate">{label}</span>
              <Progress value={data.components[key] * 100} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">
                {Math.round(data.components[key] * 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Approval Gate Display ─────────────────────────────────────

const ApprovalGateDisplay = ({
  data,
  onDecision,
  decided,
}: {
  data: ApprovalGateData;
  onDecision: (decision: string, notes?: string) => void;
  decided: string | null;
}) => {
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const GATES: { key: keyof Pick<ApprovalGateData, "factual" | "brand" | "audience" | "quality">; label: string; threshold: number }[] = [
    { key: "factual", label: "Factual Accuracy", threshold: 0.8 },
    { key: "brand", label: "Brand Alignment", threshold: 0.8 },
    { key: "audience", label: "Audience Fit", threshold: 0.7 },
    { key: "quality", label: "Quality Standards", threshold: 0.8 },
  ];

  const gateColor = (score: number, threshold: number) =>
    score >= threshold ? "text-success" :
    score >= 0.5 ? "text-warning" :
    "text-destructive";

  const gateBarColor = (score: number, threshold: number) =>
    score >= threshold ? "[&>div]:bg-success" :
    score >= 0.5 ? "[&>div]:bg-warning" :
    "[&>div]:bg-destructive";

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">Quality Gates</p>
        <Badge
          className={cn(
            "text-[10px] border-0",
            data.decision === "approved" ? "bg-success/15 text-success" :
            data.decision === "rejected" ? "bg-destructive/15 text-destructive" :
            "bg-warning/15 text-warning"
          )}
        >
          Composite: {Math.round(data.composite * 100)}
        </Badge>
      </div>

      <div className="space-y-1.5">
        {GATES.map(({ key, label, threshold }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-24 truncate">{label}</span>
            <Progress
              value={data[key] * 100}
              className={cn("h-1.5 flex-1", gateBarColor(data[key], threshold))}
            />
            <span className={cn("text-[10px] w-6 text-right font-mono", gateColor(data[key], threshold))}>
              {Math.round(data[key] * 100)}
            </span>
          </div>
        ))}
      </div>

      {data.revisionNotes && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 italic">
          {data.revisionNotes}
        </p>
      )}

      {!decided ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="success"
              className="h-8 text-xs"
              onClick={() => onDecision("approved")}
            >
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="warning"
              className="h-8 text-xs"
              onClick={() => setShowNotes(true)}
            >
              Request Revision
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={() => onDecision("rejected")}
            >
              Reject
            </Button>
          </div>
          {showNotes && (
            <div className="space-y-2 animate-fade-in">
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="What needs to change?"
                className="text-xs min-h-[60px]"
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!revisionNotes.trim()}
                onClick={() => onDecision("revision_requested", revisionNotes)}
              >
                Submit Revision Notes
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs">
          <Check className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground capitalize">{decided.replace(/_/g, " ")}</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Iteration {data.iteration}/3
      </p>
    </div>
  );
};

// ─── SmartPromptCard ───────────────────────────────────────────

export const SmartPromptCard = ({
  question,
  options,
  allowCustom = true,
  customPlaceholder = "Type your idea…",
  onSelect,
  category = "strategy",
  viralScore,
  approvalData,
}: SmartPromptCardProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [approvalDecision, setApprovalDecision] = useState<string | null>(null);
  const locked = selected !== null;

  const CategoryIcon = CATEGORY_ICON[category] || Lightbulb;
  const accentBorder = CATEGORY_ACCENT[category] || "";

  const handleSelect = (optionId: string) => {
    if (locked) return;
    setSelected(optionId);
    onSelect(optionId);
  };

  const handleCustomSubmit = () => {
    if (!custom.trim() || locked) return;
    setSelected("__custom__");
    onSelect({ custom: custom.trim() });
  };

  const handleApprovalDecision = (decision: string, notes?: string) => {
    setApprovalDecision(decision);
    onSelect(decision);
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-3 transition-all duration-300 shadow-sm",
      locked ? "opacity-80 border-border" : accentBorder,
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-secondary">
          <CategoryIcon className="w-4 h-4 text-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground flex-1">{question}</p>
        <Badge variant="outline" className="text-[10px] capitalize">{category}</Badge>
      </div>

      {/* Viral Score (if provided) */}
      {viralScore && <ViralScoreGauge data={viralScore} />}

      {/* Approval Gate (if approval category) */}
      {category === "approval" && approvalData && (
        <ApprovalGateDisplay
          data={approvalData}
          onDecision={handleApprovalDecision}
          decided={approvalDecision}
        />
      )}

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isChosen = selected === opt.id;
          return (
            <button
              key={opt.id}
              disabled={locked}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 border",
                isChosen
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40 hover:bg-secondary/50",
                locked && !isChosen && "opacity-40 cursor-default"
              )}
            >
              {/* Radio circle */}
              <span className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                isChosen ? "border-primary bg-primary" : "border-muted-foreground/40"
              )}>
                {isChosen && <Check className="w-3 h-3 text-primary-foreground" />}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[10px] font-mono">({i + 1})</span>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  {opt.confidence !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {Math.round(opt.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      {allowCustom && !locked && (
        <div className="flex items-center gap-2 pt-1">
          <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">(4)</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">Something else:</span>
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder={customPlaceholder}
            className="h-8 text-sm flex-1"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0"
            disabled={!custom.trim()}
            onClick={handleCustomSubmit}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Custom selection confirmation */}
      {locked && selected === "__custom__" && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Check className="w-4 h-4" />
          <span className="italic">"{custom}"</span>
        </div>
      )}
    </div>
  );
};

export default SmartPromptCard;
