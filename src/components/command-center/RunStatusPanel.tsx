import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Activity, Clock, ShieldCheck, ShieldAlert, AlertTriangle,
  RefreshCw, ArrowRight, ChevronDown, Bot, CheckCircle2,
  XCircle, SkipForward, Loader2, Gauge,
} from "lucide-react";
import type {
  WorkflowReportEnvelope,
  RunStatusVerdict,
  AgentStep,
} from "@/types/run-status";
import { useState } from "react";

// ── Verdict visuals ──

const VERDICT_CONFIG: Record<RunStatusVerdict, { label: string; className: string; icon: React.ReactNode }> = {
  ready: {
    label: "Ready for Orchestration",
    className: "border-primary/30 text-primary bg-primary/5",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  blocked: {
    label: "Blocked",
    className: "border-destructive/30 text-destructive bg-destructive/5",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
  low_confidence: {
    label: "Low Confidence",
    className: "border-yellow-500/30 text-yellow-600 bg-yellow-500/5",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  needs_refresh: {
    label: "Needs Refresh",
    className: "border-yellow-500/30 text-yellow-600 bg-yellow-500/5",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
};

// ── Micro components ──

const Stat = ({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) => (
  <div className="flex flex-col items-center justify-center rounded-md border border-border/40 bg-background/50 px-2 py-2 min-w-0">
    <span className={`text-lg font-semibold font-mono leading-none ${alert ? "text-destructive" : "text-foreground"}`}>
      {value}
    </span>
    <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">{label}</span>
  </div>
);

const MiniBar = ({ value, label }: { value: number; label: string }) => {
  const color = value >= 70 ? "bg-primary" : value >= 40 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-foreground">{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const ActionFlag = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    {active ? (
      <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary bg-primary/5 gap-1">
        <ArrowRight className="w-2.5 h-2.5" /> Required
      </Badge>
    ) : (
      <span className="text-[10px] text-muted-foreground">—</span>
    )}
  </div>
);

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground truncate ${mono ? "font-mono" : ""}`} title={value}>{value}</span>
    </>
  );
}

const AGENT_STATUS_ICON: Record<AgentStep["status"], React.ReactNode> = {
  complete: <CheckCircle2 className="w-3 h-3 text-primary" />,
  running: <Loader2 className="w-3 h-3 text-primary animate-spin" />,
  pending: <Clock className="w-3 h-3 text-muted-foreground" />,
  skipped: <SkipForward className="w-3 h-3 text-muted-foreground" />,
  error: <XCircle className="w-3 h-3 text-destructive" />,
};

// ── Collapsible section wrapper ──

const Section = ({ title, icon, defaultOpen, children }: {
  title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2.5 py-2 rounded-md border border-border/40 bg-background/50 hover:bg-muted/40 transition-colors">
        <span className="flex items-center gap-2 text-[11px] font-medium text-foreground uppercase tracking-wider">
          {icon}
          {title}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ── Main component ──

interface Props {
  data: WorkflowReportEnvelope;
}

export default function RunStatusPanel({ data }: Props) {
  const { runMetadata: meta, normalizationChecksum: checksum, orchestrationSummary: orch, agentExecutionSummary: agents, nextActions } = data;
  const verdict = VERDICT_CONFIG[orch.verdict];
  const isIdle = meta.status === "idle";
  const isRunning = meta.status === "running";

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Activity className="w-4 h-4 text-primary" />
            Run Status
          </span>
          <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${isRunning ? "border-primary/30 text-primary bg-primary/5 animate-pulse" : verdict.className}`}>
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : verdict.icon}
            {isRunning ? "Running…" : verdict.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verdict reason */}
        <p className={`text-xs px-2.5 py-1.5 rounded-md border ${isRunning ? "border-primary/20 text-primary bg-primary/5" : verdict.className}`}>
          {isRunning ? "Workflow is executing…" : orch.verdictReason}
        </p>

        {/* ── Run Metadata ── */}
        <Section title="Run Metadata" icon={<Clock className="w-3 h-3 text-primary" />} defaultOpen={!isIdle}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <MetaRow label="Client" value={meta.clientName} />
            <MetaRow label="Client ID" value={meta.clientId ? `${meta.clientId.slice(0, 8)}…` : "—"} mono />
            <MetaRow label="Timestamp" value={meta.runTimestamp ? new Date(meta.runTimestamp).toLocaleString() : "—"} />
            <MetaRow label="Workflow" value={meta.workflowVersion} mono />
            <MetaRow label="Status" value={meta.status} />
            {meta.durationMs != null && (
              <MetaRow label="Duration" value={`${meta.durationMs}ms`} mono />
            )}
          </div>
        </Section>

        {/* ── Normalization Checksum ── */}
        {!isIdle && (
          <Section title="Normalization Checksum" icon={<Gauge className="w-3 h-3 text-primary" />} defaultOpen>
            <div className="space-y-1.5">
              <MiniBar value={checksum.contextCoverage} label="Context Coverage" />
              <MiniBar value={checksum.confidenceScore} label="Confidence" />
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <Stat label="Missing" value={checksum.missingInputsCount} alert={checksum.missingInputsCount > 0} />
              <Stat label="Warnings" value={checksum.warningsCount} alert={checksum.warningsCount > 0} />
              <Stat label="Sources" value={checksum.sourceCount} />
              <Stat label="Notes" value={checksum.compressionNotesCount} />
            </div>
          </Section>
        )}

        {/* ── Orchestration Summary ── */}
        {!isIdle && (
          <Section title="Orchestration" icon={<ShieldCheck className="w-3 h-3 text-primary" />}>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Complexity</span>
              <Badge
                variant="outline"
                className={`text-[10px] h-5 capitalize ${
                  orch.estimatedComplexity === "high"
                    ? "border-destructive/30 text-destructive bg-destructive/5"
                    : orch.estimatedComplexity === "medium"
                      ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
                      : "border-primary/30 text-primary bg-primary/5"
                }`}
              >
                {orch.estimatedComplexity}
              </Badge>
            </div>
            <div className="divide-y divide-border/30">
              <ActionFlag label="Research" active={orch.requiresResearch} />
              <ActionFlag label="Product Positioning" active={orch.requiresProductPositioning} />
              <ActionFlag label="Narrative Simulation" active={orch.requiresNarrativeSimulation} />
              <ActionFlag label="Platform Evaluation" active={orch.requiresPlatformEvaluation} />
            </div>
            {orch.blockedReasons.length > 0 && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 space-y-1">
                <span className="text-[10px] font-medium text-destructive uppercase tracking-wider">Blocked By</span>
                {orch.blockedReasons.map((r, i) => (
                  <p key={i} className="text-xs text-destructive/80 pl-3">• {r}</p>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Agent Execution Summary ── */}
        {!isIdle && agents.totalAgents > 0 && (
          <Section title="Agent Progress" icon={<Bot className="w-3 h-3 text-primary" />}>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Total" value={agents.totalAgents} />
              <Stat label="Done" value={agents.completedAgents} />
              <Stat label="Skipped" value={agents.skippedAgents} />
              <Stat label="Errors" value={agents.errorAgents} alert={agents.errorAgents > 0} />
            </div>
            {agents.steps.length > 0 && (
              <div className="space-y-1 pt-1">
                {agents.steps.map((step, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <span className="flex items-center gap-1.5 text-xs text-foreground">
                      {AGENT_STATUS_ICON[step.status]}
                      {step.agent}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {step.durationMs != null ? `${step.durationMs}ms` : step.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Next Actions ── */}
        {!isIdle && (nextActions.recommended.length > 0 || nextActions.optional.length > 0) && (
          <Section title="Next Actions" icon={<ArrowRight className="w-3 h-3 text-primary" />}>
            {nextActions.recommended.map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary bg-primary/5 shrink-0">Required</Badge>
                <span className="text-xs text-foreground">{a}</span>
              </div>
            ))}
            {nextActions.optional.map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground shrink-0">Optional</Badge>
                <span className="text-xs text-muted-foreground">{a}</span>
              </div>
            ))}
            {nextActions.recommendedNextUpdate && (
              <p className="text-[11px] text-muted-foreground italic pt-1">
                ↳ {nextActions.recommendedNextUpdate}
              </p>
            )}
          </Section>
        )}
      </CardContent>
    </Card>
  );
}
