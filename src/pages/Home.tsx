import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import AddClientDialog from "@/components/AddClientDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";
import { Calendar, Globe } from "lucide-react";

interface ScheduledCampaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  image_url: string | null;
}

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [liveCampaigns, setLiveCampaigns] = useState<ScheduledCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchLiveCampaigns(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchLiveCampaigns = async (userId: string) => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("scheduled_campaigns")
      .select("id, campaign_name, platforms, scheduled_date, scheduled_time, status, image_url")
      .eq("user_id", userId)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(4);

    if (data) setLiveCampaigns(data);
    setLoading(false);
  };

  const handleFullAnalyticsClick = () => {
    navigate("/analytics");
  };

  const handleConnectGA = () => {
    navigate("/profile/company");
  };

  const handleClientAdded = () => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: "clientListUpdated",
      newValue: Date.now().toString(),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onAddClient={() => setAddClientOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Website Analytics */}
        <div className="mb-6">
          <WebsiteAnalyticsSummary 
            showFullButton 
            onFullClick={handleFullAnalyticsClick}
            onConnectClick={handleConnectGA}
          />
        </div>

        {/* Social Media Analytics */}
        <div className="mb-6 sm:mb-10">
          <SocialMediaAnalyticsSummary 
            showFullButton 
            onFullClick={handleFullAnalyticsClick}
          />
        </div>

        {/* Live Campaigns */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Live Campaigns</h2>
          {loading ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : liveCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No live campaigns yet. Create a campaign to see it here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveCampaigns.map(campaign => (
                <Card key={campaign.id} className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate("/campaigns/schedule")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {campaign.image_url ? (
                        <img src={campaign.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{campaign.campaign_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{campaign.scheduled_date} · {campaign.scheduled_time}</span>
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {campaign.platforms.map(p => (
                            <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant={campaign.status === "published" ? "default" : "outline"} className="text-[10px] flex-shrink-0">
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onClientAdded={handleClientAdded}
      />
    </div>
  );
};

export default Home;
