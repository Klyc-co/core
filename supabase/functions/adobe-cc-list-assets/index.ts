import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Adobe CC Libraries API base
const ADOBE_API_BASE = "https://cc-libraries.adobe.io/api/v1";
const ADOBE_ASSETS_API = "https://cc-api-storage.adobe.io/id";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adobeClientId = Deno.env.get("ADOBE_CLIENT_ID");

    if (!adobeClientId) {
      return new Response(JSON.stringify({ error: "Adobe Client ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { category, libraryId } = await req.json();

    // Since Adobe Express Embed SDK uses browser-based API key auth,
    // we provide a structured catalog of importable asset types.
    // The actual file browsing happens client-side via the Adobe Express Embed SDK.
    
    if (category === "libraries") {
      // Return available library categories for the UI
      return new Response(JSON.stringify({
        assets: [
          { id: "colors", name: "Colors & Swatches", type: "library_category", icon: "palette", description: "Brand colors and color palettes from Adobe Libraries" },
          { id: "character_styles", name: "Fonts & Text Styles", type: "library_category", icon: "type", description: "Typography and character styles" },
          { id: "graphics", name: "Graphics & Logos", type: "library_category", icon: "image", description: "Vector graphics, logos, and icons" },
          { id: "components", name: "Components", type: "library_category", icon: "layers", description: "Reusable design components" },
          { id: "patterns", name: "Patterns & Textures", type: "library_category", icon: "grid", description: "Patterns, textures, and backgrounds" },
        ],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (category === "cloud_files") {
      // Return file type categories available for import
      return new Response(JSON.stringify({
        assets: [
          { id: "psd", name: "Photoshop Files (.psd)", type: "file_category", ext: "psd", icon: "file-image", description: "Adobe Photoshop documents" },
          { id: "ai", name: "Illustrator Files (.ai)", type: "file_category", ext: "ai", icon: "file-image", description: "Adobe Illustrator documents" },
          { id: "png", name: "PNG Images", type: "file_category", ext: "png", icon: "image", description: "PNG format images" },
          { id: "jpg", name: "JPEG Images", type: "file_category", ext: "jpg", icon: "image", description: "JPEG format images" },
          { id: "pdf", name: "PDF Documents", type: "file_category", ext: "pdf", icon: "file-text", description: "PDF format documents" },
          { id: "svg", name: "SVG Graphics", type: "file_category", ext: "svg", icon: "file-image", description: "Scalable vector graphics" },
        ],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (category === "express_templates") {
      return new Response(JSON.stringify({
        assets: [
          { id: "social_post", name: "Social Media Posts", type: "template_category", icon: "layout", description: "Instagram, Facebook, Twitter post templates" },
          { id: "story", name: "Stories & Reels", type: "template_category", icon: "smartphone", description: "Vertical story and reel templates" },
          { id: "banner", name: "Banners & Ads", type: "template_category", icon: "monitor", description: "Web banners and advertisement templates" },
          { id: "logo", name: "Logo Templates", type: "template_category", icon: "hexagon", description: "Logo design templates" },
          { id: "flyer", name: "Flyers & Posters", type: "template_category", icon: "file", description: "Print-ready flyer and poster templates" },
        ],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: return all categories
    return new Response(JSON.stringify({
      categories: [
        { id: "cloud_files", name: "Cloud Files", description: "Files stored in Adobe Creative Cloud", icon: "cloud" },
        { id: "libraries", name: "Libraries", description: "Adobe Libraries with colors, fonts, and graphics", icon: "book-open" },
        { id: "express_templates", name: "Express Templates", description: "Adobe Express design templates", icon: "layout" },
      ],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Adobe CC list assets error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
