import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowPayload } from "@/types/workflow-payload";
import type { WorkflowReportEnvelope } from "@/types/run-status";
import { toast } from "sonner";
import type { RunHistoryEntry } from "@/components/command-center/RunHistorySelector";

export interface WorkflowResult {
  envelope: WorkflowReportEnvelope;
  runTimestamp: string;
  runId: string;
}

export type WorkflowState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "success"; result: WorkflowResult }
  | { phase: "partial"; result: Partial<WorkflowResult>; warning: string }
  | { phase: "error"; message: string };

const MAX_HISTORY = 10;

function generateRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useRunCampaign() {
  const [state, setState] = useState<WorkflowState>({ phase: "idle" });
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const historyRef = useRef<RunHistoryEntry[]>([]);

  const pushHistory = useCallback((entry: RunHistoryEntry) => {
    const next = [entry, ...historyRef.current.filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY);
    historyRef.current = next;
    setHistory(next);
  }, []);

  const execute = useCallback(async (payload: WorkflowPayload) => {
    setState({ phase: "running" });
    const runId = generateRunId();

    try {
      const { data, error } = await supabase.functions.invoke("run-campaign", {
        body: payload,
      });

      if (error) {
        const msg = error.message || "Workflow execution failed";
        setState({ phase: "error", message: msg });
        toast.error(msg);
        pushHistory({
          id: runId,
          timestamp: new Date().toISOString(),
          clientName: payload.client_name || "Unknown",
          status: "error",
          confidence: 0,
          result: { envelope: {} as WorkflowReportEnvelope, runTimestamp: new Date().toISOString(), runId },
        });
        return null;
      }

      if (!data?.success) {
        const msg = data?.error || "Unknown workflow error";
        setState({ phase: "error", message: msg });
        toast.error(msg);
        pushHistory({
          id: runId,
          timestamp: new Date().toISOString(),
          clientName: payload.client_name || "Unknown",
          status: "error",
          confidence: 0,
          result: { envelope: {} as WorkflowReportEnvelope, runTimestamp: new Date().toISOString(), runId },
        });
        return null;
      }

      const envelope: WorkflowReportEnvelope = data.envelope;
      const ts = envelope?.runMetadata?.runTimestamp || new Date().toISOString();
      const result: WorkflowResult = { envelope, runTimestamp: ts, runId };

      if (!envelope) {
        setState({ phase: "partial", result, warning: "Workflow returned incomplete data" });
        toast.warning("Analysis completed with partial results");
        pushHistory({
          id: runId,
          timestamp: ts,
          clientName: payload.client_name || "Unknown",
          status: "partial",
          confidence: 0,
          result: result as WorkflowResult,
        });
        return result;
      }

      setState({ phase: "success", result });
      toast.success("Analysis complete");
      pushHistory({
        id: runId,
        timestamp: ts,
        clientName: envelope.runMetadata?.clientName || payload.client_name || "Unknown",
        status: "complete",
        confidence: envelope.normalizationChecksum?.confidenceScore ?? 0,
        result,
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || "Network error during workflow execution";
      setState({ phase: "error", message: msg });
      toast.error(msg);
      pushHistory({
        id: runId,
        timestamp: new Date().toISOString(),
        clientName: payload.client_name || "Unknown",
        status: "error",
        confidence: 0,
        result: { envelope: {} as WorkflowReportEnvelope, runTimestamp: new Date().toISOString(), runId },
      });
      return null;
    }
  }, [pushHistory]);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return {
    state,
    execute,
    reset,
    history,
    isRunning: state.phase === "running",
    result: state.phase === "success" ? state.result : state.phase === "partial" ? (state.result as WorkflowResult) : null,
  };
}
