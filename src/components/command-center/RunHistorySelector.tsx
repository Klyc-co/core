import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { WorkflowReportEnvelope } from "@/types/run-status";
import type { WorkflowResult } from "@/hooks/use-run-campaign";

export interface RunHistoryEntry {
  id: string;
  timestamp: string;
  clientName: string;
  status: "complete" | "error" | "partial";
  confidence: number;
  result: WorkflowResult;
}

interface RunHistorySelectorProps {
  entries: RunHistoryEntry[];
  activeRunId: string | null;
  onSelect: (entry: RunHistoryEntry) => void;
}

const statusConfig = {
  complete: { icon: CheckCircle2, label: "Success", className: "text-emerald-500" },
  partial: { icon: AlertTriangle, label: "Partial", className: "text-yellow-500" },
  error: { icon: XCircle, label: "Error", className: "text-destructive" },
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

const RunHistorySelector = ({ entries, activeRunId, onSelect }: RunHistorySelectorProps) => {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">No runs yet</span>
        </div>
      </div>
    );
  }

  const visibleEntries = expanded ? entries : entries.slice(0, 2);

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Recent Runs</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{entries.length}</Badge>
        </div>
        {entries.length > 2 && (
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>

      <div className="divide-y divide-border/30">
        {visibleEntries.map((entry) => {
          const cfg = statusConfig[entry.status];
          const StatusIcon = cfg.icon;
          const isActive = entry.id === activeRunId;

          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${cfg.className}`} />
                  <span className="text-xs font-medium text-foreground truncate">{entry.clientName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.status !== "error" && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                      {entry.confidence}%
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                {entry.id.slice(0, 8)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RunHistorySelector;
