import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Clock, Zap, History, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
              className="gap-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90"
              onClick={() => navigate("/campaigns/generate")}
            >
              <Sparkles className="w-4 h-4" />
              Generate Campaign Ideas
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
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Live Campaigns
          </h2>
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              No live campaigns yet. Click "New Campaign" to create your first campaign.
            </CardContent>
          </Card>
        </div>

        {/* Past Campaigns */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Past Campaigns
          </h2>
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              No past campaigns yet. Completed campaigns will appear here.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Campaigns;
