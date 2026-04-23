import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Globe, Share2, TrendingUp, Users, Eye, MousePointer, Clock, BarChart3 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { WebsiteAnalyticsWidget } from "@/components/WebsiteAnalyticsWidget";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";

const FullAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Full Analytics</h1>
          <p className="text-muted-foreground">Comprehensive view of all your website and social media performance</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="website" className="gap-2">
              <Globe className="w-4 h-4 hidden sm:block" />
              Website
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Share2 className="w-4 h-4 hidden sm:block" />
              Social Media
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Combined Summary */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">--</p>
                      <p className="text-xs text-muted-foreground">Total Pageviews</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">--</p>
                      <p className="text-xs text-muted-foreground">Total Followers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">--</p>
                      <p className="text-xs text-muted-foreground">Engagement Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <MousePointer className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">--</p>
                      <p className="text-xs text-muted-foreground">Total Clicks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Website Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Website Analytics
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("website")}>
                  View Details
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Visitors</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Avg. Duration</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Bounce Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Social Media Analytics
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("social")}>
                  View Details
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Total Impressions</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Total Clicks</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Avg. ROAS</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Website Analytics Tab */}
          <TabsContent value="website">
            <WebsiteAnalyticsWidget />
          </TabsContent>

          {/* Social Media Analytics Tab */}
          <TabsContent value="social">
            <SocialMediaAnalyticsSummary detailed />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FullAnalytics;
