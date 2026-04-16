import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepCreateAccount from "@/components/onboarding/StepCreateAccount";
import StepPasteWebsite from "@/components/onboarding/StepPasteWebsite";
import StepScanning from "@/components/onboarding/StepScanning";
import StepBusinessSummary from "@/components/onboarding/StepBusinessSummary";
import StepBusinessType from "@/components/onboarding/StepBusinessType";
import StepVisualStyle from "@/components/onboarding/StepVisualStyle";
import StepFontStyle from "@/components/onboarding/StepFontStyle";
import StepGenerateContent from "@/components/onboarding/StepGenerateContent";


const TOTAL_STEPS = 8;

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [userName, setUserName] = useState({ firstName: "", lastName: "" });
  const [scanData, setScanData] = useState<any>(null);
  const [preGeneratedStyles, setPreGeneratedStyles] = useState<Record<string, string> | null>(null);
  const [preGeneratedFontImage, setPreGeneratedFontImage] = useState<string | null>(null);
  const [selectedVisualStyles, setSelectedVisualStyles] = useState<string[]>([]);
  const [selectedFontStyle, setSelectedFontStyle] = useState<string>("clean-modern-sans");
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  // Check if user is already authenticated - if so skip step 0
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        if (step === 0) setStep(1);
      }
    });
  }, []);

  const handleAccountCreated = () => {
    setIsAuthenticated(true);
    setStep(1);
  };

  const handleWebsiteSubmit = (url: string, firstName: string, lastName: string) => {
    setWebsiteUrl(url);
    setUserName({ firstName, lastName });
    setStep(2);
  };

  const handleScanComplete = useCallback((data: any) => {
    setScanData(data);
    setStep(3);

    // Pre-generate visual style images in background so they're ready by Step 6
    const biz = data?.businessSummary || {};
    const fallback = typeof data?.summary === "object" && data?.summary?.businessName ? data.summary : {};
    const merged = { ...fallback, ...biz };
    const parts: string[] = [];
    if (merged.businessName) parts.push(merged.businessName);
    if (merged.industry) parts.push(`in the ${merged.industry} industry`);
    if (merged.description) parts.push(`— ${merged.description}`);
    if (merged.valueProposition) parts.push(`Value: ${merged.valueProposition}`);
    const businessContext = parts.length > 0 ? parts.join(" ") : "modern professional business";

    // Pre-generate visual style images
    supabase.functions.invoke("generate-style-previews", {
      body: { businessContext },
    }).then(({ data: styleData }) => {
      if (styleData?.styles) {
        const images: Record<string, string> = {};
        for (const style of styleData.styles) {
          if (style.imageUrl) images[style.id] = style.imageUrl;
        }
        setPreGeneratedStyles(images);
      }
    }).catch((err) => console.error("Background style generation failed:", err));

    // Pre-generate font preview background image
    const fontImagePrompt = [
      `A professional, high-quality marketing hero photograph for a ${merged.industry || "business"} company called "${merged.businessName || "a brand"}".`,
      merged.description ? `The business: ${merged.description.slice(0, 200)}.` : "",
      "Create a visually stunning, cinematic-quality background image suitable for a social media post.",
      "The image should be atmospheric, with depth and mood. No text, no logos, no words. Just a beautiful visual.",
      "Dark enough in areas to allow white text overlay. Aspect ratio 4:5 portrait.",
    ].filter(Boolean).join(" ");

    fetch("https://wkqiielsazzbxziqmgdb.supabase.co/functions/v1/generate-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWlpZWxzYXp6Ynh6aXFtZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE3ODMsImV4cCI6MjA5MTA3Nzc4M30.HAoqLxzj_YdKXhldOzyjR4qaJHVLfaldMY_XKgf8htU`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: fontImagePrompt }),
    }).then(async (r) => {
      const imgData = await r.json();
      const url = typeof imgData?.["σo"] === "string" ? imgData["σo"] : imgData?.imageUrl;
      if (url) setPreGeneratedFontImage(url);
    }).catch((err) => console.error("Background font image generation failed:", err));
  }, []);

  const handleScanError = useCallback((error: string) => {
    // Still proceed with fallback data
    setScanData({ success: true, summary: {}, assetsCount: 0 });
    setStep(3);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar - hide on step 0 (account creation) and step 2 (scanning) */}
      {step !== 0 && step !== 2 && (
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border py-4">
          <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>
      )}

      <div className="pb-16">
        {step === 0 && <StepCreateAccount onNext={handleAccountCreated} />}
        {step === 1 && <StepPasteWebsite onNext={handleWebsiteSubmit} />}
        {step === 2 && (
          <StepScanning
            websiteUrl={websiteUrl}
            onComplete={handleScanComplete}
            onError={handleScanError}
          />
        )}
        {step === 3 && <StepBusinessSummary scanData={scanData} onNext={() => setStep(4)} />}
        {step === 4 && <StepBusinessType onNext={() => setStep(5)} />}
        {step === 5 && <StepVisualStyle scanData={scanData} preGeneratedImages={preGeneratedStyles} onNext={(styles) => { setSelectedVisualStyles(styles); setStep(6); }} />}
        {step === 6 && <StepFontStyle scanData={scanData} preGeneratedImage={preGeneratedFontImage} onNext={(fonts) => { if (fonts?.[0]) setSelectedFontStyle(fonts[0]); setStep(7); }} />}
        {step === 7 && (
          <StepGenerateContent
            scanData={scanData}
            websiteUrl={websiteUrl}
            userName={userName}
            visualStyles={selectedVisualStyles}
            fontStyle={selectedFontStyle}
            onNext={() => navigate("/home")}
          />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
