import { Button } from "@/components/ui/button";
import { CheckCircle2, Pencil } from "lucide-react";

interface StepBusinessSummaryProps {
  scanData: any;
  onNext: () => void;
}

const StepBusinessSummary = ({ scanData, onNext }: StepBusinessSummaryProps) => {
  const summary = scanData?.summary || {};
  const businessName = summary.businessName || "Your Business";
  const description = summary.description || "We analyzed your website and built a comprehensive business profile.";
  const audience = summary.audience || "Your target market";
  const valueProposition = summary.valueProposition || "What makes you unique";
  const positioning = summary.positioning || "Your market positioning";
  const voice = summary.voice || "Your brand voice";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))" }}>
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Here's what Klyc understands about your business.
          </h1>
          <p className="text-muted-foreground">
            Review this summary and make sure we captured your company correctly.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-4">{businessName}</h2>
          <p className="text-foreground/80 leading-relaxed text-[15px]">
            {description} They serve {audience.toLowerCase()}. Their core offering centers around {valueProposition.toLowerCase()}. What sets them apart is {positioning.toLowerCase()}. Their brand communicates with a {voice.toLowerCase()} tone.
          </p>

          {scanData?.assetsCount > 0 && (
            <p className="text-sm text-muted-foreground mt-6 pt-4 border-t border-border">
              <span className="font-semibold text-foreground">{scanData.assetsCount}</span> brand assets were automatically saved to your library.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button onClick={onNext} size="lg" className="h-12 px-8 text-base font-semibold">
            This Looks Good
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
          <Button onClick={onNext} variant="ghost" size="lg" className="h-12 px-8 text-base text-muted-foreground">
            <Pencil className="w-4 h-4 mr-2" />
            Edit Later
          </Button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm text-foreground leading-relaxed">{value}</p>
  </div>
);

export default StepBusinessSummary;
