import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, Download } from "lucide-react";
import CustomerDNACard from "@/components/strategy-intelligence/CustomerDNACard";
import NarrativeSimulationArena from "@/components/strategy-intelligence/NarrativeSimulationArena";
import PlatformBattleView from "@/components/strategy-intelligence/PlatformBattleView";
import StrategyReasoningPanel from "@/components/strategy-intelligence/StrategyReasoningPanel";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const StrategyIntelligence = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleRerun = () => {
    setIsSimulating(true);
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
      {/* Header bar */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Strategy Intelligence</h1>
              <p className="text-xs text-muted-foreground">AI narrative simulation & platform strategy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono hidden sm:flex">
              Compression: Active
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={isSimulating}>
              {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              Re-simulate
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Row 1: DNA + Platform Battle + Reasoning */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <CustomerDNACard />
          </div>
          <div className="lg:col-span-1">
            <PlatformBattleView />
          </div>
          <div className="lg:col-span-1">
            <StrategyReasoningPanel />
          </div>
        </div>

        {/* Row 2: Narrative Simulation Arena */}
        <NarrativeSimulationArena />
      </div>
    </div>
  );
};

export default StrategyIntelligence;
