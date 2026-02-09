import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, Upload, Layout, Check, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
import { toast } from "sonner";
import { FigmaTemplate, TEMPLATE_CATEGORIES, WizardState, ASPECT_RATIO_OPTIONS, AspectRatio } from "../types";
import { Smartphone, Monitor, Square } from "lucide-react";

// Import universal templates
import modernHiringTemplate from "@/assets/templates/modern-hiring.png";
import modernRestaurantTemplate from "@/assets/templates/modern-restaurant.png";
import modernWebinarTemplate from "@/assets/templates/modern-webinar.png";
import boldTestimonial from "@/assets/templates/bold-testimonial.png";
import boldReleaseNotes from "@/assets/templates/bold-release-notes.png";
import boldFashionReel from "@/assets/templates/bold-fashion-reel.png";
import boldCollageAd from "@/assets/templates/bold-collage-ad.png";
import boldTechConference from "@/assets/templates/bold-tech-conference.png";
import boldOrganicModern from "@/assets/templates/bold-organic-modern.png";
import boldMeetTeamBw from "@/assets/templates/bold-meet-team-bw.png";
import boldMeetTeamColorful from "@/assets/templates/bold-meet-team-colorful.png";
import minimalInstaStories from "@/assets/templates/minimal-insta-stories.jpg";
import minimalAestheticQuotes from "@/assets/templates/minimal-aesthetic-quotes.avif";
import creativeBirthdayInvitation from "@/assets/templates/creative-birthday-invitation.png";
import creativeSaveTheDate from "@/assets/templates/creative-save-the-date.png";
import creativePolaroidReel from "@/assets/templates/creative-polaroid-reel.png";
import funBbqMenuPoster from "@/assets/templates/fun-bbq-menu-poster.avif";
import funFoodBanner from "@/assets/templates/fun-food-banner.avif";
import funBbqParty from "@/assets/templates/fun-bbq-party.jpg";
import funBbqFestivity from "@/assets/templates/fun-bbq-festivity.jpg";

