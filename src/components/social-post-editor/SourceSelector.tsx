import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FolderOpen, Sparkles, Layout, Palette, Loader2 } from "lucide-react";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import FigmaIcon from "@/components/icons/FigmaIcon";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import LibraryAssetPicker from "@/components/LibraryAssetPicker";
import CampaignDraftPicker from "./CampaignDraftPicker";
import { EditorSource, CampaignDraft } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
import { toast } from "sonner";

interface SourceSelectorProps {
  onSourceSelect: (source: EditorSource) => void;
  onShowFigmaTemplates: () => void;
}

export default function SourceSelector({
  onSourceSelect,
  onShowFigmaTemplates,
}: SourceSelectorProps) {
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCampaignDrafts, setShowCampaignDrafts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        onSourceSelect({ type: "upload", data: { url: dataUrl, name: file.name } });

        // Save to library in background
        try {
          const { publicUrl } = await uploadBrandAssetImage({
            userId: user.id,
            file,
            folder: "social-post-uploads",
          });

          await supabase.from("brand_assets").insert({
            user_id: user.id,
            asset_type: "image",
            name: file.name,
            value: publicUrl,
            metadata: { source: "social-post-editor" },
          });

          toast.success("Image saved to library");
        } catch (error) {
          console.error("Failed to save to library:", error);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGoogleDriveSelect = (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string }>) => {
    if (files.length > 0 && files[0].thumbnailUrl) {
      onSourceSelect({
        type: "google-drive",
        data: { url: files[0].thumbnailUrl, name: files[0].name },
      });
    }
    setShowGoogleDrive(false);
  };

  const handleLibrarySelect = (assets: Array<{ id: string; name: string; url: string; thumbnailUrl?: string }>) => {
    if (assets.length > 0) {
      onSourceSelect({
        type: "library",
        data: { url: assets[0].url, name: assets[0].name },
      });
    }
    setShowLibrary(false);
  };

  const handleCampaignDraftSelect = (draft: CampaignDraft) => {
    onSourceSelect({ type: "campaign-draft", data: draft });
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Choose Your Source</h2>
        <p className="text-sm text-muted-foreground">
          Select an image source or template to start creating your social post
        </p>

        {/* Primary sources grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Upload */}
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
            )}
            <span className="text-sm font-medium">Upload Image</span>
            <span className="text-xs text-muted-foreground">From your device</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* Google Drive */}
          <button
            onClick={() => setShowGoogleDrive(true)}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <GoogleDriveIcon className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Google Drive</span>
            <span className="text-xs text-muted-foreground">Select from Drive</span>
          </button>

          {/* Klyc Library */}
          <button
            onClick={() => setShowLibrary(true)}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <FolderOpen className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">Klyc Library</span>
            <span className="text-xs text-muted-foreground">Your saved assets</span>
          </button>
        </div>

        {/* Secondary sources */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Figma Templates */}
          <button
            onClick={onShowFigmaTemplates}
            className="flex items-center gap-4 p-4 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <FigmaIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium block">Figma Templates</span>
              <span className="text-xs text-muted-foreground">Professional social layouts</span>
            </div>
            <Layout className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          {/* Campaign Drafts */}
          <button
            onClick={() => setShowCampaignDrafts(true)}
            className="flex items-center gap-4 p-4 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium block">Campaign Drafts</span>
              <span className="text-xs text-muted-foreground">Use saved campaign content</span>
            </div>
          </button>
        </div>

        {/* Blank canvas option */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onSourceSelect({ type: "blank" })}
        >
          <Palette className="w-4 h-4 mr-2" />
          Start with Blank Canvas
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
        maxSelection={1}
        assetTypeFilter="image"
      />

      <CampaignDraftPicker
        open={showCampaignDrafts}
        onOpenChange={setShowCampaignDrafts}
        onSelectDraft={handleCampaignDraftSelect}
      />
    </>
  );
}
