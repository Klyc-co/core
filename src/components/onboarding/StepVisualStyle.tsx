import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepVisualStyleProps {
  onNext: (styles: string[]) => void;
}

const visualStyles = [
  {
    id: "deep-contrast",
    name: "Deep Contrast",
    description: "Hard tungsten lighting. Orange-teal tones. High contrast. Fine grain. Shallow focus.",
    gradient: "linear-gradient(135deg, #f97316, #0d9488)",
  },
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    description: "Diffuse natural light. Clean whites. Soft skin tones. Minimal contrast. Luxury magazine feel.",
    gradient: "linear-gradient(135deg, #fef3c7, #fce7f3)",
  },
  {
    id: "cinematic-moody",
    name: "Cinematic Moody",
    description: "Low-key lighting. Deep shadows. Rich blacks. Subtle color separation. Dramatic storytelling.",
    gradient: "linear-gradient(135deg, #1e1b4b, #312e81)",
  },
  {
    id: "bright-commercial",
    name: "Bright Commercial",
    description: "High-key lighting. Crisp clarity. Product-forward framing. Clean highlights. Ad-ready aesthetic.",
    gradient: "linear-gradient(135deg, #60a5fa, #34d399)",
  },
  {
    id: "documentary-real",
    name: "Documentary Real",
    description: "Natural available light. Authentic texture. Real-world environments. Honest and grounded.",
    gradient: "linear-gradient(135deg, #78716c, #a8a29e)",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Neutral backgrounds. Clean composition. Soft shadows. Limited palette. Premium simple design.",
    gradient: "linear-gradient(135deg, #e5e7eb, #f9fafb)",
  },
  {
    id: "bold-lifestyle",
    name: "Bold Lifestyle",
    description: "Dynamic framing. Vibrant color. Human energy. Social-first composition. Strong personality.",
    gradient: "linear-gradient(135deg, #ec4899, #f59e0b)",
  },
  {
    id: "luxury-texture",
    name: "Luxury Texture",
    description: "Rich materials. Warm highlights. Elegant framing. Refined color balance. High-end premium feel.",
    gradient: "linear-gradient(135deg, #92400e, #d4a053)",
  },
];

const StepVisualStyle = ({ onNext }: StepVisualStyleProps) => {
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Choose your visual style.
          </h1>
          <p className="text-muted-foreground">
            Select one or multiple styles Klyc can use when creating content for your brand.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {visualStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => toggle(style.id)}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200 text-left group",
                selected.has(style.id)
                  ? "border-primary shadow-lg scale-[1.02]"
                  : "border-border hover:border-primary/40 hover:shadow-sm"
              )}
            >
              {/* Visual preview area */}
              <div
                className="h-28 w-full"
                style={{ background: style.gradient }}
              />

              {/* Check overlay */}
              {selected.has(style.id) && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}

              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground mb-1">{style.name}</h3>
                <p className="text-xs text-muted-foreground leading-snug">{style.description}</p>
              </div>
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

export default StepVisualStyle;
