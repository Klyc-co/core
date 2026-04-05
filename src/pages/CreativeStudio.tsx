import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/components/AppHeader";
import ImageVideoGenerator from "@/components/creative/ImageVideoGenerator";
import FlyerGeneratorView from "@/components/creative/FlyerGeneratorView";
import HireAProfessional from "@/components/creative/HireAProfessional";
import type { User } from "@supabase/supabase-js";

const CreativeStudio = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [brandFonts, setBrandFonts] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const [{ data: colorAssets }, { data: fontAssets }] = await Promise.all([
        supabase.from("brand_assets").select("value").eq("user_id", user.id).eq("asset_type", "color"),
        supabase.from("brand_assets").select("value").eq("user_id", user.id).eq("asset_type", "font"),
      ]);
      if (colorAssets) setBrandColors(colorAssets.map((c) => c.value));
      if (fontAssets) setBrandFonts(fontAssets.map((f) => f.value));
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Creative Studio</h1>
          <p className="text-sm text-muted-foreground">Create visual content, images, thumbnails, and media assets.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="image-video">
          <TabsList className="mb-6">
            <TabsTrigger value="image-video">Image & Video</TabsTrigger>
            <TabsTrigger value="flyer">Flyer Generator</TabsTrigger>
            <TabsTrigger value="hire">Hire</TabsTrigger>
          </TabsList>

          <TabsContent value="image-video">
            <ImageVideoGenerator />
          </TabsContent>

          <TabsContent value="flyer">
            <FlyerGeneratorView
              brandColors={brandColors}
              brandFonts={brandFonts}
              onBack={() => {}}
            />
          </TabsContent>

          <TabsContent value="hire">
            <HireAProfessional onBack={() => {}} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreativeStudio;
