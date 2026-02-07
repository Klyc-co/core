import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Layout, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FigmaTemplate, TEMPLATE_CATEGORIES } from "./types";
import FigmaIcon from "@/components/icons/FigmaIcon";

interface FigmaTemplateGalleryProps {
  onSelectTemplate: (template: FigmaTemplate) => void;
  selectedTemplateId?: string;
}

export default function FigmaTemplateGallery({
  onSelectTemplate,
  selectedTemplateId,
}: FigmaTemplateGalleryProps) {
  const [templates, setTemplates] = useState<FigmaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
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
      toast.error("Failed to load Figma templates");
    } finally {
      setIsLoading(false);
    }
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
        {/* Render simplified layout elements */}
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
          if (el.type === "circle") {
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${el.position.x * 100}%`,
                  top: `${el.position.y * 100}%`,
                  width: el.radius / 5,
                  height: el.radius / 5,
                  backgroundColor: el.color || "rgba(255,255,255,0.3)",
                  opacity: el.opacity || 1,
                }}
              />
            );
          }
          return null;
        })}

        {/* Category badge */}
        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
          {template.category}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FigmaIcon className="w-4 h-4" />
        <h3 className="font-medium text-sm">Figma Templates</h3>
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

      {/* Templates grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No templates found
        </div>
      ) : (
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

              {/* Hover overlay */}
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
      )}

      <p className="text-xs text-muted-foreground text-center">
        Select a template to apply its layout and styles
      </p>
    </div>
  );
}
