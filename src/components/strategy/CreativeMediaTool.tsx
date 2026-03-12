import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SocialPostWizard from "@/components/social-post-editor/SocialPostWizard";

export default function CreativeMediaTool() {
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [brandFonts, setBrandFonts] = useState<string[]>([]);

  useEffect(() => {
    const loadBrandAssets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: colorAssets }, { data: fontAssets }] = await Promise.all([
        supabase.from("brand_assets").select("value").eq("user_id", user.id).eq("asset_type", "color"),
        supabase.from("brand_assets").select("value").eq("user_id", user.id).eq("asset_type", "font"),
      ]);

      if (colorAssets) setBrandColors(colorAssets.map((c) => c.value));
      if (fontAssets) setBrandFonts(fontAssets.map((f) => f.value));
    };
    loadBrandAssets();
  }, []);

  return <SocialPostWizard brandColors={brandColors} brandFonts={brandFonts} />;
}
