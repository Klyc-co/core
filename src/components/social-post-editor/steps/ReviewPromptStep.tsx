import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Sparkles,
  Image,
  Type,
  Palette,
  FileText,
  Layout,
  Loader2,
  Wand2,
} from "lucide-react";
import { WizardState, ASPECT_RATIO_OPTIONS } from "../types";

interface ReviewPromptStepProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onGenerate: () => void;
  onBack: () => void;
}

export default function ReviewPromptStep({
  wizardState,
  onUpdate,
  onGenerate,
  onBack,
}: ReviewPromptStepProps) {
  const [prompt, setPrompt] = useState("");

  // Generate the AI prompt based on all selected content
  useEffect(() => {
    const generatePrompt = () => {
      const parts: string[] = [];

      // Get aspect ratio info
      const aspectInfo = ASPECT_RATIO_OPTIONS.find((o) => o.value === wizardState.aspectRatio);
      const aspectLabel = aspectInfo?.label || "Portrait";
      const aspectDimensions = aspectInfo?.dimensions || "1080×1920";

      parts.push(`Create a professional social media post image in ${aspectLabel.toUpperCase()} format (${aspectDimensions}) with the following specifications:`);
      parts.push("");

      // Template reference
      if (wizardState.selectedTemplate) {
        parts.push(`TEMPLATE STYLE: Use the uploaded template image as the primary design reference. Recreate its layout, composition, and visual hierarchy, adapted to ${aspectLabel} ${aspectDimensions} dimensions.`);
        parts.push("");
      }

      // Campaign content
      if (wizardState.selectedCampaignDraft) {
        parts.push("CAMPAIGN CONTENT:");
        if (wizardState.selectedCampaignDraft.campaign_idea) {
          parts.push(`- Campaign Theme: ${wizardState.selectedCampaignDraft.campaign_idea}`);
        }
        if (wizardState.selectedCampaignDraft.post_caption) {
          parts.push(`- Post Caption/Text: "${wizardState.selectedCampaignDraft.post_caption}"`);
        }
        if (wizardState.selectedCampaignDraft.target_audience) {
          parts.push(`- Target Audience: ${wizardState.selectedCampaignDraft.target_audience}`);
        }
        if (wizardState.selectedCampaignDraft.content_type) {
          parts.push(`- Content Type: ${wizardState.selectedCampaignDraft.content_type}`);
        }
        parts.push("");
      }

      // Custom prompt
      if (wizardState.customPrompt?.trim()) {
        parts.push("USER INSTRUCTIONS:");
        parts.push(wizardState.customPrompt.trim());
        parts.push("");
      }

      // Product info
      if (wizardState.selectedProduct) {
        parts.push("PRODUCT DETAILS:");
        parts.push(`- Product Name: ${wizardState.selectedProduct.name}`);
        if (wizardState.selectedProduct.short_description) {
          parts.push(`- Description: ${wizardState.selectedProduct.short_description}`);
        }
        if (wizardState.selectedProduct.value_propositions) {
          parts.push(`- Value Propositions: ${wizardState.selectedProduct.value_propositions}`);
        }
        if (wizardState.selectedProduct.target_audience) {
          parts.push(`- Target Audience: ${wizardState.selectedProduct.target_audience}`);
        }
        parts.push("");

      // Assets
      if (wizardState.selectedAssets.length > 0) {
        const logos = wizardState.selectedAssets.filter((a) => a.type === "logo");
        const images = wizardState.selectedAssets.filter((a) => a.type === "image");

        if (logos.length > 0) {
          parts.push(`LOGOS: Include ${logos.length} logo(s) from the uploaded assets. Place them appropriately (typically corner or footer).`);
        }
        if (images.length > 0) {
          parts.push(`IMAGES: Incorporate ${images.length} additional image(s) from the uploaded assets as visual elements.`);
        }
        parts.push("");
      }

      // Fonts
      if (wizardState.selectedFonts.length > 0) {
        parts.push(`TYPOGRAPHY: Use these brand fonts for text: ${wizardState.selectedFonts.join(", ")}`);
        parts.push("");
      }

      // Colors
      if (wizardState.selectedColors.length > 0) {
        parts.push(`COLOR PALETTE: Use these brand colors: ${wizardState.selectedColors.join(", ")}`);
        parts.push("");
      }

      // Final instructions
      parts.push("IMPORTANT INSTRUCTIONS:");
      parts.push("- The first image is the TEMPLATE - use it as the design reference/style guide");
      parts.push("- Subsequent images are ASSETS to incorporate into the design");
      parts.push("- Maintain visual hierarchy and professional composition");
      parts.push("- Ensure text is readable and well-positioned");
      parts.push("- Create a cohesive, brand-aligned final image");
      parts.push("- Output only the generated image, no additional text");

      return parts.join("\n");
    };

    const generatedPrompt = generatePrompt();
    setPrompt(generatedPrompt);
    onUpdate({ generatedPrompt: generatedPrompt });
  }, [
    wizardState.aspectRatio,
    wizardState.selectedTemplate,
    wizardState.selectedCampaignDraft,
    wizardState.selectedAssets,
    wizardState.selectedFonts,
    wizardState.selectedColors,
  ]);

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    onUpdate({ generatedPrompt: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review & Generate</h2>
        <p className="text-muted-foreground mt-1">
          Review all your content and the AI prompt before generating your social post
        </p>
      </div>

      {/* Content Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Template Preview */}
        <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Layout className="w-5 h-5 text-primary" />
            Template
          </div>
          {wizardState.selectedTemplate && (
            <div className="aspect-square max-w-[200px] rounded-lg overflow-hidden border">
              <img
                src={wizardState.selectedTemplate.previewUrl}
                alt={wizardState.selectedTemplate.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {wizardState.selectedTemplate?.name || "No template selected"}
          </p>
        </div>

        {/* Campaign Draft */}
        <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-5 h-5 text-primary" />
            Campaign Draft
          </div>
          {wizardState.selectedCampaignDraft ? (
            <div className="space-y-2 text-sm">
              <p className="line-clamp-2">
                <span className="text-muted-foreground">Idea: </span>
                {wizardState.selectedCampaignDraft.campaign_idea || "—"}
              </p>
              <p className="line-clamp-2">
                <span className="text-muted-foreground">Caption: </span>
                {wizardState.selectedCampaignDraft.post_caption || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Type: </span>
                {wizardState.selectedCampaignDraft.content_type || "—"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No campaign selected</p>
          )}
        </div>

        {/* Assets */}
        <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Image className="w-5 h-5 text-primary" />
            Assets ({wizardState.selectedAssets.length})
          </div>
          {wizardState.selectedAssets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {wizardState.selectedAssets.slice(0, 6).map((asset) => (
                <div key={asset.id} className="w-12 h-12 rounded overflow-hidden border">
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {wizardState.selectedAssets.length > 6 && (
                <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{wizardState.selectedAssets.length - 6}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No additional assets</p>
          )}
        </div>

        {/* Fonts & Colors */}
        <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Type className="w-5 h-5 text-primary" />
            Brand Styling
          </div>
          <div className="space-y-2">
            {wizardState.selectedFonts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {wizardState.selectedFonts.map((font) => (
                  <span key={font} className="text-xs bg-background px-2 py-1 rounded border">
                    {font}
                  </span>
                ))}
              </div>
            )}
            {wizardState.selectedColors.length > 0 && (
              <div className="flex gap-1">
                {wizardState.selectedColors.map((color) => (
                  <div
                    key={color}
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
            {wizardState.selectedFonts.length === 0 && wizardState.selectedColors.length === 0 && (
              <p className="text-sm text-muted-foreground">No brand styling selected</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Prompt */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <FileText className="w-5 h-5 text-primary" />
            AI Generation Prompt
          </div>
          <span className="text-xs text-muted-foreground">
            You can edit this prompt before generating
          </span>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          placeholder="The AI prompt will be generated based on your selections..."
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={wizardState.isGenerating}
          className="min-w-[200px] gap-2"
        >
          {wizardState.isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate Social Post
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
