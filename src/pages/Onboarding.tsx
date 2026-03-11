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
import StepPricing from "@/components/onboarding/StepPricing";
import StepPayment from "@/components/onboarding/StepPayment";
import StepGenerateContent from "@/components/onboarding/StepGenerateContent";
import StepPendingApprovals from "@/components/onboarding/StepPendingApprovals";

const TOTAL_STEPS = 11;

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scanData, setScanData] = useState<any>(null);
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
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

  const handleWebsiteSubmit = (url: string) => {
    setWebsiteUrl(url);
    setStep(2);
  };

  const handleScanComplete = useCallback((data: any) => {
    setScanData(data);
    setStep(3);
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
        {step === 5 && <StepVisualStyle onNext={() => setStep(6)} />}
        {step === 6 && <StepFontStyle onNext={() => setStep(7)} />}
        {step === 7 && <StepPricing onNext={() => setStep(8)} />}
        {step === 8 && <StepPayment onNext={() => setStep(9)} />}
        {step === 9 && <StepGenerateContent onNext={(posts) => { setGeneratedPosts(posts); setStep(10); }} />}
        {step === 10 && <StepPendingApprovals posts={generatedPosts} />}
      </div>
    </div>
  );
};

export default Onboarding;
