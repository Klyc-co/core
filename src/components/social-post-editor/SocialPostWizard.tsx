import { useState } from "react";
import { WizardState, initialWizardState } from "./types";
import TemplateSelectionStep from "./steps/TemplateSelectionStep";
import AssetSelectionStep from "./steps/AssetSelectionStep";
import ReviewPromptStep from "./steps/ReviewPromptStep";
import EditResultStep from "./steps/EditResultStep";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SocialPostWizardProps {
  brandColors: string[];
  brandFonts: string[];
}

export default function SocialPostWizard({
  brandColors,
  brandFonts,
}: SocialPostWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>({
    ...initialWizardState,
    selectedColors: brandColors,
    selectedFonts: brandFonts,
  });

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    updateState({ step });
  };

  const handleGenerate = async () => {
    updateState({ isGenerating: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        updateState({ isGenerating: false });
        return;
      }

      // Safety check: the backend/AI provider cannot use relative paths like /src/...
      if (wizardState.templateImageUrl?.startsWith("/")) {
        toast.error("Please re-select your template (it must load as a public URL or base64).", {
          description: "This template URL looks like a local path. Click the template again, wait a moment, then Generate.",
        });
        updateState({ isGenerating: false, step: 1 });
        return;
      }

      // Prepare images to send to the AI
      const imageUrls: string[] = [];

      // Add template as first image (this is the reference)
      if (wizardState.templateImageUrl) {
        imageUrls.push(wizardState.templateImageUrl);
      }

      // Add selected assets
      for (const asset of wizardState.selectedAssets) {
        if (asset.url) {
          imageUrls.push(asset.url);
        }
      }

      // Call the fuse-template function with all content
      const response = await supabase.functions.invoke("fuse-template", {
        body: {
          templateImageUrl: wizardState.templateImageUrl,
          campaignImageUrl: imageUrls.length > 1 ? imageUrls[1] : null,
          additionalAssets: imageUrls.slice(2),
          postText: wizardState.selectedCampaignDraft?.post_caption || "",
          campaignIdea: wizardState.selectedCampaignDraft?.campaign_idea || "",
          targetAudience: wizardState.selectedCampaignDraft?.target_audience || "",
          brandFonts: wizardState.selectedFonts,
          brandColors: wizardState.selectedColors,
          customPrompt: wizardState.generatedPrompt,
          aspectRatio: wizardState.aspectRatio,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.imageUrl) {
        updateState({
          generatedImageUrl: response.data.imageUrl,
          step: 4,
          isGenerating: false,
        });
        toast.success("Social post generated!");
      } else {
        throw new Error("No image returned from generation");
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate social post. Please try again.");
      updateState({ isGenerating: false });
    }
  };

  const handleRegenerate = () => {
    goToStep(3);
    handleGenerate();
  };

  const handleStartOver = () => {
    setWizardState({
      ...initialWizardState,
      selectedColors: brandColors,
      selectedFonts: brandFonts,
    });
  };

  // Progress indicator
  const steps = [
    { num: 1, label: "Template" },
    { num: 2, label: "Assets" },
    { num: 3, label: "Review" },
    { num: 4, label: "Result" },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => s.num < wizardState.step && goToStep(s.num as 1 | 2 | 3 | 4)}
              disabled={s.num > wizardState.step}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                s.num === wizardState.step
                  ? "bg-primary text-primary-foreground font-medium"
                  : s.num < wizardState.step
                  ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  s.num < wizardState.step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {wizardState.step === 1 && (
          <TemplateSelectionStep
            wizardState={wizardState}
            onUpdate={updateState}
            onNext={() => goToStep(2)}
          />
        )}
        {wizardState.step === 2 && (
          <AssetSelectionStep
            wizardState={wizardState}
            onUpdate={updateState}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}
        {wizardState.step === 3 && (
          <ReviewPromptStep
            wizardState={wizardState}
            onUpdate={updateState}
            onGenerate={handleGenerate}
            onBack={() => goToStep(2)}
          />
        )}
        {wizardState.step === 4 && (
          <EditResultStep
            wizardState={wizardState}
            onUpdate={updateState}
            onRegenerate={handleRegenerate}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </div>
  );
}
