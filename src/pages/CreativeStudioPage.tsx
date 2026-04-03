import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Image, Film, FolderOpen, Plus, Loader2 } from "lucide-react";
import CreativeHub from "@/components/creative/CreativeHub";
import ImageVideoGenerator from "@/components/creative/ImageVideoGenerator";

export default function CreativeStudioPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brandColors, setBrandColors] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: colorAssets } = await supabase
        .from("brand_assets")
        .select("value")
        .eq("user_id", user.id)
        .eq("asset_type", "color");
      if (colorAssets) setBrandColors(colorAssets.map((c) => c.value));
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Creative Studio</h1>
          <p className="text-sm text-muted-foreground">Generate, manage, and organize your creative assets</p>
        </div>
      </div>

      <Tabs defaultValue="assets">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assets">My Assets</TabsTrigger>
          <TabsTrigger value="generate">Create New</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          <CreativeHub
            brandColors={brandColors}
            brandFonts={[]}
            onSelectTool={(tool) => {
              if (tool === "broll") navigate("/projects", { state: { fromCreative: true } });
            }}
          />
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <ImageVideoGenerator brandColors={brandColors} />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                Asset Library
              </CardTitle>
              <CardDescription>All brand assets, images, and generated content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-8 gap-3">
                <p className="text-sm text-muted-foreground">Browse and manage your asset library</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/profile/library")}>
                  <FolderOpen className="w-4 h-4 mr-1.5" />
                  Open Full Library
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
