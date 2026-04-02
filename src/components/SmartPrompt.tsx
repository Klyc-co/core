import { useState } from "react";
import { Check, ArrowRight, Shield, AlertTriangle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── SmartPrompt ───────────────────────────────────────────────

export interface SmartPromptProps {
  question: string;
  options: [string, string, string];
  fillInLabel?: string;
  onSelect: (choice: string) => void;
  isLoading?: boolean;
}

export const SmartPrompt = ({
  question,
  options,
  fillInLabel = "Something else",
  onSelect,
  isLoading = false,
}: SmartPromptProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const locked = selected !== null;

  const handleSelect = (choice: string) => {
    if (locked || isLoading) return;
    setSelected(choice);
    onSelect(choice);
  };

  const handleCustomSubmit = () => {
    if (!custom.trim() || locked || isLoading) return;
    handleSelect(custom.trim());
  };

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 space-y-3 transition-all duration-300",
      locked && "opacity-80"
    )}>
      <p className="text-sm font-medium text-foreground">{question}</p>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isChosen = selected === opt;
          return (
            <button
              key={i}
              disabled={locked || isLoading}
              onClick={() => handleSelect(opt)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-all duration-200",
                "border",
                isChosen
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/40 hover:bg-secondary/50 text-foreground",
                locked && !isChosen && "opacity-40 cursor-default"
              )}
            >
              <span className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                isChosen ? "border-primary bg-primary" : "border-muted-foreground/40"
              )}>
                {isChosen && <Check className="w-3 h-3 text-primary-foreground" />}
              </span>
              <span className="text-muted-foreground text-xs font-mono mr-1">({i + 1})</span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>

      {!locked && (
        <div className="flex items-center gap-2 pt-1">
          <span className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/40"
          )} />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{fillInLabel}:</span>
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="Type your idea…"
            disabled={isLoading}
            className="h-8 text-sm flex-1"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0"
            disabled={!custom.trim() || isLoading}
            onClick={handleCustomSubmit}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {locked && selected && !options.includes(selected) && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Check className="w-4 h-4" />
          <span className="italic">"{selected}"</span>
        </div>
      )}
    </div>
  );
};

// ─── ViralScoreCard ────────────────────────────────────────────

interface ViralScoreCardProps {
  campaignName: string;
  platform: string;
  headlineText: string;
  imageUrl?: string;
  scores: {
    hook: number;
    emotion: number;
    share: number;
    platform: number;
    audience: number;
    viral: number;
  };
  modelType: string;
  voiceType: string;
  thresholdStatus: "AMPLIFY" | "MONITOR" | "PAUSE" | "ARCHIVE";
  onSelect?: () => void;
  selected?: boolean;
}

const THRESHOLD_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  AMPLIFY: { bg: "bg-success/15", text: "text-success", label: "Amplify" },
  MONITOR: { bg: "bg-warning/15", text: "text-warning", label: "Monitor" },
  PAUSE: { bg: "bg-destructive/15", text: "text-destructive", label: "Pause" },
  ARCHIVE: { bg: "bg-muted", text: "text-muted-foreground", label: "Archive" },
};

const STAT_LABELS: { key: keyof Omit<ViralScoreCardProps["scores"], "viral">; label: string }[] = [
  { key: "hook", label: "Hook" },
  { key: "emotion", label: "Emotion" },
  { key: "share", label: "Shareability" },
  { key: "platform", label: "Platform Fit" },
  { key: "audience", label: "Audience" },
];

