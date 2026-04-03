import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Network, ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw,
  ArrowRight, Ban, CheckCircle2, Loader2, FlaskConical, Layers,
  MessageSquare, BarChart3, Search,
} from "lucide-react";
import type { OrchestrationSummary, RunStatusVerdict } from "@/types/run-status";

interface Props {
  data: OrchestrationSummary;
  isRunning?: boolean;
  isIdle?: boolean;
}

const VERDICT_STYLE: Record<RunStatusVerdict, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  ready: { bg: "bg-primary/5", border: "border-primary/30", text: "text-primary", icon: <ShieldCheck className="w-4 h-4" /> },
  blocked: { bg: "bg-destructive/5", border: "border-destructive/30", text: "text-destructive", icon: <ShieldAlert className="w-4 h-4" /> },
  low_confidence: { bg: "bg-yellow-500/5", border: "border-yellow-500/30", text: "text-yellow-600", icon: <AlertTriangle className="w-4 h-4" /> },
  needs_refresh: { bg: "bg-yellow-500/5", border: "border-yellow-500/30", text: "text-yellow-600", icon: <RefreshCw className="w-4 h-4" /> },
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  executing: "Executing",
  complete: "Complete",
  blocked: "Blocked",
  partial: "Partial Run",
};

const PIPELINE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  Normalizer: { icon: <Layers className="w-3.5 h-3.5" />, label: "Normalizer" },
  "Context Enricher": { icon: <Search className="w-3.5 h-3.5" />, label: "Context Enricher" },
  "Signal Extractor": { icon: <FlaskConical className="w-3.5 h-3.5" />, label: "Signal Extractor" },
  "Confidence Scorer": { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Confidence Scorer" },
  "Platform Evaluator": { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Platform Evaluator" },
  "Narrative Simulation": { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Narrative Simulation" },
  "Product Positioning": { icon: <Layers className="w-3.5 h-3.5" />, label: "Product Positioning" },
  "Research Agent": { icon: <Search className="w-3.5 h-3.5" />, label: "Research Submind" },
  "Orchestration Planner": { icon: <Network className="w-3.5 h-3.5" />, label: "Klyc Planner" },
};

const CAPABILITY_FLAGS = [
  { key: "requiresResearch" as const, label: "Competitive Research", icon: <Search className="w-3.5 h-3.5" /> },
  { key: "requiresProductPositioning" as const, label: "Product Positioning", icon: <Layers className="w-3.5 h-3.5" /> },
  { key: "requiresNarrativeSimulation" as const, label: "Narrative Simulation", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: "requiresPlatformEvaluation" as const, label: "Platform Evaluation", icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

export default function OrchestrationVisibilityPanel({ data, isRunning, isIdle }: Props) {
  const v = VERDICT_STYLE[data.verdict];
  const status = data.orchestrationStatus || "planned";
  const isBlocked = data.verdict === "blocked";
  const isPartial = status === "partial";

  if (isIdle) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Network className="w-4 h-4 text-primary" />
            Klyc Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Network className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Run an analysis to see Klyc decisions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border/60 bg-card/80 backdrop-blur-sm ${isBlocked ? "ring-1 ring-destructive/20" : isPartial ? "ring-1 ring-yellow-500/20" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Network className="w-4 h-4 text-primary" />
            Orchestration Decisions
          </span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] h-5 gap-1 capitalize ${
              status === "complete" ? "border-primary/30 text-primary bg-primary/5" :
              status === "blocked" ? "border-destructive/30 text-destructive bg-destructive/5" :
              status === "partial" ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5" :
              "border-border text-muted-foreground"
            }`}>
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isRunning ? "Executing…" : STATUS_LABEL[status] || status}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verdict banner */}
        <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${v.border} ${v.bg}`}>
          <span className={`mt-0.5 shrink-0 ${v.text}`}>{v.icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${v.text}`}>
              {data.verdict === "ready" ? "Ready for Orchestration" :
               data.verdict === "blocked" ? "Orchestration Blocked" :
               data.verdict === "low_confidence" ? "Low Confidence — Proceed with Caution" :
               "Data Refresh Recommended"}
            </p>
            <p className={`text-xs mt-0.5 ${v.text} opacity-80`}>{data.verdictReason}</p>
          </div>
        </div>

        {/* Blocked reasons */}
        {data.blockedReasons.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs font-semibold text-destructive">Blocking Issues</span>
            </div>
            {data.blockedReasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 pl-5">
                <span className="text-xs text-destructive/80 leading-relaxed">• {reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Partial run notice */}
        {data.partialRunAllowed && isBlocked && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-700">
              Partial execution is available — the orchestrator can proceed with reduced scope while blocked inputs are resolved.
            </p>
          </div>
        )}

        {/* Execution Order */}
        {data.executionOrder && data.executionOrder.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Execution Pipeline</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {data.executionOrder.map((step, i) => {
                const meta = PIPELINE_META[step] || { icon: <ArrowRight className="w-3.5 h-3.5" />, label: step };
                return (
                  <div key={step} className="flex items-center gap-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/50 bg-background/60 text-xs text-foreground">
                      <span className="text-primary">{meta.icon}</span>
                      {meta.label}
                    </div>
                    {i < data.executionOrder.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Capability flags */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Agent Capabilities Required</span>
          <div className="grid grid-cols-2 gap-2">
            {CAPABILITY_FLAGS.map(({ key, label, icon }) => {
              const active = data[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors ${
                    active
                      ? "border-primary/25 bg-primary/5"
                      : "border-border/30 bg-muted/20 opacity-50"
                  }`}
                >
                  <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium leading-tight ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{active ? "Active" : "Not needed"}</p>
                  </div>
                  {active && <CheckCircle2 className="w-3 h-3 text-primary ml-auto shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Complexity */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-md border border-border/40 bg-background/50">
          <span className="text-xs text-muted-foreground">Estimated Complexity</span>
          <Badge
            variant="outline"
            className={`text-[10px] h-5 capitalize ${
              data.estimatedComplexity === "high"
                ? "border-destructive/30 text-destructive bg-destructive/5"
                : data.estimatedComplexity === "medium"
                  ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
                  : "border-primary/30 text-primary bg-primary/5"
            }`}
          >
            {data.estimatedComplexity}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
