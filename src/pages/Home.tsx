import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Zap, TrendingUp, BarChart3 } from "lucide-react";

const statCards = [
  { label: "Total Impressions", icon: Users, value: "--" },
  { label: "Total Clicks", icon: Zap, value: "--" },
  { label: "Total Conversions", icon: TrendingUp, value: "--" },
  { label: "Avg ROAS", icon: BarChart3, value: "--" },
];

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-10">
          {statCards.map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-3 sm:p-5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-xl sm:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
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
