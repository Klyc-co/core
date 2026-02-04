import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
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
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFullAnalyticsClick = () => {
    navigate("/analytics");
  };

  const handleConnectGA = () => {
    // Keep the URL free of query params so Google OAuth redirect_uri can match exactly.
    // The analytics tab can be restored client-side after the callback.
    navigate("/profile/company");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

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
          <Card className="border-dashed">
            <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
              No live campaigns yet. Create a campaign to see it here.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