// Universal templates available to all users
const UNIVERSAL_TEMPLATES: FigmaTemplate[] = [
  {
    id: "universal-modern-hiring",
    name: "Modern Hiring Post",
    category: "modern",
    previewUrl: modernHiringTemplate,
    width: 1080,
    height: 1350,
    colors: ["#3d1a78", "#f5a3d4", "#b8f5c0"],
    fonts: ["Inter", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-modern-restaurant",
    name: "Restaurant Announcement",
    category: "modern",
    previewUrl: modernRestaurantTemplate,
    width: 1080,
    height: 1350,
    colors: ["#f5f5f5", "#e63f23", "#000000"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-modern-webinar",
    name: "Webinar Promo Story",
    category: "modern",
    previewUrl: modernWebinarTemplate,
    width: 1080,
    height: 1920,
    colors: ["#c7b8ea", "#e63f23", "#f5a31a"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-testimonial",
    name: "SaaS Testimonial Post",
    category: "bold",
    previewUrl: boldTestimonial,
    width: 1080,
    height: 1080,
    colors: ["#1a1a2e", "#7b2ff7", "#e0a0ff"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-release-notes",
    name: "Release Notes Announcement",
    category: "bold",
    previewUrl: boldReleaseNotes,
    width: 1080,
    height: 1350,
    colors: ["#f5a623", "#e84393", "#a29bfe"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-fashion-reel",
    name: "Fashion Reel Cover",
    category: "bold",
    previewUrl: boldFashionReel,
    width: 1080,
    height: 1920,
    colors: ["#2d6a4f", "#333333", "#ffffff"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-collage-ad",
    name: "Collage Style Ad",
    category: "bold",
    previewUrl: boldCollageAd,
    width: 300,
    height: 250,
    colors: ["#ff6b35", "#ffd166", "#06d6a0"],
    fonts: ["Script", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-tech-conference",
    name: "Tech Conference Promo",
    category: "bold",
    previewUrl: boldTechConference,
    width: 1080,
    height: 1350,
    colors: ["#1a0533", "#7c3aed", "#c4b5fd"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-organic-modern",
    name: "Organic Modern Ad",
    category: "bold",
    previewUrl: boldOrganicModern,
    width: 1000,
    height: 1500,
    colors: ["#4ade80", "#000000", "#ffffff"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-meet-team-bw",
    name: "Meet Our Team (B&W)",
    category: "bold",
    previewUrl: boldMeetTeamBw,
    width: 1080,
    height: 1080,
    colors: ["#f5f5f5", "#000000", "#ffffff"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-bold-meet-team-colorful",
    name: "Meet Our Team (Colorful)",
    category: "bold",
    previewUrl: boldMeetTeamColorful,
    width: 1080,
    height: 1350,
    colors: ["#e84393", "#6c5ce7", "#00cec9", "#fdcb6e"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-minimal-insta-stories",
    name: "Minimal Insta Stories",
    category: "minimal",
    previewUrl: minimalInstaStories,
    width: 1080,
    height: 1920,
    colors: ["#ffffff", "#f5f5f5", "#333333"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-minimal-aesthetic-quotes",
    name: "Aesthetic Quotes Post",
    category: "minimal",
    previewUrl: minimalAestheticQuotes,
    width: 1080,
    height: 1080,
    colors: ["#faf9f6", "#e8e4de", "#2c2c2c"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-creative-birthday-invitation",
    name: "Birthday Invitation Story",
    category: "creative",
    previewUrl: creativeBirthdayInvitation,
    width: 1080,
    height: 1920,
    colors: ["#8fb8de", "#e87c2a", "#e88ba8"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-creative-save-the-date",
    name: "Save The Date Story",
    category: "creative",
    previewUrl: creativeSaveTheDate,
    width: 1080,
    height: 1920,
    colors: ["#f5ebe0", "#8b2020", "#333333"],
    fonts: ["Serif", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-creative-polaroid-reel",
    name: "Nostalgic Polaroid Reel",
    category: "creative",
    previewUrl: creativePolaroidReel,
    width: 1080,
    height: 1920,
    colors: ["#c8b84d", "#2a3d6b", "#ffffff"],
    fonts: ["Script", "Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-fun-bbq-menu-poster",
    name: "BBQ Menu Poster",
    category: "fun",
    previewUrl: funBbqMenuPoster,
    width: 1080,
    height: 1350,
    colors: ["#8b0000", "#f5a623", "#ffffff"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-fun-food-banner",
    name: "Food Social Banner",
    category: "fun",
    previewUrl: funFoodBanner,
    width: 1080,
    height: 1080,
    colors: ["#e63946", "#f1faee", "#ffb703"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-fun-bbq-party",
    name: "BBQ Party Flyer",
    category: "fun",
    previewUrl: funBbqParty,
    width: 1080,
    height: 1350,
    colors: ["#1a1a1a", "#f5a623", "#e63946"],
    fonts: ["Sans-serif"],
    layoutData: null,
  },
  {
    id: "universal-fun-bbq-festivity",
    name: "BBQ Festivity Post",
    category: "fun",
    previewUrl: funBbqFestivity,
    width: 1080,
    height: 1080,
    colors: ["#1a1a1a", "#f5a623", "#ffffff"],
    fonts: ["Script", "Sans-serif"],
    layoutData: null,
  },
];

interface TemplateSelectionStepProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
}

export default function TemplateSelectionStep({
  wizardState,
  onUpdate,
  onNext,
}: TemplateSelectionStepProps) {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<FigmaTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Load saved templates from library
  useEffect(() => {
    const loadTemplates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("brand_assets")
        .select("*")
        .eq("user_id", user.id)
        .eq("asset_type", "social-template")
        .order("created_at", { ascending: false });

      if (data) {
        const templates: FigmaTemplate[] = data.map((asset) => ({
          id: asset.id,
          name: asset.name || "Untitled Template",
          category: (asset.metadata as any)?.category || "custom",
          previewUrl: asset.value,
          width: 1080,
          height: 1080,
          colors: (asset.metadata as any)?.colors || [],
          fonts: (asset.metadata as any)?.fonts || [],
          layoutData: null,
        }));
        setSavedTemplates(templates);
      }
      setIsLoadingTemplates(false);
    };
    loadTemplates();
  }, []);

  const handleSaveFigmaUrl = async () => {
    if (!figmaUrl.includes("figma.com")) {
      toast.error("Please enter a valid Figma URL");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    // Save the Figma URL as a reference
    await supabase.from("brand_assets").insert({
      user_id: user.id,
      asset_type: "figma-link",
      name: `Figma Template - ${new Date().toLocaleDateString()}`,
      value: figmaUrl,
      metadata: { source: "figma-url-paste" },
    });

    toast.success("Figma URL saved! Now upload the PNG export to use as template.");
    onUpdate({ figmaUrl });
    setFigmaUrl("");
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      // Upload to storage
      const { publicUrl } = await uploadBrandAssetImage({
        userId: user.id,
        file,
        folder: "social-templates",
      });

      // Save to brand_assets
      const { data: asset } = await supabase
        .from("brand_assets")
        .insert({
          user_id: user.id,
          asset_type: "social-template",
          name: file.name.replace(/\.[^.]+$/, ""),
          value: publicUrl,
          metadata: { 
            source: "upload", 
            category: "custom",
            uploadedAt: new Date().toISOString(),
          },
        })
        .select()
        .single();

      // Create template object
      const newTemplate: FigmaTemplate = {
        id: asset?.id || crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ""),
        category: "custom",
        previewUrl: publicUrl,
        width: 1080,
        height: 1080,
        colors: [],
        fonts: [],
        layoutData: null,
      };

      setSavedTemplates((prev) => [newTemplate, ...prev]);
      onUpdate({ 
        selectedTemplate: newTemplate, 
        templateImageUrl: publicUrl 
      });
      
      toast.success("Template uploaded and selected!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload template");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const imageUrlToDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image (${response.status})`);
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  };

  const handleSelectTemplate = async (template: FigmaTemplate) => {
    // Always store the selected template for UI highlighting
    // Clear any previous templateImageUrl so the user cannot continue until the new one is ready.
    onUpdate({ selectedTemplate: template, templateImageUrl: null });

    // The AI API needs a fetchable URL or base64, not a local/relative path.
    // Universal templates are bundled assets; convert them to base64 in the browser.
    if (template.id.startsWith("universal-")) {
      try {
        const dataUrl = await imageUrlToDataUrl(template.previewUrl);
        onUpdate({ templateImageUrl: dataUrl });
      } catch (error) {
        console.error("Failed to convert template to base64:", error);
        toast.error("Failed to load template. Please try again.");
        onUpdate({ templateImageUrl: null, selectedTemplate: null });
      }
      return;
    }

    // For user-uploaded templates, the URL is already a full public URL
    onUpdate({ templateImageUrl: template.previewUrl });
  };

  // Combine universal templates with user's saved templates
  const allTemplates = [...UNIVERSAL_TEMPLATES, ...savedTemplates];

  const filteredTemplates = selectedCategory === "all"
    ? allTemplates
    : selectedCategory === "custom"
      ? savedTemplates // Only show user uploads for "My Uploads"
      : allTemplates.filter((t) => t.category === selectedCategory);

  // Require the actual image payload/URL to be ready before allowing Continue
  const canProceed = Boolean(wizardState.selectedTemplate && wizardState.templateImageUrl);

  const aspectIcons: Record<AspectRatio, typeof Smartphone> = {
    portrait: Smartphone,
    square: Square,
    landscape: Monitor,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Choose Your Template</h2>
        <p className="text-muted-foreground mt-1">
          Select your post size, paste a Figma URL, upload a PNG, or choose from templates
        </p>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-primary/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Monitor className="w-4 h-4 text-primary" />
          <span>Output Size</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ASPECT_RATIO_OPTIONS.map((option) => {
            const Icon = aspectIcons[option.value];
            const isSelected = wizardState.aspectRatio === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onUpdate({ aspectRatio: option.value })}
                className={`relative flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-8 h-8 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-medium text-sm ${isSelected ? "text-primary" : ""}`}>
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground mt-1">{option.dimensions}</span>
                <span className="text-xs text-muted-foreground text-center mt-1">{option.description}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Figma URL Paste */}
      <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link className="w-4 h-4 text-primary" />
          <span>Paste Figma Template URL</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.figma.com/file/... or https://www.figma.com/community/..."
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            className="flex-1 h-10 bg-background"
          />
          {figmaUrl && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFigmaUrl("")}
              className="h-10 w-10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleSaveFigmaUrl}
            disabled={!figmaUrl.trim()}
            className="h-10"
          >
            Save Link
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          After saving the link, export the Figma design as PNG and upload it below.
        </p>
      </div>

      {/* Upload Template */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
          )}
          <span className="text-base font-medium">Upload Template PNG</span>
          <span className="text-sm text-muted-foreground mt-1">Export from Figma and upload</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleTemplateUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>

        {/* Selected Template Preview */}
        {wizardState.selectedTemplate && (
          <div className="relative border-2 border-primary rounded-xl overflow-hidden">
            <img
              src={wizardState.selectedTemplate.previewUrl}
              alt={wizardState.selectedTemplate.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
              <div className="bg-primary text-primary-foreground rounded-full p-2">
                <Check className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-sm font-medium truncate">
                {wizardState.selectedTemplate.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Saved Templates Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            Social Templates
          </h3>
        </div>

        {/* Category Filter */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "custom" ? "default" : "outline"}
              onClick={() => setSelectedCategory("custom")}
            >
              My Uploads
            </Button>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Templates Grid */}
        {isLoadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No templates yet. Upload your first template above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  wizardState.selectedTemplate?.id === template.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <img
                  src={template.previewUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                {wizardState.selectedTemplate?.id === template.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{template.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
          className="min-w-[200px]"
        >
          Continue to Assets
        </Button>
      </div>
    </div>
  );
}
