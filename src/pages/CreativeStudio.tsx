import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import SocialPostWizard from "@/components/social-post-editor/SocialPostWizard";
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Creative Studio</h1>
            <p className="text-sm text-muted-foreground">Create visual content, images, thumbnails, and media assets for campaigns.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/projects")} className="gap-2 shrink-0" size="sm">
            <FileText className="w-4 h-4" /> Content
          </Button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <SocialPostWizard brandColors={brandColors} brandFonts={brandFonts} />
      </div>
    </div>
  );
};

export default CreativeStudio;
