import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, FolderOpen, Image, FileText, Palette, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";

const Library = () => {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Brand Library</h1>
          <p className="text-muted-foreground">
            All your imported brand assets in one place
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Assets</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Fonts</TabsTrigger>
            <TabsTrigger value="copy">Copy</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="p-6">
              <EmptyState
                icon={FolderOpen}
                title="No assets yet"
                description="Import your brand sources to start building your library. Your logos, images, colors, fonts, and copy will appear here."
              />
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="p-6">
              <EmptyState
                icon={Image}
                title="No images yet"
                description="Images from your website and social media will be stored here after import."
              />
            </Card>
          </TabsContent>

          <TabsContent value="colors">
            <Card className="p-6">
              <EmptyState
                icon={Palette}
                title="No colors yet"
                description="Your brand color palette will be extracted from your website and stored here."
              />
            </Card>
          </TabsContent>

          <TabsContent value="fonts">
            <Card className="p-6">
              <EmptyState
                icon={Type}
                title="No fonts yet"
                description="Font families and typography styles from your website will appear here."
              />
            </Card>
          </TabsContent>

          <TabsContent value="copy">
            <Card className="p-6">
              <EmptyState
                icon={FileText}
                title="No copy yet"
                description="Text blocks and copy from your website and social posts will be stored here."
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Library;
