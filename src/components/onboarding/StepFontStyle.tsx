import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepFontStyleProps {
  scanData?: any;
  onNext: (fonts: string[]) => void;
}

/**
 * Build a short, punchy sample phrase from the scan data.
 * Falls back to the business name or a generic line.
 */
function buildSampleWord(scanData: any | undefined): string {
  const name =
    scanData?.businessSummary?.businessName ||
    scanData?.summary?.businessName ||
    "";

  // Use just the first word of the business name
  if (name) {
    const firstWord = name.trim().split(/\s+/)[0];
    return firstWord || "Brand";
  }

  return "Brand";
}

const StepFontStyle = ({ scanData, onNext }: StepFontStyleProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const samplePhrase = useMemo(() => buildSampleWord(scanData), [scanData]);

  const fontStyles = useMemo(
    () => [
      {
        id: "clean-modern-sans",
        name: "Clean Modern Sans",
        description:
          "Minimal, crisp, startup-ready sans serif with strong readability.",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        weight: 400,
      },
      {
        id: "editorial-serif",
        name: "Editorial Serif",
        description:
          "Elegant serif style for premium storytelling and authority.",
        fontFamily: "Georgia, 'Times New Roman', serif",
        weight: 400,
      },
      {
        id: "bold-geometric",
        name: "Bold Geometric",
        description:
          "Structured, modern, high-confidence type for strong statements.",
        fontFamily: "'Sora', 'Arial Black', sans-serif",
        weight: 700,
      },
      {
        id: "humanist-sans",
        name: "Humanist Sans",
        description:
          "Warm, approachable, softer modern type with personality.",
        fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
        weight: 400,
      },
      {
        id: "luxury-contrast",
        name: "Luxury Contrast",
        description:
          "Refined high-end type pairing style with a premium feel.",
        fontFamily: "'Playfair Display', Georgia, serif",
        weight: 600,
      },
    ],
    []
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Choose your type direction.
          </h1>
          <p className="text-muted-foreground">
            We scanned your website and found your current visual language.
            Select the font styles Klyc can use moving forward.
          </p>
        </div>

        <div className="grid gap-4 mb-10">
          {fontStyles.map((font) => (
            <button
              key={font.id}
              onClick={() => toggle(font.id)}
              className={cn(
                "relative flex items-center gap-5 p-5 rounded-2xl border-2 transition-all duration-200 text-left",
                selected.has(font.id)
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              )}
            >
              {/* Type sample – uses real words from the scanned website */}
              <div className="w-44 flex-shrink-0">
                <span
                  className="text-xl leading-tight text-foreground block"
                  style={{
                    fontFamily: font.fontFamily,
                    fontWeight: font.weight,
                  }}
                >
                  {samplePhrase}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">
                  {font.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {font.description}
                </p>
              </div>

              {selected.has(font.id) && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => onNext(Array.from(selected))}
            disabled={selected.size === 0}
            size="lg"
            className="h-12 px-10 text-base font-semibold"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepFontStyle;
