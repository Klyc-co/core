import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowPayload } from "@/types/workflow-payload";
import type { WorkflowReportEnvelope } from "@/types/run-status";
import { toast } from "sonner";

export interface WorkflowResult {
  envelope: WorkflowReportEnvelope;
  runTimestamp: string;
}

export type WorkflowState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "success"; result: WorkflowResult }
  | { phase: "partial"; result: Partial<WorkflowResult>; warning: string }
  | { phase: "error"; message: string };

export function useRunCampaign() {
  const [state, setState] = useState<WorkflowState>({ phase: "idle" });

  const execute = useCallback(async (payload: WorkflowPayload) => {
    setState({ phase: "running" });

    try {
      const { data, error } = await supabase.functions.invoke("run-campaign", {
        body: payload,
      });

      if (error) {
        const msg = error.message || "Workflow execution failed";
        setState({ phase: "error", message: msg });
        toast.error(msg);
        return null;
      }

      if (!data?.success) {
        const msg = data?.error || "Unknown workflow error";
        setState({ phase: "error", message: msg });
        toast.error(msg);
        return null;
      }

      const envelope: WorkflowReportEnvelope = data.envelope;
      const result: WorkflowResult = {
        envelope,
        runTimestamp: envelope?.runMetadata?.runTimestamp || new Date().toISOString(),
      };

      if (!envelope) {
        setState({
          phase: "partial",
          result,
          warning: "Workflow returned incomplete data",
        });
        toast.warning("Analysis completed with partial results");
        return result;
      }

      setState({ phase: "success", result });
      toast.success("Analysis complete");
      return result;
    } catch (err: any) {
      const msg = err?.message || "Network error during workflow execution";
      setState({ phase: "error", message: msg });
      toast.error(msg);
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return {
    state,
    execute,
    reset,
    isRunning: state.phase === "running",
    result: state.phase === "success" ? state.result : state.phase === "partial" ? (state.result as WorkflowResult) : null,
  };
}
