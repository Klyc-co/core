import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileStack } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const CampaignDrafts = () => {
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

        <Card>
          <CardContent className="p-12 text-center">
            <FileStack className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No campaign drafts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate campaign ideas and save them to see them here
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CampaignDrafts;
