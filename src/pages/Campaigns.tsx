import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, History, Sparkles, Send, Rocket, FlaskConical, Loader2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";
import { useLaunchCampaign } from "@/hooks/use-launch-campaign";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@supabase/supabase-js";

interface PastCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  status: string;
}

interface CampaignDraftOption {
  id: string;
  campaign_idea: string | null;
  content_type: string | null;
  created_at: string;
}

const Campaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pastCampaigns, setPastCampaigns] = useState<PastCampaign[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);
  const { isLaunching, lastResult, launch } = useLaunchCampaign();
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [drafts, setDrafts] = useState<CampaignDraftOption[]>([]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        loadData(user.id);
      }
    });
  }, [navigate]);

  const loadData = async (userId: string) => {
    const [pendingRes, pastRes, draftsRes] = await Promise.all([
      supabase.from("campaign_approvals").select("id", { count: "exact", head: true }).eq("marketer_id", userId).eq("status", "pending"),
      supabase.from("scheduled_campaigns").select("id, campaign_name, platforms, scheduled_date, status").eq("user_id", userId).order("scheduled_date", { ascending: false }).limit(10),
      supabase.from("campaign_drafts").select("id, campaign_idea, content_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);
    setPendingCount(pendingRes.count || 0);
    setPastCampaigns((pastRes.data || []) as PastCampaign[]);
    setDrafts((draftsRes.data || []) as CampaignDraftOption[]);
    setLoadingPast(false);
  };

  const openLaunchModal = (testMode: boolean) => {
    setIsTestMode(testMode);
    setLaunchModalOpen(true);
  };

  const handleLaunch = async () => {
    await launch(
      selectedDraftId || undefined,
      isTestMode
    );
    if (!isTestMode) {
      setLaunchModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Campaigns</h1>
          
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Button 
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/new")}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">New Campaign</span>
              <span className="sm:hidden">New</span>
            </Button>
            <Button 
              className="gap-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/generate")}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Generate Ideas</span>
              <span className="sm:hidden">Generate</span>
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10 relative text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/pending")}
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              {pendingCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-xs">
                  {pendingCount}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-purple-500 text-purple-500 hover:bg-purple-500/10 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/schedule")}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              Schedule
            </Button>
          </div>
        </div>

        {/* Launch & Test Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
            onClick={() => openLaunchModal(false)}
          >
            <Rocket className="w-4 h-4" />
            Launch Campaign
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-muted-foreground/30"
            onClick={() => openLaunchModal(true)}
          >
            <FlaskConical className="w-4 h-4" />
            Test Launch
          </Button>
        </div>

        {/* Live Campaigns */}
        <div className="mb-6 sm:mb-10">
          <LiveCampaignsFeed />
        </div>

        {/* Past Campaigns */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            Past Campaigns
          </h2>
          {loadingPast ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : pastCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No past campaigns yet. Completed campaigns will appear here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastCampaigns.map(c => (
                <Card key={c.id} className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/campaigns/schedule")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{c.campaign_name}</h3>
                      <span className="text-xs text-muted-foreground">{c.scheduled_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {c.platforms.map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>
                        ))}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Launch Campaign Dialog */}
      <Dialog open={launchModalOpen} onOpenChange={setLaunchModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isTestMode ? <FlaskConical className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
              {isTestMode ? "Test Campaign Launch" : "Launch Campaign"}
            </DialogTitle>
            <DialogDescription>
              {isTestMode
                ? "Generate a test campaign context payload and inspect the result."
                : "Build and process the full campaign context through the KLYC orchestrator."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 flex-1 overflow-auto">
            <div className="space-y-2">
              <Label>Campaign Draft (optional)</Label>
              <Select value={selectedDraftId} onValueChange={setSelectedDraftId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a draft to include..." />
                </SelectTrigger>
                <SelectContent>
                  {drafts.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.campaign_idea || "Untitled").slice(0, 60)} — {d.content_type || "unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full gap-2"
              disabled={isLaunching}
              onClick={handleLaunch}
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isTestMode ? "Generating..." : "Launching..."}
                </>
              ) : (
                <>
                  {isTestMode ? <FlaskConical className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                  {isTestMode ? "Generate Test Payload" : "Launch Now"}
                </>
              )}
            </Button>

            {/* Test Mode Payload Inspector */}
            {isTestMode && lastResult?.campaignContext && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowPayload(!showPayload)}
                >
                  {showPayload ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showPayload ? "Hide" : "Show"} Full Payload
                </Button>
                {showPayload && (
                  <ScrollArea className="h-[300px] rounded border border-border">
                    <pre className="p-3 text-[10px] leading-tight font-mono text-foreground">
                      {JSON.stringify(lastResult.campaignContext, null, 2)}
                    </pre>
                  </ScrollArea>
                )}
              </div>
            )}

            {lastResult?.error && (
              <p className="text-sm text-destructive">{lastResult.error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campaigns;
