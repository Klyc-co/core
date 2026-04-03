import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "brief", label: "Brief" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "schedule", label: "Schedule" },
  { id: "publish", label: "Publish" },
] as const;

export type CampaignStep = (typeof STEPS)[number]["id"];

interface CampaignStepperProps {
  currentStep: CampaignStep;
  onStepClick?: (step: CampaignStep) => void;
  completedSteps?: CampaignStep[];
}

export default function CampaignStepper({ currentStep, onStepClick, completedSteps = [] }: CampaignStepperProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isClickable = !!onStepClick && (isCompleted || i <= currentIdx);

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(step.id)}
              className={cn(
                "flex items-center gap-2 group",
                isClickable && "cursor-pointer",
                !isClickable && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline transition-colors",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                  isClickable && "group-hover:text-foreground"
                )}
              >
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2",
                  isCompleted ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
