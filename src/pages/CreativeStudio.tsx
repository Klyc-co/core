import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import CreativeHub from "@/components/creative/CreativeHub";
import ImageVideoGenerator from "@/components/creative/ImageVideoGenerator";
import FlyerGeneratorView from "@/components/creative/FlyerGeneratorView";
import type { User } from "@supabase/supabase-js";

type ActiveTool = "hub" | "image-video" | "flyer" | "broll";

const CreativeStudio = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [brandFonts, setBrandFonts] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>("hub");

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

  const handleSelect = (tool: "image-video" | "flyer" | "broll") => {
    if (tool === "broll") {
      navigate("/projects", { state: { fromCreative: true } });
      return;
    }
    setActiveTool(tool);
  };

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
          <p className="text-sm text-muted-foreground">Create visual content, images, thumbnails, and media assets for campaigns.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTool === "hub" && <CreativeHub onSelect={handleSelect} />}
        {activeTool === "image-video" && <ImageVideoGenerator onBack={() => setActiveTool("hub")} />}
        {activeTool === "flyer" && (
          <FlyerGeneratorView
            brandColors={brandColors}
            brandFonts={brandFonts}
            onBack={() => setActiveTool("hub")}
          />
        )}
      </div>
    </div>
  );
};

export default CreativeStudio;
