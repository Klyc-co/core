import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Clock, Hash, ShieldCheck, ShieldAlert, AlertTriangle,
  RefreshCw, Search, Package, Brain, BarChart3, ArrowRight,
} from "lucide-react";
import type { RunStatusData, RunStatusVerdict } from "@/types/run-status";

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

// ── Stat cell ──

const Stat = ({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) => (
  <div className="flex flex-col items-center justify-center rounded-md border border-border/40 bg-background/50 px-2 py-2 min-w-0">
    <span className={`text-lg font-semibold font-mono leading-none ${alert ? "text-destructive" : "text-foreground"}`}>
      {value}
    </span>
    <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">{label}</span>
  </div>
);

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

// ── Thin progress bar ──

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

// ── Main component ──

interface Props {
  data: RunStatusData;
}

export default function RunStatusPanel({ data }: Props) {
  const verdict = VERDICT_CONFIG[data.verdict];
  const isIdle = data.status === "idle";

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Activity className="w-4 h-4 text-primary" />
            Run Status
          </span>
          <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${verdict.className}`}>
            {verdict.icon}
            {verdict.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verdict reason */}
        <p className={`text-xs px-2.5 py-1.5 rounded-md border ${verdict.className}`}>
          {data.verdictReason}
        </p>

        {/* Run metadata */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Run Metadata</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <MetaRow label="Client" value={data.clientName} />
            <MetaRow label="Client ID" value={data.clientId ? `${data.clientId.slice(0, 8)}…` : "—"} mono />
            <MetaRow label="Timestamp" value={data.runTimestamp ? new Date(data.runTimestamp).toLocaleString() : "—"} />
            <MetaRow label="Workflow" value={data.workflowVersion} mono />
            <MetaRow label="Status" value={data.status} />
          </div>
        </div>

        {/* Checksum grid */}
        {!isIdle && (
          <>
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Normalization Checksum</span>
              <div className="space-y-1.5">
                <MiniBar value={data.contextCoverage} label="Context Coverage" />
                <MiniBar value={data.confidenceScore} label="Confidence" />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                <Stat label="Missing" value={data.missingInputsCount} alert={data.missingInputsCount > 0} />
                <Stat label="Warnings" value={data.warningsCount} alert={data.warningsCount > 0} />
                <Stat label="Sources" value={data.sourceCount} />
                <Stat label="Notes" value={data.compressionNotesCount} />
              </div>
            </div>

            {/* Next actions */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Next Actions</span>
              <div className="divide-y divide-border/30">
                <ActionFlag label="Research" active={data.requiresResearch} />
                <ActionFlag label="Product Positioning" active={data.requiresProductPositioning} />
                <ActionFlag label="Narrative Simulation" active={data.requiresNarrativeSimulation} />
                <ActionFlag label="Platform Evaluation" active={data.requiresPlatformEvaluation} />
              </div>
              {data.recommendedNextUpdate && (
                <p className="text-[11px] text-muted-foreground italic pt-1">
                  ↳ {data.recommendedNextUpdate}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground truncate ${mono ? "font-mono" : ""}`} title={value}>{value}</span>
    </>
  );
}