export const ViralScoreCard = ({
  campaignName,
  platform,
  headlineText,
  imageUrl,
  scores,
  modelType,
  voiceType,
  thresholdStatus,
  onSelect,
  selected = false,
}: ViralScoreCardProps) => {
  const ts = THRESHOLD_STYLES[thresholdStatus];
  const viralPct = Math.round(scores.viral * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-4 transition-all duration-200",
        onSelect && "cursor-pointer hover:border-primary/50",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{campaignName}</p>
          <p className="text-sm font-medium text-foreground line-clamp-2 mt-0.5">{headlineText}</p>
        </div>
        <Badge className={cn("text-[10px] shrink-0", ts.bg, ts.text, "border-0")}>
          {ts.label}
        </Badge>
      </div>

      {imageUrl && (
        <img src={imageUrl} alt="" className="w-full h-28 object-cover rounded-lg mb-3" />
      )}

      {/* Viral score */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono",
          viralPct >= 80 ? "bg-success/15 text-success" :
          viralPct >= 60 ? "bg-warning/15 text-warning" :
          "bg-destructive/15 text-destructive"
        )}>
          <span className="text-lg font-bold leading-none">{viralPct}</span>
          <span className="text-[9px] uppercase tracking-wider">viral</span>
        </div>
        <div className="flex-1 space-y-1.5">
          {STAT_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16 truncate">{label}</span>
              <Progress value={scores[key] * 100} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">
                {Math.round(scores[key] * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{platform}</Badge>
        <span>{modelType}</span>
        <span>•</span>
        <span>{voiceType}</span>
      </div>

      {selected && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Check className="w-3 h-3" /> Selected
        </div>
      )}
    </button>
  );
};

// ─── ApprovalPrompt ────────────────────────────────────────────

interface ApprovalPromptProps {
  urgency: "BLOCKING" | "ADVISORY" | "INFORMATIONAL";
  category: string;
  proposedAction: string;
  originalRequest: string;
  isNonNegotiable: boolean;
  onApproveThisTime: () => void;
  onApproveAllTime?: () => void;
  onBlock: () => void;
}

const URGENCY_CONFIG: Record<string, { icon: typeof Shield; bg: string; text: string; label: string }> = {
  BLOCKING: { icon: Shield, bg: "bg-destructive/15", text: "text-destructive", label: "Blocking" },
  ADVISORY: { icon: AlertTriangle, bg: "bg-warning/15", text: "text-warning", label: "Advisory" },
  INFORMATIONAL: { icon: Info, bg: "bg-primary/15", text: "text-primary", label: "Info" },
};

const PERMANENT_GATES = ["PUBLISH", "SCHEDULE", "BUDGET", "NEW_PLATFORM"];

export const ApprovalPrompt = ({
  urgency,
  category,
  proposedAction,
  originalRequest,
  isNonNegotiable,
  onApproveThisTime,
  onApproveAllTime,
  onBlock,
}: ApprovalPromptProps) => {
  const [decided, setDecided] = useState<string | null>(null);
  const uc = URGENCY_CONFIG[urgency];
  const Icon = uc.icon;
  const isPermanentGate = PERMANENT_GATES.includes(category);
  const showAllTime = !isPermanentGate && !isNonNegotiable && !!onApproveAllTime;

  const handle = (decision: string, fn: () => void) => {
    if (decided) return;
    setDecided(decision);
    fn();
  };

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 space-y-3 transition-all duration-300",
      decided && "opacity-80"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg", uc.bg)}>
          <Icon className={cn("w-4 h-4", uc.text)} />
        </div>
        <span className="text-sm font-medium text-foreground">Approval Required</span>
        <Badge className={cn("text-[10px] ml-auto border-0", uc.bg, uc.text)}>{uc.label}</Badge>
        <Badge variant="outline" className="text-[10px]">{category}</Badge>
      </div>

      {/* Context */}
      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">Proposed: </span>
          {proposedAction}
        </p>
        <p className="text-muted-foreground text-xs">
          <span className="font-medium">Original request: </span>
          {originalRequest}
        </p>
      </div>

      {/* Actions */}
      {!decided ? (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs"
            onClick={() => handle("approved_this_time", onApproveThisTime)}
          >
            <Zap className="w-3 h-3 mr-1" />
            {isPermanentGate ? "Approve" : "Approve this time"}
          </Button>
          {showAllTime && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => handle("approved_all_time", onApproveAllTime!)}
            >
              Approve all time
            </Button>
          )}
          {!isNonNegotiable && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => handle("blocked", onBlock)}
            >
              Block
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs pt-1">
          <Check className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground capitalize">{decided.replace(/_/g, " ")}</span>
        </div>
      )}
    </div>
  );
};
