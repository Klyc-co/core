import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileStack } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface CampaignDraft {
  id: string;
  campaign_idea: string;
  content_type: string;
  created_at: string;
}

const CampaignDrafts = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchDrafts(user.id);
      }
    });
  }, [navigate]);

  const fetchDrafts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_drafts" as any)
        .select("id, campaign_idea, content_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrafts((data as unknown as CampaignDraft[]) || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns/generate")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Generate Ideas
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Campaign Drafts</h1>
          <p className="text-muted-foreground">View and manage your saved campaign ideas</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Loading drafts...</p>
            </CardContent>
          </Card>
        ) : drafts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileStack className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No campaign drafts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate campaign ideas and save them to see them here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <Card 
                key={draft.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/campaigns/drafts/${draft.id}`)}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-foreground">
                    {draft.campaign_idea || "Untitled Campaign"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {draft.content_type} • {new Date(draft.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CampaignDrafts;
