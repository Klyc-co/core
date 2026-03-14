import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw } from "lucide-react";
import CustomerDNACard from "@/components/strategy-intelligence/CustomerDNACard";
import NarrativeSimulationArena from "@/components/strategy-intelligence/NarrativeSimulationArena";
import PlatformBattleView from "@/components/strategy-intelligence/PlatformBattleView";
import StrategyReasoningPanel from "@/components/strategy-intelligence/StrategyReasoningPanel";
import RunStatusPanel from "@/components/command-center/RunStatusPanel";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrentClient } from "@/hooks/use-current-client";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { WorkflowPayload } from "@/types/workflow-payload";
import { deriveRunStatus } from "@/types/run-status";

const StrategyIntelligence = () => {
  const navigate = useNavigate();
  const { currentClientId, currentClientName } = useCurrentClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [contextPayload, setContextPayload] = useState<Partial<WorkflowPayload>>({});

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  // Auto-load context from client_brain when client changes
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
      } catch {
        // Context is optional
      }
    };
    loadContext();
  }, [user, currentClientId, currentClientName]);

  const handleRerun = () => {
    setIsSimulating(true);
    console.log("[KLYC] Strategy payload context:", contextPayload);
    setTimeout(() => setIsSimulating(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
                {currentClientName && (
                  <Badge variant="outline" className="ml-2 text-[10px] h-4">{currentClientName}</Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono hidden sm:flex">
              Compression: {contextPayload.compressed_customer_dna ? "Active" : "Idle"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              Re-simulate
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <CustomerDNACard />
            <RunStatusPanel
              data={deriveRunStatus({
                clientId: currentClientId || user?.id || "",
                clientName: currentClientName || "Default",
                runTimestamp: null,
                report: null,
              })}
            />
          </div>
          <div className="lg:col-span-1">
            <PlatformBattleView />
          </div>
          <div className="lg:col-span-1">
            <StrategyReasoningPanel />
          </div>
        </div>
        <NarrativeSimulationArena />
      </div>
    </div>
  );
};

export default StrategyIntelligence;
