import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Eye, Heart, BarChart3 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const ClientInsights = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/client/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleConnectGA = () => {
    navigate("/client/profile/import");
  };

  const stats = [
    { label: "Total Reach", value: "--", icon: Users, color: "blue" },
    { label: "Impressions", value: "--", icon: Eye, color: "purple" },
    { label: "Engagement", value: "--", icon: Heart, color: "pink" },
    { label: "Growth", value: "--", icon: TrendingUp, color: "green" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Insights</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track your marketing performance and campaign analytics</p>
        </div>

        {/* Website Analytics */}
        <div className="mb-6">
          <WebsiteAnalyticsSummary 
            onConnectClick={handleConnectGA}
          />
        </div>

        {/* Social Media Analytics */}
        <div className="mb-6 sm:mb-10">
          <SocialMediaAnalyticsSummary />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-10">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Chart Placeholder */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-5 h-5" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Performance charts will appear here once your campaigns are live</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No campaign data available yet.</p>
              <p className="text-xs sm:text-sm mt-2">
                Campaign analytics will appear here once your marketing team launches campaigns.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientInsights;
