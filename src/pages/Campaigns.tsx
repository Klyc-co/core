import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Zap, History, Sparkles, Send } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Campaigns = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchPendingCount(user.id);
      }
    });
  }, [navigate]);

  const fetchPendingCount = async (userId: string) => {
    const { count } = await supabase
      .from("campaign_approvals")
      .select("*", { count: "exact", head: true })
      .eq("marketer_id", userId)
      .eq("status", "pending");
    
    setPendingCount(count || 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Campaigns</h1>
          
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Button 
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/new")}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">New Campaign</span>
              <span className="sm:hidden">New</span>
            </Button>
            <Button 
              className="gap-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/generate")}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Generate Ideas</span>
              <span className="sm:hidden">Generate</span>
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10 relative text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/pending")}
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              {pendingCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-xs">
                  {pendingCount}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline"
              className="gap-2 border-purple-500 text-purple-500 hover:bg-purple-500/10 text-xs sm:text-sm"
              onClick={() => navigate("/campaigns/schedule")}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              Schedule
            </Button>
          </div>
        </div>

        {/* Live Campaigns */}
        <div className="mb-6 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            Live Campaigns
          </h2>
          <Card className="border-dashed">
            <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
              No live campaigns yet. Click "New Campaign" to create your first campaign.
            </CardContent>
          </Card>
        </div>

        {/* Past Campaigns */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            Past Campaigns
          </h2>
          <Card className="border-dashed">
            <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
              No past campaigns yet. Completed campaigns will appear here.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Campaigns;
