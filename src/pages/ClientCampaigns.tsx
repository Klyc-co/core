import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, History, Calendar, TrendingUp } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Campaign {
  id: string;
  campaign_name: string;
  platforms: string[];
  scheduled_date: string;
  status: string;
  tags: string[] | null;
}

const ClientCampaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [liveCampaigns, setLiveCampaigns] = useState<Campaign[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/client/auth");
      } else {
        setUser(user);
        fetchCampaigns(user.id);
      }
    });
  }, [navigate]);

  const fetchCampaigns = async (userId: string) => {
    try {
      // Fetch campaigns through campaign_approvals for this client
      const { data: approvals, error } = await supabase
        .from("campaign_approvals")
        .select(`
          *,
          scheduled_campaigns (*)
        `)
        .eq("client_id", userId);

      if (error) throw error;

      const campaigns = approvals
        ?.filter(a => a.scheduled_campaigns)
        .map(a => a.scheduled_campaigns as Campaign) || [];

      const today = new Date().toISOString().split("T")[0];
      setLiveCampaigns(campaigns.filter(c => c.scheduled_date >= today));
      setPastCampaigns(campaigns.filter(c => c.scheduled_date < today));
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground">{campaign.campaign_name}</h3>
          <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
            {campaign.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(campaign.scheduled_date).toLocaleDateString()}
          </div>
          <div className="flex gap-1">
            {campaign.platforms.map(p => (
              <Badge key={p} variant="outline" className="text-xs">
                {p}
              </Badge>
            ))}
          </div>
        </div>
        {campaign.tags && campaign.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {campaign.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Campaigns</h1>
          <p className="text-muted-foreground">View and monitor campaigns created for your brand</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{liveCampaigns.length}</p>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pastCampaigns.length}</p>
                <p className="text-sm text-muted-foreground">Completed Campaigns</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">--</p>
                <p className="text-sm text-muted-foreground">Total Reach</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Campaigns */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Live Campaigns
          </h2>
          {loading ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                Loading campaigns...
              </CardContent>
            </Card>
          ) : liveCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                No live campaigns at the moment.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveCampaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>

        {/* Past Campaigns */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Past Campaigns
          </h2>
          {pastCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                No past campaigns yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastCampaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientCampaigns;
