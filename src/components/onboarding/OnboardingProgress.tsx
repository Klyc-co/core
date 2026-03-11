import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  "Account",
  "Website",
  "Scanning",
  "Summary",
  "Brand Type",
  "Visual Style",
  "Typography",
  "Plan",
  "Payment",
  "Generate",
  "Approvals",
];

const OnboardingProgress = ({ currentStep, totalSteps }: OnboardingProgressProps) => {
  const progress = ((currentStep) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {stepLabels[currentStep] || ""}
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, hsl(185 75% 45%), hsl(250 60% 60%), hsl(280 60% 55%))",
          }}
        />
      </div>
    </div>
  );
};

export default OnboardingProgress;
