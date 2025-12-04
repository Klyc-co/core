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

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Campaigns */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Live Campaigns</h2>
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              No live campaigns yet. Create a campaign to see it here.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
