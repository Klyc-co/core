import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import AddClientDialog from "@/components/AddClientDialog";
import { WebsiteAnalyticsSummary } from "@/components/WebsiteAnalyticsSummary";
import { SocialMediaAnalyticsSummary } from "@/components/SocialMediaAnalyticsSummary";
import { LiveCampaignsFeed } from "@/components/LiveCampaignsFeed";
import WeeklyContentCalendar from "@/components/dashboard/WeeklyContentCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, BarChart3, ShieldCheck, Lightbulb } from "lucide-react";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) navigate("/auth");
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleClientAdded = () => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: "clientListUpdated",
      newValue: Date.now().toString(),
    }));
  };

  const quickActions = [
    { label: "Post to Social", icon: MessageSquare, path: "/campaigns", color: "text-primary" },
    { label: "View Analytics", icon: BarChart3, path: "/analytics", color: "text-accent" },
    { label: "Pending Approvals", icon: ShieldCheck, path: "/campaigns?filter=pending_approval", color: "text-warning" },
    { label: "Learning Insights", icon: Lightbulb, path: "/learning", color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onAddClient={() => setAddClientOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="flex items-center gap-2 p-2.5">
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full-width Calendar */}
        <WeeklyContentCalendar />

        {/* Live Campaigns */}
        <LiveCampaignsFeed showFullButton limit={6} />

        {/* Analytics */}
        <WebsiteAnalyticsSummary
          showFullButton
          onFullClick={() => navigate("/analytics")}
          onConnectClick={() => navigate("/profile/company")}
        />
        <SocialMediaAnalyticsSummary
          showFullButton
          onFullClick={() => navigate("/analytics")}
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
