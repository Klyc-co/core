import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Loader2, Clock, AlertTriangle, SkipForward, XCircle,
  Filter, Network, Search, Package, MessageSquare, Share2, Image,
  Pen, ShieldCheck, BarChart3,
} from "lucide-react";
import type { SubmindStep } from "@/types/run-status";

const PIPELINE_STAGES = [
  "Normalizer",
  "Klyc",
  "Research",
  "Product",
  "Narrative",
  "Social",
  "Image",
  "EditorPublisher",
  "Approval",
  "Analytics",
] as const;

const STAGE_ICONS: Record<string, React.ReactNode> = {
  Normalizer: <Filter className="w-4 h-4" />,
  Klyc: <Network className="w-4 h-4" />,
  Research: <Search className="w-4 h-4" />,
  Product: <Package className="w-4 h-4" />,
  Narrative: <MessageSquare className="w-4 h-4" />,
  Social: <Share2 className="w-4 h-4" />,
  Image: <Image className="w-4 h-4" />,
  EditorPublisher: <Pen className="w-4 h-4" />,
  Approval: <ShieldCheck className="w-4 h-4" />,
  Analytics: <BarChart3 className="w-4 h-4" />,
};

const STATUS_CONFIG: Record<SubmindStep["status"], { icon: React.ReactNode; label: string; badgeClass: string; rowClass: string }> = {
  complete: {
    icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
    label: "Complete",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    rowClass: "border-primary/15 bg-primary/[0.02]",
  },
  running: {
    icon: <Loader2 className="w-4 h-4 text-accent animate-spin" />,
    label: "Running",
    badgeClass: "bg-accent/10 text-accent border-accent/20",
    rowClass: "border-accent/20 bg-accent/[0.03]",
  },
  pending: {
    icon: <Clock className="w-4 h-4 text-muted-foreground" />,
    label: "Pending",
    badgeClass: "bg-muted text-muted-foreground border-border",
    rowClass: "border-border bg-muted/30",
  },
  skipped: {
    icon: <SkipForward className="w-4 h-4 text-muted-foreground/60" />,
    label: "Skipped",
    badgeClass: "bg-muted/50 text-muted-foreground/60 border-border/50",
    rowClass: "border-border/50 bg-muted/10 opacity-60",
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-destructive" />,
    label: "Error",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    rowClass: "border-destructive/15 bg-destructive/[0.03]",
  },
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatConfidence(score: number | null): string {
  if (score === null) return "—";
  return `${score}%`;
}

interface Props {
  steps: SubmindStep[];
  isRunning?: boolean;
}

export default function CampaignTimeline({ steps, isRunning }: Props) {
  const stageMap = new Map(steps.map((s) => [s.submind, s]));

  const stages = PIPELINE_STAGES.map((name) => {
    const step = stageMap.get(name);
    return {
      name,
      status: step?.status ?? "pending" as SubmindStep["status"],
      durationMs: step?.durationMs ?? null,
      confidenceScore: step?.confidenceScore ?? null,
      note: step?.note ?? null,
    };
  });

  const completed = stages.filter((s) => s.status === "complete").length;
  const total = stages.length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            Campaign Pipeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 border-accent/30 text-accent">
                <Loader2 className="w-3 h-3 animate-spin" />
                Executing
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] h-5 font-mono">
              {completed}/{total}
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-1.5">
        {stages.map((stage, i) => {
          const config = STATUS_CONFIG[stage.status];
          return (
            <div
              key={stage.name}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${config.rowClass}`}
            >
              {/* Connector dot */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                  {STAGE_ICONS[stage.name]}
                </div>
                {i < stages.length - 1 && (
                  <div className="w-px h-2 bg-border" />
                )}
              </div>

              {/* Name */}
              <span className="text-xs font-medium text-foreground min-w-[100px]">
                {stage.name}
              </span>

              {/* Status badge */}
              <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${config.badgeClass}`}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Duration */}
              <span className="text-[10px] font-mono text-muted-foreground w-14 text-right">
                {formatDuration(stage.durationMs)}
              </span>

              {/* Confidence */}
              <span
                className={`text-[10px] font-mono w-10 text-right ${
                  stage.confidenceScore !== null && stage.confidenceScore >= 80
                    ? "text-primary"
                    : stage.confidenceScore !== null && stage.confidenceScore < 50
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {formatConfidence(stage.confidenceScore)}
              </span>
            </div>
          );
        })}

        {stages.some((s) => s.note) && (
          <div className="pt-2 space-y-1">
            {stages
              .filter((s) => s.note)
              .map((s) => (
                <div key={s.name} className="flex items-start gap-2 px-3 py-1.5 rounded bg-muted/40">
                  <AlertTriangle className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    <span className="font-medium">{s.name}:</span> {s.note}
                  </span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
