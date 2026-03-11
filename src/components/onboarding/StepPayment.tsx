import { Button } from "@/components/ui/button";
import { ArrowRight, CreditCard, Info } from "lucide-react";

interface StepPaymentProps {
  onNext: () => void;
}

const StepPayment = ({ onNext }: StepPaymentProps) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Payment flow currently in testing.
          </h1>
          <p className="text-muted-foreground">
            You can continue for now and explore the product experience.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {/* Placeholder payment UI */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="h-3 w-40 bg-secondary rounded" />
                <div className="h-2 w-24 bg-secondary rounded mt-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                <div className="h-2 w-16 bg-secondary rounded mb-2" />
                <div className="h-3 w-full bg-secondary rounded" />
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                <div className="h-2 w-10 bg-secondary rounded mb-2" />
                <div className="h-3 w-full bg-secondary rounded" />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200/60 mb-6">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Live payment processing will be enabled soon. You can proceed to explore the full product experience.
            </p>
          </div>

          <Button onClick={onNext} className="w-full h-12 text-base font-semibold">
            Continue to Klyc
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepPayment;
