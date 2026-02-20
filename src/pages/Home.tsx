import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import AddClientDialog from "@/components/AddClientDialog";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <WebsiteAnalyticsSummary 
            showFullButton 
            onFullClick={handleFullAnalyticsClick}
            onConnectClick={handleConnectGA}
          />
        </div>

        <div className="mb-6 sm:mb-10">
          <SocialMediaAnalyticsSummary 
            showFullButton 
            onFullClick={handleFullAnalyticsClick}
          />
        </div>

        <div>
          <LiveCampaignsFeed showFullButton limit={6} />
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