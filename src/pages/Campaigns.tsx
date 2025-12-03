import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface CampaignCardProps {
  name: string;
  status: "Active" | "Paused" | "Completed";
  dateRange: string;
  impressions: string;
  impressionsChange: string;
  clicks: string;
  clicksChange: string;
  conversions: string;
  conversionsChange: string;
  roas: string;
  roasChange: string;
}

const CampaignCard = ({ 
  name, status, dateRange, impressions, impressionsChange, 
  clicks, clicksChange, conversions, conversionsChange, roas, roasChange 
}: CampaignCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Paused": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "Completed": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getChangeColor = (change: string) => {
    if (change.startsWith("+")) return "text-emerald-500";
    if (change.startsWith("-")) return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold text-foreground text-lg">{name}</h3>
              <Badge variant="secondary" className={getStatusColor(status)}>
                {status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{dateRange}</p>
          </div>
          
          <div className="flex items-center gap-8 text-right">
            <div>
              <p className="text-muted-foreground text-sm">Impressions</p>
              <p className="font-semibold text-foreground">{impressions}</p>
              <p className={`text-sm ${getChangeColor(impressionsChange)}`}>{impressionsChange}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Clicks</p>
              <p className="font-semibold text-foreground">{clicks}</p>
              <p className={`text-sm ${getChangeColor(clicksChange)}`}>{clicksChange}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Conversions</p>
              <p className="font-semibold text-foreground">{conversions}</p>
              <p className={`text-sm ${getChangeColor(conversionsChange)}`}>{conversionsChange}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">ROAS</p>
              <p className="font-semibold text-foreground">{roas}</p>
              <p className={`text-sm ${getChangeColor(roasChange)}`}>{roasChange}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Campaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  // Sample data - will be replaced with real data from database
  const liveCampaigns: CampaignCardProps[] = [
    {
      name: "Holiday Reels Push",
      status: "Active",
      dateRange: "Oct 15 - Nov 30",
      impressions: "1.2M",
      impressionsChange: "+15%",
      clicks: "47.3K",
      clicksChange: "+4%",
      conversions: "1842",
      conversionsChange: "+15%",
      roas: "4.2x",
      roasChange: "+15%"
    },
    {
      name: "Sustainability Series",
      status: "Active",
      dateRange: "Oct 1 - Nov 30",
      impressions: "856.0K",
      impressionsChange: "+8%",
      clicks: "32.1K",
      clicksChange: "+2%",
      conversions: "1205",
      conversionsChange: "+9%",
      roas: "3.8x",
      roasChange: "+10%"
    },
    {
      name: "Newsletter Launch",
      status: "Active",
      dateRange: "Oct 10",
      impressions: "523.0K",
      impressionsChange: "+22%",
      clicks: "19.8K",
      clicksChange: "+18%",
      conversions: "892",
      conversionsChange: "+28%",
      roas: "5.1x",
      roasChange: "+42%"
    }
  ];

  const pastCampaigns: CampaignCardProps[] = [
    {
      name: "Fall Product Drop",
      status: "Paused",
      dateRange: "Sep 25",
      impressions: "402.0K",
      impressionsChange: "-5%",
      clicks: "12.1K",
      clicksChange: "-8%",
      conversions: "320",
      conversionsChange: "-10%",
      roas: "2.4x",
      roasChange: "-15%"
    },
    {
      name: "Brand Awareness Q4",
      status: "Completed",
      dateRange: "Aug 1 - Sep 30",
      impressions: "2.1M",
      impressionsChange: "+0%",
      clicks: "58.9K",
      clicksChange: "+0%",
      conversions: "1450",
      conversionsChange: "+0%",
      roas: "3.2x",
      roasChange: "+0%"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          
          <div className="flex gap-3">
            <Button 
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90"
              onClick={() => navigate("/campaigns/new")}
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-purple-500 text-purple-500 hover:bg-purple-500/10"
              onClick={() => navigate("/campaigns/schedule")}
            >
              <Clock className="w-4 h-4" />
              Schedule
            </Button>
          </div>
        </div>

        {/* Live Campaigns */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4">Live Campaigns</h2>
          <div className="space-y-4">
            {liveCampaigns.map((campaign, index) => (
              <CampaignCard key={index} {...campaign} />
            ))}
          </div>
        </div>

        {/* Past Campaigns */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Past Campaigns</h2>
          <div className="space-y-4">
            {pastCampaigns.map((campaign, index) => (
              <CampaignCard key={index} {...campaign} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Campaigns;
