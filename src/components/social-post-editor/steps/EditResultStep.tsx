import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
  Wand2,
  Save,
  Check,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WizardState } from "../types";

interface EditResultStepProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onRegenerate: () => void;
  onStartOver: () => void;
}

export default function EditResultStep({
  wizardState,
  onUpdate,
  onRegenerate,
  onStartOver,
}: EditResultStepProps) {
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  const handleEditImage = async () => {
    if (!editPrompt.trim() || !wizardState.generatedImageUrl) {
      toast.error("Please enter an edit instruction");
      return;
    }

    setIsEditing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const response = await supabase.functions.invoke("fuse-template", {
        body: {
          templateImageUrl: wizardState.generatedImageUrl,
          campaignImageUrl: null,
          postText: editPrompt,
          brandFonts: wizardState.selectedFonts,
          brandColors: wizardState.selectedColors,
          isEditMode: true,
          aspectRatio: wizardState.aspectRatio,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.imageUrl) {
        onUpdate({ generatedImageUrl: response.data.imageUrl });
        toast.success("Image edited successfully!");
        setEditPrompt("");
      } else {
        throw new Error("No image returned from edit");
      }
    } catch (error) {
      console.error("Edit failed:", error);
      toast.error("Failed to edit image. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!wizardState.generatedImageUrl) return;

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      // Convert base64 to blob if needed
      let imageUrl = wizardState.generatedImageUrl;
      
      if (imageUrl.startsWith("data:")) {
        // Upload base64 to storage
        const base64Data = imageUrl.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });

        const fileName = `social-post-${Date.now()}.png`;
        const filePath = `${user.id}/social-posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("brand-assets")
          .upload(filePath, blob, { contentType: "image/png" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("brand-assets")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Save to brand_assets
      await supabase.from("brand_assets").insert({
        user_id: user.id,
        asset_type: "image",
        name: `Social Post - ${new Date().toLocaleDateString()}`,
        value: imageUrl,
        metadata: {
          source: "social-post-generator",
          campaignDraftId: wizardState.selectedCampaignDraft?.id,
          templateId: wizardState.selectedTemplate?.id,
          generatedAt: new Date().toISOString(),
        },
      });

      setSavedToLibrary(true);
      toast.success("Saved to your library!");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save to library");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!wizardState.generatedImageUrl) return;

    const link = document.createElement("a");
    link.href = wizardState.generatedImageUrl;
    link.download = `social-post-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Social Post</h2>
        <p className="text-muted-foreground mt-1">
          Edit, refine, or save your generated social post
        </p>
      </div>

      {/* Generated Image */}
      <div className="flex justify-center">
        <div className="relative max-w-lg w-full">
          {wizardState.generatedImageUrl ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-border shadow-lg">
              <img
                src={wizardState.generatedImageUrl}
                alt="Generated social post"
                className="w-full h-auto"
              />
              {savedToLibrary && (
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Saved to Library
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
              <p className="text-muted-foreground">No image generated yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Section */}
      {wizardState.generatedImageUrl && (
        <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Wand2 className="w-5 h-5 text-primary" />
            Edit with AI
          </div>
          <p className="text-sm text-muted-foreground">
            Describe the changes you'd like to make to the image
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Make the background darker, add more contrast, change the text color..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleEditImage()}
            />
            <Button
              onClick={handleEditImage}
              disabled={isEditing || !editPrompt.trim()}
            >
              {isEditing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {wizardState.generatedImageUrl && (
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSaveToLibrary}
            disabled={isSaving || savedToLibrary}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedToLibrary ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedToLibrary ? "Saved" : "Save to Library"}
          </Button>

          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={wizardState.isGenerating}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onStartOver}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Start Over
        </Button>
        <Button
          variant="default"
          onClick={() => window.open("/profile/library", "_blank")}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          View in Library
        </Button>
      </div>
    </div>
  );
}
