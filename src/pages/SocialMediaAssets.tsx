import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Share2, Image, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";

const SocialMediaAssets = () => {
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

  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-6 text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Social Media Assets</h1>
          <p className="text-muted-foreground">
            Posts, images, and analytics imported from your connected social media accounts
          </p>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <Card className="p-6">
              <EmptyState
                icon={FileText}
                title="No posts yet"
                description="Connect your social media accounts in Import Brand Sources to see your posts here."
              />
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="p-6">
              <EmptyState
                icon={Image}
                title="No images yet"
                description="Images from your social media posts will appear here after connecting your accounts."
              />
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="p-6">
              <EmptyState
                icon={BarChart3}
                title="No analytics yet"
                description="Campaign metrics and performance data will be displayed here to show what worked and what didn't."
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SocialMediaAssets;
