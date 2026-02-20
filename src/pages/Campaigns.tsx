import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, History, Sparkles, Send } from "lucide-react";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";
import type { User } from "@supabase/supabase-js";

interface PastCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  status: string;
}

const Campaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pastCampaigns, setPastCampaigns] = useState<PastCampaign[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchPendingCount(user.id);
        fetchPastCampaigns(user.id);
      }
    });
  }, [navigate]);

  const fetchPendingCount = async (userId: string) => {
    const { count } = await supabase
      .from("campaign_approvals")
      .select("*", { count: "exact", head: true })
      .eq("marketer_id", userId)
      .eq("status", "pending");
    setPendingCount(count || 0);
  };

  const fetchPastCampaigns = async (userId: string) => {
    setLoadingPast(true);
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("scheduled_campaigns")
      .select("id, campaign_name, platforms, scheduled_date, status")
      .eq("user_id", userId)
      .lt("scheduled_date", today)
      .order("scheduled_date", { ascending: false });
    if (data) setPastCampaigns(data);
    setLoadingPast(false);
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
    </div>
  );
};

export default Campaigns;