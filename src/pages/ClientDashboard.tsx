import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientHeader from "@/components/ClientHeader";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";
import { FileText, MessageSquare, CheckCircle, Clock } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const ClientDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/client/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/client/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFullAnalyticsClick = () => {
    navigate("/client/insights");
  };

  const handleConnectGA = () => {
    navigate("/client/profile/import");
  };

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome to your Client Portal
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review campaigns, provide feedback, and track your marketing progress.
          </p>
        </div>

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

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-10">
          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">0</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Active Campaigns</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">0</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">0</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">0</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              No campaigns yet
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm sm:text-base">
              When your marketing team shares campaigns with you, they'll appear here for you to review and approve.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Need help? Contact your marketing team or reach out to support.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientDashboard;
