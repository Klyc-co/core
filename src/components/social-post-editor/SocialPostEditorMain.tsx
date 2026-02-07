import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Palette, Type, Square, Sparkles, FileText, Layout } from "lucide-react";
import { EditorSource, FigmaTemplate, CampaignDraft } from "./types";
import SourceSelector from "./SourceSelector";
import SocialTemplateGallery from "./SocialTemplateGallery";
import ImageEditorCanvas from "@/components/image-editor/ImageEditorCanvas";
import { supabase } from "@/integrations/supabase/client";
interface SocialPostEditorMainProps {
  brandColors: string[];
  brandFonts: string[];
  onSave?: (imageUrl: string) => void;
}

export default function SocialPostEditorMain({
  brandColors,
  brandFonts,
  onSave,
}: SocialPostEditorMainProps) {
  const [currentSource, setCurrentSource] = useState<EditorSource | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FigmaTemplate | null>(null);
  const [showFigmaTemplates, setShowFigmaTemplates] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft | null>(null);

  // Get initial image URL from source
  const getInitialImage = () => {
    if (!currentSource) return undefined;
    
    switch (currentSource.type) {
      case "upload":
      case "library":
      case "google-drive":
        return currentSource.data?.url;
      case "blank":
        return undefined;
      case "campaign-draft":
        // Campaign drafts might have associated images - TODO: load from brand_assets
        return undefined;
      default:
        return undefined;
    }
  };

  // Merge template colors/fonts with brand colors/fonts
  const getAllColors = () => {
    const colors = [...brandColors];
    if (selectedTemplate) {
      colors.push(...selectedTemplate.colors);
    }
    return [...new Set(colors)];
  };

  const getAllFonts = () => {
    const fonts = [...brandFonts];
    if (selectedTemplate) {
      fonts.push(...selectedTemplate.fonts);
    }
    return [...new Set(fonts)];
  };

  const handleSourceSelect = (source: EditorSource) => {
    setCurrentSource(source);
    
    if (source.type === "campaign-draft") {
      setCampaignDraft(source.data as CampaignDraft);
    }
  };

  const handleTemplateSelect = (template: FigmaTemplate) => {
    setSelectedTemplate(template);
    // If no source selected yet, start with blank but apply template
    if (!currentSource) {
      setCurrentSource({ type: "blank" });
    }
    setShowFigmaTemplates(false);
  };

  const handleStartOver = () => {
    setCurrentSource(null);
    setSelectedTemplate(null);
    setCampaignDraft(null);
    setShowFigmaTemplates(false);
  };

  // Selection phase - show source selector and optionally figma templates
  if (!currentSource) {
    return (
      <div className="space-y-6">
        {showFigmaTemplates ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowFigmaTemplates(false)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <h2 className="text-lg font-semibold">Choose a Template</h2>
            </div>
            <div className="max-w-xl mx-auto">
              <SocialTemplateGallery
                onSelectTemplate={handleTemplateSelect}
                selectedTemplateId={selectedTemplate?.id}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Create Social Post</h2>
              <p className="text-muted-foreground">
                Choose an image source, select a Figma template, or use a saved campaign draft
              </p>
            </div>
            <SourceSelector
              onSourceSelect={handleSourceSelect}
              onShowFigmaTemplates={() => setShowFigmaTemplates(true)}
            />
          </>
        )}
      </div>
    );
  }

  // Editor phase - show the canvas with sidebars
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Edit Your Post</h2>
          <p className="text-sm text-muted-foreground">
            Add text, shapes, and customize. Saved posts go to your library.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleStartOver}>
            Start Over
          </Button>
        </div>
      </div>

      {/* Template and Draft info bar */}
      {(selectedTemplate || campaignDraft) && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          {selectedTemplate && (
            <div className="flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-primary" />
              <span className="font-medium">Template:</span>
              <span className="text-muted-foreground">{selectedTemplate.name}</span>
              <div className="flex gap-1 ml-2">
                {selectedTemplate.colors.slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
          {campaignDraft && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium">Campaign:</span>
              <span className="text-muted-foreground line-clamp-1 max-w-[300px]">
                {campaignDraft.campaign_idea || "Untitled"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Campaign draft content panel */}
      {campaignDraft && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Campaign Content
          </h3>
          
          {campaignDraft.post_caption && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Post Caption</label>
              <div className="p-3 bg-muted/50 rounded-md text-sm">
                {campaignDraft.post_caption}
              </div>
              <p className="text-xs text-muted-foreground">
                Use AI Assistant in the editor to add this text to your canvas
              </p>
            </div>
          )}
          
          {campaignDraft.tags && campaignDraft.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {campaignDraft.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main editor */}
      <div className="min-h-[600px]">
        <ImageEditorCanvas
          initialImage={getInitialImage()}
          brandColors={getAllColors()}
          brandFonts={getAllFonts()}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
