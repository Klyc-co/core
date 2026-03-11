import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepFontStyleProps {
  onNext: (fonts: string[]) => void;
}

const fontStyles = [
  {
    id: "clean-modern-sans",
    name: "Clean Modern Sans",
    description: "Minimal, crisp, startup-ready sans serif with strong readability.",
    sample: "Aa Bb Cc 123",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    weight: 400,
  },
  {
    id: "editorial-serif",
    name: "Editorial Serif",
    description: "Elegant serif style for premium storytelling and authority.",
    sample: "Aa Bb Cc 123",
    fontFamily: "Georgia, 'Times New Roman', serif",
    weight: 400,
  },
  {
    id: "bold-geometric",
    name: "Bold Geometric",
    description: "Structured, modern, high-confidence type for strong statements.",
    sample: "Aa Bb Cc 123",
    fontFamily: "'Sora', 'Arial Black', sans-serif",
    weight: 700,
  },
  {
    id: "humanist-sans",
    name: "Humanist Sans",
    description: "Warm, approachable, softer modern type with personality.",
    sample: "Aa Bb Cc 123",
    fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
    weight: 400,
  },
  {
    id: "luxury-contrast",
    name: "Luxury Contrast",
    description: "Refined high-end type pairing style with a premium feel.",
    sample: "Aa Bb Cc 123",
    fontFamily: "'Playfair Display', Georgia, serif",
    weight: 600,
  },
];

const StepFontStyle = ({ onNext }: StepFontStyleProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
            We scanned your website and found your current visual language. Select the font styles Klyc can use moving forward.
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
              {/* Type sample */}
              <div className="w-32 flex-shrink-0 text-center">
                <span
                  className="text-2xl text-foreground"
                  style={{ fontFamily: font.fontFamily, fontWeight: font.weight }}
                >
                  {font.sample}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">{font.name}</h3>
                <p className="text-xs text-muted-foreground">{font.description}</p>
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
