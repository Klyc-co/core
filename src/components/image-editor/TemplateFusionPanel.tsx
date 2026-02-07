import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Wand2, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TemplateFusionPanelProps {
  brandFonts: string[];
  brandColors: string[];
  onImageGenerated: (imageUrl: string) => void;
}

export default function TemplateFusionPanel({
  brandFonts,
  brandColors,
  onImageGenerated,
}: TemplateFusionPanelProps) {
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [campaignImage, setCampaignImage] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const templateInputRef = useRef<HTMLInputElement>(null);
  const campaignInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFuse = async () => {
    if (!templateImage) {
      toast.error("Please upload a template image first");
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("fuse-template", {
        body: {
          templateImageUrl: templateImage,
          campaignImageUrl: campaignImage,
          captionText: captionText.trim() || undefined,
          brandFonts,
          brandColors,
        },
      });

      if (error) throw error;

      if (!data?.imageUrl) {
        throw new Error(data?.error || "No image was generated");
      }

      onImageGenerated(data.imageUrl);
      toast.success("Template fusion complete!");
      
      // Clear the form
      setTemplateImage(null);
      setCampaignImage(null);
      setCaptionText("");
    } catch (error) {
      console.error("Fusion failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fuse template";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">AI Template Fusion</h3>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Upload a Buzz/social template PNG + your campaign image. AI will recreate it with your brand fonts & colors.
      </p>

      {/* Template Image Upload */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Template Image *</Label>
        {templateImage ? (
          <div className="relative group">
            <img
              src={templateImage}
              alt="Template"
              className="w-full h-24 object-cover rounded-md border"
            />
            <button
              onClick={() => setTemplateImage(null)}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => templateInputRef.current?.click()}
            className="w-full h-20 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload template PNG</span>
          </button>
        )}
        <input
          ref={templateInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, setTemplateImage)}
          className="hidden"
        />
      </div>

      {/* Campaign Image Upload */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Campaign Image (optional)</Label>
        {campaignImage ? (
          <div className="relative group">
            <img
              src={campaignImage}
              alt="Campaign"
              className="w-full h-24 object-cover rounded-md border"
            />
            <button
              onClick={() => setCampaignImage(null)}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => campaignInputRef.current?.click()}
            className="w-full h-16 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add product/campaign image</span>
          </button>
        )}
        <input
          ref={campaignInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, setCampaignImage)}
          className="hidden"
        />
      </div>

      {/* Caption Text */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Post Text (optional)</Label>
        <Textarea
          placeholder="e.g., 'Summer Sale - 50% OFF all items!'"
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          className="min-h-[60px] text-sm resize-none"
        />
      </div>

      {/* Brand Info Display */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {brandFonts.length > 0 && (
          <span className="bg-muted px-2 py-0.5 rounded">
            {brandFonts.length} brand font{brandFonts.length > 1 ? "s" : ""}
          </span>
        )}
        {brandColors.length > 0 && (
          <div className="flex items-center gap-1">
            {brandColors.slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            ))}
            {brandColors.length > 4 && (
              <span className="text-muted-foreground">+{brandColors.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleFuse}
        disabled={isGenerating || !templateImage}
        className="w-full"
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Fusing Template...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Social Post
          </>
        )}
      </Button>
    </div>
  );
}
