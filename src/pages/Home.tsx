import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import AddClientDialog from "@/components/AddClientDialog";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";
import ExampleAdsSection from "@/components/dashboard/ExampleAdsSection";
import AnimatedAdsSection from "@/components/dashboard/AnimatedAdsSection";
import PendingApprovalsList from "@/components/dashboard/PendingApprovalsList";
import WeeklyContentCalendar from "@/components/dashboard/WeeklyContentCalendar";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
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

  const handleFullAnalyticsClick = () => navigate("/analytics");
  const handleConnectGA = () => navigate("/profile/company");

  const handleClientAdded = () => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: "clientListUpdated",
      newValue: Date.now().toString(),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onAddClient={() => setAddClientOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Approvals + Calendar side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PendingApprovalsList />
          </div>
          <div className="lg:col-span-2">
            <WeeklyContentCalendar />
          </div>
        </div>

        {/* Live Campaigns */}
        <LiveCampaignsFeed showFullButton limit={6} />

        {/* Example Ads */}
        <ExampleAdsSection />

        {/* Analytics */}
        <WebsiteAnalyticsSummary 
          showFullButton 
          onFullClick={handleFullAnalyticsClick}
          onConnectClick={handleConnectGA}
        />
        <SocialMediaAnalyticsSummary 
          showFullButton 
          onFullClick={handleFullAnalyticsClick}
        />
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
