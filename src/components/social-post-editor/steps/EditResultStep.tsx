import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  RotateCcw,
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

      let imageUrl = wizardState.generatedImageUrl;
      
      if (imageUrl.startsWith("data:")) {
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
    <div className="h-full flex flex-col">
      {/* Main content area - side by side layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left side: Generated Image - constrained to viewport height */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {wizardState.generatedImageUrl ? (
            <div className="relative h-full max-h-[calc(100vh-200px)] flex items-center justify-center">
              <div className="relative rounded-xl overflow-hidden border-2 border-border shadow-lg">
                <img
                  src={wizardState.generatedImageUrl}
                  alt="Generated social post"
                  className="max-h-[calc(100vh-220px)] w-auto object-contain"
                />
                {savedToLibrary && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="aspect-[9/16] max-h-[calc(100vh-220px)] w-auto bg-muted rounded-xl flex items-center justify-center">
              <p className="text-muted-foreground">No image generated yet</p>
            </div>
          )}
        </div>

        {/* Right side: Actions panel */}
        {wizardState.generatedImageUrl && (
          <div className="lg:w-72 xl:w-80 flex flex-col gap-4 shrink-0">
            {/* Edit with AI */}
            <div className="bg-muted/50 rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Wand2 className="w-4 h-4 text-primary" />
                Edit with AI
              </div>
              <p className="text-xs text-muted-foreground">
                Describe changes to make
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="e.g., Make the background darker..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleEditImage()}
                />
                <Button
                  onClick={handleEditImage}
                  disabled={isEditing || !editPrompt.trim()}
                  className="w-full"
                  size="sm"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply Edit"
                  )}
                </Button>
              </div>
            </div>

            {/* Action buttons - stacked vertically */}
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                className="w-full justify-start gap-3"
                size="sm"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveToLibrary}
                disabled={isSaving || savedToLibrary}
                className="w-full justify-start gap-3"
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedToLibrary ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savedToLibrary ? "Saved to Library" : "Save to Library"}
              </Button>

              <Button
                variant="outline"
                onClick={onRegenerate}
                disabled={wizardState.isGenerating}
                className="w-full justify-start gap-3"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open("/profile/library", "_blank")}
                className="w-full justify-start gap-3"
                size="sm"
              >
                <Share2 className="w-4 h-4" />
                View in Library
              </Button>
            </div>

            {/* Start Over */}
            <div className="pt-4 border-t mt-auto">
              <Button 
                variant="ghost" 
                onClick={onStartOver}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                size="sm"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
