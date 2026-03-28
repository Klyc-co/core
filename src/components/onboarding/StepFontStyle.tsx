import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface StepFontStyleProps {
  scanData?: any;
  preGeneratedImage?: string | null;
  onNext: (fonts: string[]) => void;
}

function getBusinessInfo(scanData: any) {
  const biz = scanData?.businessSummary || {};
  const fallback =
    typeof scanData?.summary === "object" && scanData?.summary?.businessName
      ? scanData.summary
      : {};
  const merged = { ...fallback, ...biz };
  return {
    name: merged.businessName || "Your Business",
    description: merged.description || "",
    industry: merged.industry || "",
    valueProposition: merged.valueProposition || "",
    audience: merged.targetAudience || merged.audience || "",
  };
}

const fontStyles = [
  {
    id: "clean-modern-sans",
    name: "Clean Modern Sans",
    description: "Minimal, crisp, startup-ready sans serif with strong readability.",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    weight: 600,
    headingSize: "text-2xl",
    bodySize: "text-sm",
    spacing: "tracking-tight",
  },
  {
    id: "editorial-serif",
    name: "Editorial Serif",
    description: "Elegant serif style for premium storytelling and authority.",
    fontFamily: "Georgia, 'Times New Roman', serif",
    weight: 400,
    headingSize: "text-3xl",
    bodySize: "text-sm",
    spacing: "tracking-normal",
  },
  {
    id: "bold-geometric",
    name: "Bold Geometric",
    description: "Structured, modern, high-confidence type for strong statements.",
    fontFamily: "'Arial Black', 'Sora', sans-serif",
    weight: 900,
    headingSize: "text-2xl",
    bodySize: "text-xs",
    spacing: "tracking-wide uppercase",
  },
  {
    id: "humanist-sans",
    name: "Humanist Sans",
    description: "Warm, approachable, softer modern type with personality.",
    fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
    weight: 500,
    headingSize: "text-2xl",
    bodySize: "text-sm",
    spacing: "tracking-normal",
  },
  {
    id: "luxury-contrast",
    name: "Luxury Contrast",
    description: "Refined high-end type pairing style with a premium feel.",
    fontFamily: "'Playfair Display', Georgia, serif",
    weight: 700,
    headingSize: "text-3xl",
    bodySize: "text-xs",
    spacing: "tracking-widest uppercase",
  },
];

