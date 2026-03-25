import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Keep static images as fallbacks
import deepContrastImg from "@/assets/styles/deep-contrast.png";
import softEditorialImg from "@/assets/styles/soft-editorial.png";
import cinematicMoodyImg from "@/assets/styles/cinematic-moody.png";
import brightCommercialImg from "@/assets/styles/bright-commercial.png";
import documentaryRealImg from "@/assets/styles/documentary-real.png";
import modernMinimalImg from "@/assets/styles/modern-minimal.png";
import boldLifestyleImg from "@/assets/styles/bold-lifestyle.png";
import luxuryTextureImg from "@/assets/styles/luxury-texture.png";

interface StepVisualStyleProps {
  scanData?: any;
  onNext: (styles: string[]) => void;
}

const fallbackImages: Record<string, string> = {
  "deep-contrast": deepContrastImg,
  "soft-editorial": softEditorialImg,
  "cinematic-moody": cinematicMoodyImg,
  "bright-commercial": brightCommercialImg,
  "documentary-real": documentaryRealImg,
  "modern-minimal": modernMinimalImg,
  "bold-lifestyle": boldLifestyleImg,
  "luxury-texture": luxuryTextureImg,
};

const visualStyles = [
  { id: "deep-contrast", name: "Deep Contrast", description: "Hard tungsten lighting. Orange-teal tones. High contrast. Fine grain. Shallow focus." },
  { id: "soft-editorial", name: "Soft Editorial", description: "Diffuse natural light. Clean whites. Soft skin tones. Minimal contrast. Luxury magazine feel." },
  { id: "cinematic-moody", name: "Cinematic Moody", description: "Low-key lighting. Deep shadows. Rich blacks. Subtle color separation. Dramatic storytelling." },
  { id: "bright-commercial", name: "Bright Commercial", description: "High-key lighting. Crisp clarity. Product-forward framing. Clean highlights. Ad-ready aesthetic." },
  { id: "documentary-real", name: "Documentary Real", description: "Natural available light. Authentic texture. Real-world environments. Honest and grounded." },
  { id: "modern-minimal", name: "Modern Minimal", description: "Neutral backgrounds. Clean composition. Soft shadows. Limited palette. Premium simple design." },
  { id: "bold-lifestyle", name: "Bold Lifestyle", description: "Dynamic framing. Vibrant color. Human energy. Social-first composition. Strong personality." },
  { id: "luxury-texture", name: "Luxury Texture", description: "Rich materials. Warm highlights. Elegant framing. Refined color balance. High-end premium feel." },
];

function getBusinessContext(scanData: any): string {
  const biz = scanData?.businessSummary || {};
  const fallback =
    typeof scanData?.summary === "object" && scanData?.summary?.businessName
      ? scanData.summary
      : {};
  const merged = { ...fallback, ...biz };

  const parts: string[] = [];
  if (merged.businessName) parts.push(merged.businessName);
  if (merged.industry) parts.push(`in the ${merged.industry} industry`);
  if (merged.description) parts.push(`— ${merged.description}`);
  if (merged.valueProposition) parts.push(`Value: ${merged.valueProposition}`);

  return parts.length > 0
    ? parts.join(" ")
    : "modern professional business";
}

const StepVisualStyle = ({ scanData, onNext }: StepVisualStyleProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const generate = async () => {
      try {
        const businessContext = getBusinessContext(scanData);
        const { data, error } = await supabase.functions.invoke(
          "generate-style-previews",
          { body: { businessContext } }
        );

        if (error) throw error;

        if (data?.styles) {
          const images: Record<string, string> = {};
          let count = 0;
          for (const style of data.styles) {
            if (style.imageUrl) {
              images[style.id] = style.imageUrl;
              count++;
            }
          }
          setGeneratedImages(images);
          setLoadedCount(count);
        }
      } catch (err) {
        console.error("Failed to generate style previews:", err);
        // Fallback to static images — already handled by getImage
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [scanData]);

  const getImage = (styleId: string) => {
    return generatedImages[styleId] || fallbackImages[styleId];
  };

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
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse text-primary" />
                Generating custom visuals for your brand...
              </span>
            ) : loadedCount > 0 ? (
              "We styled each look to match your brand. Select one or more."
            ) : (
              "Select one or multiple styles Klyc can use when creating content for your brand."
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {visualStyles.map((style) => {
            const img = getImage(style.id);
            const isGenerating = loading && !generatedImages[style.id];

            return (
              <button
                key={style.id}
                onClick={() => !loading && toggle(style.id)}
                disabled={loading}
                className={cn(
                  "relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200 text-left group",
                  selected.has(style.id)
                    ? "border-primary shadow-lg scale-[1.02]"
                    : "border-border hover:border-primary/40 hover:shadow-sm",
                  loading && "opacity-80 cursor-wait"
                )}
              >
                {/* Image area */}
                <div className="aspect-[9/16] w-full overflow-hidden relative bg-muted">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-full animate-ping opacity-20"
                          style={{
                            background:
                              "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))",
                          }}
                        />
                        <div
                          className="absolute inset-0 w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))",
                          }}
                        >
                          <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Creating...
                      </span>
                    </div>
                  ) : (
                    <img
                      src={img}
                      alt={style.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>

                {/* Check overlay */}
                {selected.has(style.id) && (
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                {/* AI badge when custom generated */}
                {generatedImages[style.id] && !loading && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-white" />
                    <span className="text-[10px] text-white font-medium">
                      Your brand
                    </span>
                  </div>
                )}

                <div className="p-3">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {style.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {style.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => onNext(Array.from(selected))}
            disabled={selected.size === 0 || loading}
            size="lg"
            className="h-12 px-10 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepVisualStyle;
