import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, AlertCircle } from "lucide-react";
import CustomerDNACard from "@/components/strategy-intelligence/CustomerDNACard";
import NarrativeSimulationArena from "@/components/strategy-intelligence/NarrativeSimulationArena";
import PlatformBattleView from "@/components/strategy-intelligence/PlatformBattleView";
import StrategyReasoningPanel from "@/components/strategy-intelligence/StrategyReasoningPanel";
import RunStatusPanel from "@/components/command-center/RunStatusPanel";
import NormalizerReportPanel from "@/components/command-center/NormalizerReportPanel";
import OrchestrationVisibilityPanel from "@/components/command-center/OrchestrationVisibilityPanel";
import CampaignTimeline from "@/components/command-center/CampaignTimeline";
import StrategyPanel from "@/components/command-center/StrategyPanel";
import StrategyExplanation from "@/components/command-center/StrategyExplanation";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrentClient } from "@/hooks/use-current-client";
import { useRunCampaign } from "@/hooks/use-run-campaign";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type { WorkflowPayload } from "@/types/workflow-payload";
import { isPayloadReady } from "@/types/workflow-payload";
import { idleEnvelope, type WorkflowReportEnvelope } from "@/types/run-status";
import RunHistorySelector, { type RunHistoryEntry } from "@/components/command-center/RunHistorySelector";
import { toast } from "sonner";

const StrategyIntelligence = () => {
  const navigate = useNavigate();
  const { currentClientId, currentClientName } = useCurrentClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextPayload, setContextPayload] = useState<Partial<WorkflowPayload>>({});
  const [envelope, setEnvelope] = useState<WorkflowReportEnvelope | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { execute, isRunning, state: workflowState, history } = useRunCampaign();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const clientId = currentClientId || user.id;
    const loadContext = async () => {
      try {
        const { data } = await supabase
          .from("client_brain")
          .select("data, document_type")
          .eq("client_id", clientId)
          .limit(10);
        const find = (type: string) => {
          const doc = data?.find((d) => d.document_type === type);
          return doc ? JSON.stringify(doc.data).slice(0, 300) : null;
        };
        setContextPayload({
          client_id: clientId,
          client_name: currentClientName || "Default",
          compressed_customer_dna: find("brand"),
          prior_strategy_summary: find("strategy"),
          prior_campaign_summary: find("campaign_history"),
          website_summary: find("website"),
          product_summary: find("product"),
          regulatory_summary: find("regulatory"),
          competitor_summary: find("competitor"),
        });
      } catch { /* optional */ }
    };
    loadContext();
  }, [user, currentClientId, currentClientName]);

  const handleRerun = async () => {
    const payload: WorkflowPayload = {
      input_as_text: "Strategy intelligence simulation run",
      client_id: contextPayload.client_id || currentClientId || user?.id || "",
      client_name: contextPayload.client_name || currentClientName || "Default",
      compressed_customer_dna: contextPayload.compressed_customer_dna || null,
      prior_strategy_summary: contextPayload.prior_strategy_summary || null,
      prior_campaign_summary: contextPayload.prior_campaign_summary || null,
      website_summary: contextPayload.website_summary || null,
      product_summary: contextPayload.product_summary || null,
      regulatory_summary: contextPayload.regulatory_summary || null,
      competitor_summary: contextPayload.competitor_summary || null,
    };
    if (!isPayloadReady(payload)) {
      toast.error("Select a client before running simulation");
      return;
    }
    const result = await execute(payload);
    if (result) {
      setEnvelope(result.envelope);
      setActiveRunId(result.runId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const clientId = currentClientId || user?.id || "";
  const clientName = currentClientName || "Default";
  let displayEnvelope: WorkflowReportEnvelope = envelope || idleEnvelope(clientId, clientName);
  if (isRunning) {
    displayEnvelope = { ...displayEnvelope, runMetadata: { ...displayEnvelope.runMetadata, status: "running" } };
  } else if (workflowState.phase === "error") {
    displayEnvelope = {
      ...displayEnvelope,
      runMetadata: { ...displayEnvelope.runMetadata, status: "error" },
      orchestrationSummary: { ...displayEnvelope.orchestrationSummary, verdict: "blocked", verdictReason: workflowState.message },
    };
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Strategy Intelligence</h1>
              <p className="text-xs text-muted-foreground">
                AI narrative simulation & platform strategy
                {currentClientName && <Badge variant="outline" className="ml-2 text-[10px] h-4">{currentClientName}</Badge>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono hidden sm:flex">
              Compression: {contextPayload.compressed_customer_dna ? "Active" : "Idle"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={isRunning}>
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              {isRunning ? "Running…" : "Re-simulate"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {workflowState.phase === "error" && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Workflow Error</p>
              <p className="text-xs text-destructive/80">{workflowState.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <StrategyPanel data={envelope?.rawNormalizedObjects ?? null} />
            <CustomerDNACard />
            <RunHistorySelector
              entries={history}
              activeRunId={activeRunId}
              onSelect={(entry) => {
                setEnvelope(entry.result.envelope);
                setActiveRunId(entry.id);
              }}
            />
            <RunStatusPanel data={displayEnvelope} />
          </div>
          <div className="lg:col-span-1">
            <PlatformBattleView />
          </div>
          <div className="lg:col-span-1">
            <StrategyReasoningPanel />
          </div>
        </div>
        <OrchestrationVisibilityPanel
          data={displayEnvelope.orchestrationSummary}
          isRunning={isRunning}
          isIdle={displayEnvelope.runMetadata.status === "idle"}
        />
        <NarrativeSimulationArena />
        <StrategyExplanation envelope={displayEnvelope} />
        <CampaignTimeline steps={displayEnvelope.agentExecutionSummary.steps} isRunning={isRunning} />
        <NormalizerReportPanel report={envelope?.rawNormalizedObjects ?? null} />
      </div>
    </div>
  );
};

export default StrategyIntelligence;
