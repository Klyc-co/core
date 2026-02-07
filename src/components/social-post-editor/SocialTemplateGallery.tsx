import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Layout, Upload, Link, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FigmaTemplate, TEMPLATE_CATEGORIES } from "./types";

interface SocialTemplateGalleryProps {
  onSelectTemplate: (template: FigmaTemplate) => void;
  selectedTemplateId?: string;
}

interface UploadedTemplate {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  createdAt: string;
}

export default function SocialTemplateGallery({
  onSelectTemplate,
  selectedTemplateId,
}: SocialTemplateGalleryProps) {
  const [templates, setTemplates] = useState<FigmaTemplate[]>([]);
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplates();
    loadUploadedTemplates();
  }, [selectedCategory]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("figma-fetch-templates", {
        body: { action: "list-placeholders", category: selectedCategory },
      });

      if (error) throw error;
      setTemplates(data?.templates || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUploadedTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("brand_assets")
        .select("*")
        .eq("user_id", user.id)
        .eq("asset_type", "social-template")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const templates: UploadedTemplate[] = (data || []).map((asset) => ({
        id: asset.id,
        name: asset.name || "Untitled Template",
        imageUrl: asset.value,
        category: (asset.metadata as any)?.category || "custom",
        createdAt: asset.created_at,
      }));

      setUploadedTemplates(templates);
    } catch (error) {
      console.error("Failed to load uploaded templates:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const fileName = `${user.id}/social-templates/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(fileName);

      // Save to brand_assets
      const { error: insertError } = await supabase.from("brand_assets").insert({
        user_id: user.id,
        asset_type: "social-template",
        name: file.name.replace(/\.[^/.]+$/, ""),
        value: publicUrl,
        metadata: { 
          source: "upload",
          category: selectedCategory || "custom",
          originalName: file.name,
        },
      });

      if (insertError) throw insertError;

      toast.success("Template uploaded!");
      loadUploadedTemplates();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload template");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleFigmaUrlSubmit = async () => {
    if (!figmaUrl.trim()) return;

    // Validate Figma URL
    if (!figmaUrl.includes("figma.com")) {
      toast.error("Please enter a valid Figma URL");
      return;
    }

    toast.info("Figma URL saved - Export the template as PNG and upload it for best results");
    setFigmaUrl("");
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("brand_assets")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template deleted");
      loadUploadedTemplates();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleSelectUploadedTemplate = (template: UploadedTemplate) => {
    // Convert to FigmaTemplate format for compatibility
    const figmaTemplate: FigmaTemplate = {
      id: template.id,
      name: template.name,
      category: template.category,
      previewUrl: template.imageUrl,
      width: 1080,
      height: 1080,
      colors: [],
      fonts: [],
      layoutData: { imageUrl: template.imageUrl },
    };
    onSelectTemplate(figmaTemplate);
  };

  // Generate a preview based on layout data
  const renderTemplatePreview = (template: FigmaTemplate) => {
    const layout = template.layoutData;
    const bgStyle: React.CSSProperties = {};

    if (layout?.background?.type === "gradient") {
      bgStyle.background = `linear-gradient(135deg, ${layout.background.colors.join(", ")})`;
    } else if (layout?.background?.type === "solid") {
      bgStyle.backgroundColor = layout.background.color;
    } else {
      bgStyle.backgroundColor = template.colors[0] || "#f3f4f6";
    }

    return (
      <div
        className="w-full aspect-square rounded-md overflow-hidden relative"
        style={bgStyle}
      >
        {layout?.elements?.map((el: any, i: number) => {
          if (el.type === "text") {
            return (
              <div
                key={i}
                className="absolute text-white truncate"
                style={{
                  left: `${el.position.x * 100}%`,
                  top: `${el.position.y * 100}%`,
                  fontSize: `${Math.min(el.fontSize / 6, 12)}px`,
                  fontWeight: el.fontWeight || "normal",
                  color: el.color || "#ffffff",
                  maxWidth: "80%",
                }}
              >
                {el.role === "headline" ? "Headline" : el.role === "body" ? "Body text" : el.role}
              </div>
            );
          }
          if (el.type === "rect") {
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${el.position.x * 100}%`,
                  top: `${el.position.y * 100}%`,
                  width: `${el.width * 100}%`,
                  height: `${el.height * 100}%`,
                  backgroundColor: el.color || "rgba(255,255,255,0.2)",
                  borderRadius: el.borderRadius || 0,
                }}
              />
            );
          }
          return null;
        })}

        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
          {template.category}
        </div>
      </div>
    );
  };

  const allTemplates = [
    ...uploadedTemplates.map((t) => ({ ...t, isUploaded: true })),
  ];

  const filteredUploadedTemplates = selectedCategory
    ? uploadedTemplates.filter((t) => t.category === selectedCategory || t.category === "custom")
    : uploadedTemplates;

  return (
    <div className="space-y-4">
      {/* Figma URL Paste Bar */}
      <div className="bg-muted/50 rounded-lg border p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link className="w-4 h-4" />
          <span>Paste Figma Template URL</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.figma.com/file/..."
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            className="flex-1 h-8 text-sm"
          />
          {figmaUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFigmaUrl("")}
              className="h-8 px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleFigmaUrlSubmit}
            disabled={!figmaUrl.trim()}
            className="h-8"
          >
            Save
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          For best results, export the Figma template as PNG and upload below
        </p>
      </div>

      {/* Upload Template Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Template PNG
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-2">
        <Layout className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Social Templates</h3>
      </div>

      {/* Category filter */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-xs h-7 px-2"
          >
            All
          </Button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="text-xs h-7 px-2 whitespace-nowrap"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Uploaded Templates Section */}
      {filteredUploadedTemplates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your Templates
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {filteredUploadedTemplates.map((template) => (
              <div key={template.id} className="relative group">
                <button
                  onClick={() => handleSelectUploadedTemplate(template)}
                  className="w-full rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] border-border hover:border-primary/50"
                >
                  <div className="w-full aspect-square relative">
                    <img
                      src={template.imageUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
                      {template.category}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Templates */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 && filteredUploadedTemplates.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No templates found - upload one above!
        </div>
      ) : templates.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Built-in Templates
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={`group relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                  selectedTemplateId === template.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {renderTemplatePreview(template)}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                  <span className="text-white text-xs font-medium text-center line-clamp-2">
                    {template.name}
                  </span>
                  <div className="flex gap-1 mt-1">
                    {template.colors.slice(0, 4).map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-white/30"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground text-center">
        Upload Buzz/Figma templates as PNGs to use with AI Template Fusion
      </p>
    </div>
  );
}
