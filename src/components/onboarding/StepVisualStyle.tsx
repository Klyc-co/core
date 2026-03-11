import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import deepContrastImg from "@/assets/styles/deep-contrast.png";
import softEditorialImg from "@/assets/styles/soft-editorial.png";
import cinematicMoodyImg from "@/assets/styles/cinematic-moody.png";
import brightCommercialImg from "@/assets/styles/bright-commercial.png";
import documentaryRealImg from "@/assets/styles/documentary-real.png";
import modernMinimalImg from "@/assets/styles/modern-minimal.png";
import boldLifestyleImg from "@/assets/styles/bold-lifestyle.png";
import luxuryTextureImg from "@/assets/styles/luxury-texture.png";

interface StepVisualStyleProps {
  onNext: (styles: string[]) => void;
}

const visualStyles = [
  {
    id: "deep-contrast",
    name: "Deep Contrast",
    description: "Hard tungsten lighting. Orange-teal tones. High contrast. Fine grain. Shallow focus.",
    image: deepContrastImg,
  },
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    description: "Diffuse natural light. Clean whites. Soft skin tones. Minimal contrast. Luxury magazine feel.",
    image: softEditorialImg,
  },
  {
    id: "cinematic-moody",
    name: "Cinematic Moody",
    description: "Low-key lighting. Deep shadows. Rich blacks. Subtle color separation. Dramatic storytelling.",
    image: cinematicMoodyImg,
  },
  {
    id: "bright-commercial",
    name: "Bright Commercial",
    description: "High-key lighting. Crisp clarity. Product-forward framing. Clean highlights. Ad-ready aesthetic.",
    image: brightCommercialImg,
  },
  {
    id: "documentary-real",
    name: "Documentary Real",
    description: "Natural available light. Authentic texture. Real-world environments. Honest and grounded.",
    image: documentaryRealImg,
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Neutral backgrounds. Clean composition. Soft shadows. Limited palette. Premium simple design.",
    image: modernMinimalImg,
  },
  {
    id: "bold-lifestyle",
    name: "Bold Lifestyle",
    description: "Dynamic framing. Vibrant color. Human energy. Social-first composition. Strong personality.",
    image: boldLifestyleImg,
  },
  {
    id: "luxury-texture",
    name: "Luxury Texture",
    description: "Rich materials. Warm highlights. Elegant framing. Refined color balance. High-end premium feel.",
    image: luxuryTextureImg,
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
      <div className="w-full max-w-5xl animate-fade-in">
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
              {/* Vertical iPhone-style image */}
              <div className="aspect-[9/16] w-full overflow-hidden">
                <img
                  src={style.image}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Check overlay */}
              {selected.has(style.id) && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 text-primary-foreground" />
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