const StepFontStyle = ({ scanData, preGeneratedImage, onNext }: StepFontStyleProps) => {
  const [selected, setSelected] = useState<string>("clean-modern-sans");
  const [imageUrl, setImageUrl] = useState<string | null>(preGeneratedImage || null);
  const [imageLoading, setImageLoading] = useState(!preGeneratedImage);
  const [imageError, setImageError] = useState(false);

  // Use pre-generated image when it arrives
  useEffect(() => {
    if (preGeneratedImage && !imageUrl) {
      setImageUrl(preGeneratedImage);
      setImageLoading(false);
    }
  }, [preGeneratedImage]);

  const biz = useMemo(() => getBusinessInfo(scanData), [scanData]);

  // Build a short, punchy 5-7 word headline — never truncated
  const marketingHeadline = useMemo(() => {
    const name = biz.name || "Your Brand";
    if (biz.industry) {
      return `${name}. ${biz.industry} Redefined.`;
    }
    return `${name}. Built Different.`;
  }, [biz]);

  const marketingSubline = useMemo(() => {
    if (biz.audience) {
      const first = biz.audience.split(",")[0].trim();
      // Keep it short: max 5 words
      const words = first.split(/\s+/).slice(0, 5).join(" ");
      return `Made for ${words.toLowerCase()}`;
    }
    if (biz.industry) {
      return `Leading ${biz.industry.toLowerCase()}`;
    }
    return "Elevate your brand today";
  }, [biz]);

  // Only generate image if no pre-generated one was provided
  useEffect(() => {
    if (imageUrl) return; // Already have an image (pre-generated or previously loaded)
    let cancelled = false;

    const generateImage = async () => {
      setImageLoading(true);
      setImageError(false);

      try {
        const imagePrompt = [
          `A professional, high-quality marketing hero photograph for a ${biz.industry || "business"} company called "${biz.name}".`,
          biz.description ? `The business: ${biz.description.slice(0, 200)}.` : "",
          "Create a visually stunning, cinematic-quality background image suitable for a social media post.",
          "The image should be atmospheric, with depth and mood. No text, no logos, no words. Just a beautiful visual.",
          "Dark enough in areas to allow white text overlay. Aspect ratio 4:5 portrait.",
        ].filter(Boolean).join(" ");

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt: imagePrompt, model: "nano-banana" },
        });

        if (cancelled) return;
        if (error) throw error;
        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);
        } else {
          setImageError(true);
        }
      } catch (e) {
        console.error("Image generation failed:", e);
        if (!cancelled) setImageError(true);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    };

    generateImage();
    return () => { cancelled = true; };
  }, [biz, imageUrl]);

  const activeFont = fontStyles.find((f) => f.id === selected) || fontStyles[0];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Font Style
          </h1>
          <p className="text-muted-foreground">
            Pick a text style. See it live on your brand's marketing visual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Font style choices */}
          <div className="space-y-3">
            {fontStyles.map((font) => (
              <button
                key={font.id}
                onClick={() => setSelected(font.id)}
                className={cn(
                  "w-full relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  selected === font.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <div className="w-28 flex-shrink-0">
                  <span
                    className="text-lg leading-tight text-foreground block truncate"
                    style={{ fontFamily: font.fontFamily, fontWeight: font.weight }}
                  >
                    {biz.name.split(/\s+/)[0] || "Brand"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">
                    {font.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {font.description}
                  </p>
                </div>

                {selected === font.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* RIGHT: Live preview image with text overlay */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="relative aspect-[4/5] bg-muted">
              {/* Background image */}
              {imageLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Generating your brand visual…</p>
                </div>
              ) : imageError || !imageUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-950">
                  <ImageIcon className="w-10 h-10 text-white/30" />
                  <p className="text-xs text-white/40">Preview unavailable</p>
                  {/* Still show text overlay on fallback gradient */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                    <div
                      className={cn("transition-all duration-300", activeFont.spacing)}
                      style={{ fontFamily: activeFont.fontFamily }}
                    >
                      <h2
                        className={cn(
                          "text-white font-bold mb-2 leading-tight drop-shadow-lg",
                          activeFont.headingSize
                        )}
                        style={{ fontWeight: activeFont.weight }}
                      >
                        {marketingHeadline}
                      </h2>
                      <p
                        className={cn(
                          "text-white/80 drop-shadow-md",
                          activeFont.bodySize
                        )}
                        style={{ fontFamily: activeFont.fontFamily, fontWeight: 400 }}
                      >
                        {marketingSubline}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={imageUrl}
                    alt="Brand visual"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Marketing text overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                    <div
                      className={cn("transition-all duration-300", activeFont.spacing)}
                      style={{ fontFamily: activeFont.fontFamily }}
                    >
                      <h2
                        className={cn(
                          "text-white font-bold mb-2 leading-tight drop-shadow-lg",
                          activeFont.headingSize
                        )}
                        style={{ fontWeight: activeFont.weight }}
                      >
                        {marketingHeadline}
                      </h2>
                      <p
                        className={cn(
                          "text-white/80 drop-shadow-md",
                          activeFont.bodySize
                        )}
                        style={{ fontFamily: activeFont.fontFamily, fontWeight: 400 }}
                      >
                        {marketingSubline}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Style label */}
            <div className="px-4 py-3 border-t border-border bg-card">
              <p className="text-xs text-muted-foreground text-center">
                Live preview ·{" "}
                <span className="font-medium text-foreground">{activeFont.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => onNext([selected])}
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
