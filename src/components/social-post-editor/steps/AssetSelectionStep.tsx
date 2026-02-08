import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FolderOpen,
  Image,
  Type,
  Palette,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import LibraryAssetPicker from "@/components/LibraryAssetPicker";
import { supabase } from "@/integrations/supabase/client";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
import { toast } from "sonner";
import { WizardState, CampaignDraft, SelectedAsset } from "../types";

interface AssetSelectionStepProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function AssetSelectionStep({
  wizardState,
  onUpdate,
  onNext,
  onBack,
}: AssetSelectionStepProps) {
  const [campaignDrafts, setCampaignDrafts] = useState<CampaignDraft[]>([]);
  const [brandFonts, setBrandFonts] = useState<string[]>([]);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Load campaign drafts and brand assets
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load campaign drafts
      const { data: drafts } = await supabase
        .from("campaign_drafts")
        .select("id, campaign_idea, post_caption, image_prompt, content_type, target_audience, tags, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (drafts) {
        setCampaignDrafts(drafts);
      }

      // Load brand fonts
      const { data: fonts } = await supabase
        .from("brand_assets")
        .select("value")
        .eq("user_id", user.id)
        .eq("asset_type", "font");

      if (fonts) {
        setBrandFonts(fonts.map((f) => f.value));
      }

      // Load brand colors
      const { data: colors } = await supabase
        .from("brand_assets")
        .select("value")
        .eq("user_id", user.id)
        .eq("asset_type", "color");

      if (colors) {
        setBrandColors(colors.map((c) => c.value));
      }

      setIsLoadingDrafts(false);
    };
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      const newAssets: SelectedAsset[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;

        const { publicUrl } = await uploadBrandAssetImage({
          userId: user.id,
          file,
          folder: "social-post-assets",
        });

        newAssets.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: publicUrl,
          thumbnailUrl: publicUrl,
          type: "image",
          source: "upload",
        });
      }

      onUpdate({
        selectedAssets: [...wizardState.selectedAssets, ...newAssets],
      });

      toast.success(`${newAssets.length} image(s) added`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGoogleDriveSelect = (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string }>) => {
    const newAssets: SelectedAsset[] = files
      .filter((f) => f.thumbnailUrl)
      .map((f) => ({
        id: f.id,
        name: f.name,
        url: f.thumbnailUrl!,
        thumbnailUrl: f.thumbnailUrl,
        type: "image" as const,
        source: "google-drive" as const,
      }));

    onUpdate({
      selectedAssets: [...wizardState.selectedAssets, ...newAssets],
    });
    setShowGoogleDrive(false);
    toast.success(`${newAssets.length} image(s) added from Google Drive`);
  };

  const handleLibrarySelect = (assets: Array<{ id: string; name: string; url: string; thumbnailUrl?: string; assetType?: string }>) => {
    const newAssets: SelectedAsset[] = assets.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl || a.url,
      type: a.assetType === "logo" ? "logo" : "image",
      source: "library" as const,
    }));

    onUpdate({
      selectedAssets: [...wizardState.selectedAssets, ...newAssets],
    });
    setShowLibrary(false);
    toast.success(`${newAssets.length} asset(s) added from library`);
  };

  const handleRemoveAsset = (assetId: string) => {
    onUpdate({
      selectedAssets: wizardState.selectedAssets.filter((a) => a.id !== assetId),
    });
  };

  const toggleFont = (font: string) => {
    const isSelected = wizardState.selectedFonts.includes(font);
    onUpdate({
      selectedFonts: isSelected
        ? wizardState.selectedFonts.filter((f) => f !== font)
        : [...wizardState.selectedFonts, font],
    });
  };

  const toggleColor = (color: string) => {
    const isSelected = wizardState.selectedColors.includes(color);
    onUpdate({
      selectedColors: isSelected
        ? wizardState.selectedColors.filter((c) => c !== color)
        : [...wizardState.selectedColors, color],
    });
  };

  const handleSelectCampaignDraft = (draftId: string) => {
    const draft = campaignDrafts.find((d) => d.id === draftId) || null;
    onUpdate({ selectedCampaignDraft: draft });
  };

  const canProceed = wizardState.selectedCampaignDraft !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Add Content & Assets</h2>
        <p className="text-muted-foreground mt-1">
          Select a campaign draft and add images, logos, fonts, and colors for your post
        </p>
      </div>

      {/* Campaign Draft Selection */}
      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold">Campaign Draft</span>
          <span className="text-xs text-muted-foreground">(Required)</span>
        </div>
        
        {isLoadingDrafts ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading drafts...</span>
          </div>
        ) : (
          <Select
            value={wizardState.selectedCampaignDraft?.id || ""}
            onValueChange={handleSelectCampaignDraft}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Choose a campaign draft..." />
            </SelectTrigger>
            <SelectContent>
              {campaignDrafts.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No campaign drafts found. Create one first!
                </div>
              ) : (
                campaignDrafts.map((draft) => (
                  <SelectItem key={draft.id} value={draft.id}>
                    <div className="flex flex-col">
                      <span className="truncate max-w-[300px]">
                        {draft.campaign_idea || "Untitled Campaign"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {draft.content_type} • {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        {wizardState.selectedCampaignDraft && (
          <div className="bg-background rounded-lg p-3 text-sm space-y-2">
            {wizardState.selectedCampaignDraft.post_caption && (
              <div>
                <span className="text-muted-foreground">Caption: </span>
                <span className="line-clamp-2">{wizardState.selectedCampaignDraft.post_caption}</span>
              </div>
            )}
            {wizardState.selectedCampaignDraft.tags && wizardState.selectedCampaignDraft.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {wizardState.selectedCampaignDraft.tags.map((tag, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Asset Sources */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          Images & Logos
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Upload */}
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
            )}
            <span className="text-xs font-medium text-center">Upload</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* Klyc Library */}
          <button
            onClick={() => setShowLibrary(true)}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <FolderOpen className="w-6 h-6 text-primary mb-2" />
            <span className="text-xs font-medium text-center">Klyc Library</span>
          </button>

          {/* Google Drive */}
          <button
            onClick={() => setShowGoogleDrive(true)}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <GoogleDriveIcon className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium text-center">Google Drive</span>
          </button>
        </div>

        {/* Selected Assets Preview */}
        {wizardState.selectedAssets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {wizardState.selectedAssets.length} asset(s) selected
            </p>
            <div className="flex flex-wrap gap-2">
              {wizardState.selectedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative group w-16 h-16 rounded-lg overflow-hidden border"
                >
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemoveAsset(asset.id)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brand Fonts */}
      {brandFonts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            Brand Fonts
          </h3>
          <div className="flex flex-wrap gap-2">
            {brandFonts.map((font) => (
              <button
                key={font}
                onClick={() => toggleFont(font)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  wizardState.selectedFonts.includes(font)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                }`}
                style={{ fontFamily: font }}
              >
                {font}
                {wizardState.selectedFonts.includes(font) && (
                  <Check className="w-3 h-3 inline ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand Colors */}
      {brandColors.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Brand Colors
          </h3>
          <div className="flex flex-wrap gap-2">
            {brandColors.map((color) => (
              <button
                key={color}
                onClick={() => toggleColor(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  wizardState.selectedColors.includes(color)
                    ? "border-primary ring-2 ring-primary/30 scale-110"
                    : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              >
                {wizardState.selectedColors.includes(color) && (
                  <Check className="w-4 h-4 mx-auto text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
          className="min-w-[200px]"
        >
          Review & Generate
        </Button>
      </div>

      {/* Pickers */}
      <GoogleDriveFilePicker
        open={showGoogleDrive}
        onOpenChange={setShowGoogleDrive}
        fileTypeFilter="image"
        selectionMode="select"
        onFilesSelected={handleGoogleDriveSelect}
      />


      <LibraryAssetPicker
        open={showLibrary}
        onOpenChange={setShowLibrary}
        onAssetsSelected={handleLibrarySelect}
        maxSelection={20}
        assetTypeFilter="image"
      />
    </div>
  );
}
