import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Pencil, Palette, Type, Image, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StepBusinessSummaryProps {
  scanData: any;
  onNext: () => void;
}

interface BrandAsset {
  id: string;
  asset_type: string;
  value: string;
  name: string | null;
  metadata: any;
}

const assetTypeIcon = (type: string) => {
  switch (type) {
    case "color": return <Palette className="w-4 h-4" />;
    case "font": return <Type className="w-4 h-4" />;
    case "logo":
    case "image": return <Image className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const assetTypeLabel = (type: string) => {
  switch (type) {
    case "color": return "Color";
    case "font": return "Font";
    case "logo": return "Logo";
    case "image": return "Image";
    default: return type;
  }
};

const StepBusinessSummary = ({ scanData, onNext }: StepBusinessSummaryProps) => {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // businessSummary is the AI-generated summary; summary is just asset counts
  const biz = scanData?.businessSummary || {};
  const fallback = typeof scanData?.summary === 'object' && scanData?.summary?.businessName ? scanData.summary : {};
  const merged = { ...fallback, ...biz };
  const businessName = merged.businessName || "Your Business";
  const description = merged.description || "";
  const audience = merged.audience || merged.targetAudience || "";
  const valueProposition = merged.valueProposition || "";
  const positioning = merged.positioning || "";
  const voice = merged.voice || "";
  const industry = merged.industry || "";
  const productCategory = merged.productCategory || "";
  const geographyMarkets = merged.geographyMarkets || "";
  const mainCompetitors = merged.mainCompetitors || "";

  const bulletPoints = [
    audience && { label: "Target Audience", value: audience },
    valueProposition && { label: "Value Proposition", value: valueProposition },
    industry && { label: "Industry", value: industry },
    positioning && { label: "Positioning", value: positioning },
    voice && { label: "Brand Voice", value: voice },
    productCategory && { label: "Product Category", value: productCategory },
    geographyMarkets && { label: "Markets", value: geographyMarkets },
    mainCompetitors && { label: "Competitors", value: mainCompetitors },
  ].filter(Boolean) as { label: string; value: string }[];

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("brand_assets")
          .select("id, asset_type, value, name, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (data) setAssets(data);
      } catch (e) {
        console.error("Failed to load brand assets:", e);
      } finally {
        setLoadingAssets(false);
      }
    };
    fetchAssets();
  }, []);

  const isImageUrl = (value: string) =>
    /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?.*)?$/i.test(value) ||
    value.startsWith("http");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))" }}
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Here's what we found.
          </h1>
          <p className="text-muted-foreground">
            We scanned your website and built this profile. Make sure it looks right.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Business summary */}
          <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm flex flex-col">
            <h2 className="text-xl font-bold text-foreground mb-3">{businessName}</h2>

            {description ? (
              <p className="text-foreground/80 leading-relaxed text-[15px] mb-5">
                {description}
              </p>
            ) : (
              <p className="text-muted-foreground italic text-[15px] mb-5">
                We couldn't generate a full summary. You can add details later.
              </p>
            )}

            {bulletPoints.length > 0 && (
              <ul className="space-y-3 mt-auto">
                {bulletPoints.map((bp, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-foreground">{bp.label}: </span>
                      <span className="text-sm text-foreground/70">{bp.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* RIGHT: Brand assets */}
          <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 pt-6 pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                Brand Assets
                {assets.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({assets.length} found)
                  </span>
                )}
              </h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {loadingAssets ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading assets…
                  </div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No brand assets were found. You can add them manually later.
                  </div>
                ) : (
                  assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 hover:bg-accent/30 transition-colors"
                    >
                      {asset.asset_type === "color" ? (
                        <div
                          className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                          style={{ backgroundColor: asset.value }}
                        />
                      ) : asset.asset_type === "logo" || (asset.asset_type === "image" && isImageUrl(asset.value)) ? (
                        <div className="w-8 h-8 rounded-md border border-border flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={asset.value}
                            alt={asset.name || "asset"}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                          {assetTypeIcon(asset.asset_type)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {asset.name || asset.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assetTypeLabel(asset.asset_type)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Buttons */}
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

export default StepBusinessSummary;
