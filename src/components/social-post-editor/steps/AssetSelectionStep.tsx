import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FolderOpen,
  Image,
  Type,
  Palette,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Sparkles,
  Package,
  MessageSquare,
  Wand2,
  RefreshCw,
} from "lucide-react";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import LibraryAssetPicker from "@/components/LibraryAssetPicker";
import { supabase } from "@/integrations/supabase/client";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
import { toast } from "sonner";
import { WizardState, CampaignDraft, Product, SelectedAsset } from "../types";

// KLYC Supabase — Imagen 4 direct call (same as ImageVideoGenerator)
const KLYC_FUNCTION_URL = "https://wkqiielsazzbxziqmgdb.supabase.co/functions/v1/generate-image-composite";
const KLYC_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWlpZWxzYXp6Ynh6aXFtZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE3ODMsImV4cCI6MjA5MTA3Nzc4M30.HAoqLxzj_YdKXhldOzyjR4qaJHVLfaldMY_XKgf8htU";

const AR_MAP: Record<string, string> = {
  portrait: "9:16",
  square: "1:1",
  landscape: "16:9",
};

async function callImageComposite(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(KLYC_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KLYC_ANON_KEY}`,
      "apikey": KLYC_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${errText.substring(0, 300)}`);
  }
  return res.json();
}

async function sliceGridIntoTiles(gridUrl: string, aspectRatio: string): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load composite image"));
    i.src = gridUrl;
  });

  const halfW = img.width / 2;
  const halfH = img.height / 2;
  const [arW, arH] = aspectRatio.split(":").map(Number);
  const targetRatio = arW / arH;

  let cropW = halfW;
  let cropH = halfH;
  if (halfW / halfH > targetRatio) {
    cropW = halfH * targetRatio;
  } else {
    cropH = halfW / targetRatio;
  }

  const quadrants = [
    { sx: 0, sy: 0 },
    { sx: halfW, sy: 0 },
    { sx: 0, sy: halfH },
    { sx: halfW, sy: halfH },
  ];

  return quadrants.map(({ sx, sy }) => {
    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d")!;
    const offsetX = sx + (halfW - cropW) / 2;
    const offsetY = sy + (halfH - cropH) / 2;
    ctx.drawImage(img, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas.toDataURL("image/png");
  });
}

interface AssetSelectionStepProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function AssetSelectionStep({
  wizardState,
  onUpdate,
  onNext,
  onBack,
}: AssetSelectionStepProps) {
  const [campaignDrafts, setCampaignDrafts] = useState<CampaignDraft[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brandFonts, setBrandFonts] = useState<string[]>([]);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // AI Generate state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTiles, setAiTiles] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [draftsRes, productsRes, fontsRes, colorsRes] = await Promise.all([
        supabase
          .from("campaign_drafts")
          .select("id, campaign_idea, post_caption, image_prompt, content_type, target_audience, tags, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, name, short_description, product_type, target_audience, value_propositions, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("brand_assets")
          .select("value")
          .eq("user_id", user.id)
          .eq("asset_type", "font"),
        supabase
          .from("brand_assets")
          .select("value")
          .eq("user_id", user.id)
          .eq("asset_type", "color"),
      ]);

      if (draftsRes.data) setCampaignDrafts(draftsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (fontsRes.data) setBrandFonts(fontsRes.data.map((f) => f.value));
      if (colorsRes.data) setBrandColors(colorsRes.data.map((c) => c.value));

      setIsLoadingData(false);
    };
    loadData();
  }, []);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("Enter a description first"); return; }
    setAiGenerating(true);
    setAiError(null);
    setAiTiles([]);

    try {
      const aspectRatio = AR_MAP[wizardState.aspectRatio] ?? "9:16";
      const data = await callImageComposite({
        brief: aiPrompt.trim(),
        platforms: ["img@0", "img@1", "img@2", "img@3"],
        mode: "composite",
        aspectRatio,
      });

      let tiles: string[] = (data?.images as string[]) ?? [];
      if (tiles.length === 0) {
        const grids = data?.grids as any[] | undefined;
        const gridUrl: string | undefined = grids?.find((g: any) => g.success)?.gridUrl;
        if (!gridUrl) throw new Error("No images returned from Imagen 4");
        tiles = await sliceGridIntoTiles(gridUrl, aspectRatio);
      }
      if (tiles.length === 0) throw new Error("Failed to produce image tiles");
      setAiTiles(tiles.slice(0, 4));
    } catch (err: any) {
      const msg = err.message || "Generation failed";
      setAiError(msg);
      toast.error(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAddAiTile = (url: string, idx: number) => {
    const newAsset: SelectedAsset = {
      id: crypto.randomUUID(),
      name: `AI Image ${idx + 1}`,
      url,
      thumbnailUrl: url,
      type: "image",
      source: "upload", // data URL treated same as upload
    };
    onUpdate({ selectedAssets: [...wizardState.selectedAssets, newAsset] });
    toast.success("Image added to assets");
    setShowAiPanel(false);
    setAiTiles([]);
    setAiPrompt("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in first"); return; }

      const newAssets: SelectedAsset[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const { publicUrl } = await uploadBrandAssetImage({ userId: user.id, file, folder: "social-post-assets" });
        newAssets.push({ id: crypto.randomUUID(), name: file.name, url: publicUrl, thumbnailUrl: publicUrl, type: "image", source: "upload" });
      }
      onUpdate({ selectedAssets: [...wizardState.selectedAssets, ...newAssets] });
      toast.success(`${newAssets.length} image(s) added`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGoogleDriveSelect = (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string }>) => {
    const newAssets: SelectedAsset[] = files.filter((f) => f.thumbnailUrl).map((f) => ({
      id: f.id, name: f.name, url: f.thumbnailUrl!, thumbnailUrl: f.thumbnailUrl, type: "image" as const, source: "google-drive" as const,
    }));
    onUpdate({ selectedAssets: [...wizardState.selectedAssets, ...newAssets] });
    setShowGoogleDrive(false);
    toast.success(`${newAssets.length} image(s) added from Google Drive`);
  };

  const handleLibrarySelect = (assets: Array<{ id: string; name: string; url: string; thumbnailUrl?: string; assetType?: string }>) => {
    const newAssets: SelectedAsset[] = assets.map((a) => ({
      id: a.id, name: a.name, url: a.url, thumbnailUrl: a.thumbnailUrl || a.url, type: a.assetType === "logo" ? "logo" : "image", source: "library" as const,
    }));
    onUpdate({ selectedAssets: [...wizardState.selectedAssets, ...newAssets] });
    setShowLibrary(false);
    toast.success(`${newAssets.length} asset(s) added from library`);
  };

  const handleRemoveAsset = (assetId: string) => {
    onUpdate({ selectedAssets: wizardState.selectedAssets.filter((a) => a.id !== assetId) });
  };

  const toggleFont = (font: string) => {
    const isSelected = wizardState.selectedFonts.includes(font);
    onUpdate({ selectedFonts: isSelected ? wizardState.selectedFonts.filter((f) => f !== font) : [...wizardState.selectedFonts, font] });
  };

  const toggleColor = (color: string) => {
    const isSelected = wizardState.selectedColors.includes(color);
    onUpdate({ selectedColors: isSelected ? wizardState.selectedColors.filter((c) => c !== color) : [...wizardState.selectedColors, color] });
  };

  const handleSelectCampaignDraft = (draftId: string) => {
    if (draftId === "__none__") {
      onUpdate({ selectedCampaignDraft: null });
    } else {
      const draft = campaignDrafts.find((d) => d.id === draftId) || null;
      onUpdate({ selectedCampaignDraft: draft });
    }
  };

  const handleSelectProduct = (productId: string) => {
    if (productId === "__none__") {
      onUpdate({ selectedProduct: null });
    } else {
      const product = products.find((p) => p.id === productId) || null;
      onUpdate({ selectedProduct: product });
    }
  };

  // Aspect ratio label for display
  const arLabel = wizardState.aspectRatio === "portrait" ? "9:16" : wizardState.aspectRatio === "square" ? "1:1" : "16:9";
  const tileAspect = wizardState.aspectRatio === "portrait" ? "aspect-[9/16]" : wizardState.aspectRatio === "square" ? "aspect-square" : "aspect-video";

  // User can proceed if they have at least one content source
  const canProceed =
    wizardState.selectedCampaignDraft !== null ||
    wizardState.selectedProduct !== null ||
    wizardState.customPrompt.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Custom Prompt */}
      <div className="bg-muted/50 rounded-xl border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Describe Your Flyer</span>
        </div>
        <Textarea
          placeholder="Type what you want on this flyer — headline, tagline, offer details, call to action…"
          value={wizardState.customPrompt}
          onChange={(e) => onUpdate({ customPrompt: e.target.value })}
          rows={3}
          className="resize-none bg-background"
        />
      </div>

      {/* Post Draft + Product side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Campaign Draft */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Post Draft</span>
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </div>
          {isLoadingData ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : (
            <Select
              value={wizardState.selectedCampaignDraft?.id || "__none__"}
              onValueChange={handleSelectCampaignDraft}
            >
              <SelectTrigger className="w-full bg-background h-9 text-sm">
                <SelectValue placeholder="Choose a post draft…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {campaignDrafts.map((draft) => (
                  <SelectItem key={draft.id} value={draft.id}>
                    <div className="flex flex-col">
                      <span className="truncate max-w-[250px]">
                        {draft.campaign_idea || "Untitled Draft"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {draft.content_type} • {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {wizardState.selectedCampaignDraft && (
            <div className="bg-background rounded-lg p-2 text-xs space-y-1">
              {wizardState.selectedCampaignDraft.post_caption && (
                <p className="line-clamp-2 text-muted-foreground">{wizardState.selectedCampaignDraft.post_caption}</p>
              )}
            </div>
          )}
        </div>

        {/* Product */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Product</span>
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </div>
          {isLoadingData ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : (
            <Select
              value={wizardState.selectedProduct?.id || "__none__"}
              onValueChange={handleSelectProduct}
            >
              <SelectTrigger className="w-full bg-background h-9 text-sm">
                <SelectValue placeholder="Choose a product…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {products.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No products yet. Create one on the Products page.
                  </div>
                ) : (
                  products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex flex-col">
                        <span className="truncate max-w-[250px]">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{product.product_type}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {wizardState.selectedProduct && (
            <div className="bg-background rounded-lg p-2 text-xs space-y-1">
              {wizardState.selectedProduct.short_description && (
                <p className="line-clamp-2 text-muted-foreground">{wizardState.selectedProduct.short_description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Asset Sources */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          Images & Logos
        </h3>

        {/* 4-button grid: Upload | Klyc Library | Google Drive | AI Generate */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
            )}
            <span className="text-xs font-medium text-center">Upload</span>
            <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" disabled={isUploading} />
          </label>

          <button
            onClick={() => setShowLibrary(true)}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <FolderOpen className="w-6 h-6 text-primary mb-2" />
            <span className="text-xs font-medium text-center">Klyc Library</span>
          </button>

          <button
            onClick={() => setShowGoogleDrive(true)}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group"
          >
            <GoogleDriveIcon className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium text-center">Google Drive</span>
          </button>

          {/* AI Generate — 4th slot */}
          <button
            onClick={() => { setShowAiPanel((v) => !v); setAiTiles([]); setAiError(null); }}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all group ${
              showAiPanel
                ? "border-primary bg-primary/5"
                : "border-dashed border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <Wand2 className={`w-6 h-6 mb-2 transition-colors ${showAiPanel ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
            <span className="text-xs font-medium text-center">AI Generate</span>
          </button>
        </div>

        {/* AI Generate inline panel */}
        {showAiPanel && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Generate with Imagen 4</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{arLabel}</span>
              </div>
              <button onClick={() => { setShowAiPanel(false); setAiTiles([]); setAiError(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Describe the image — e.g. professional headshot of a barista in a bright café"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !aiGenerating) handleAiGenerate(); }}
                className="flex-1 bg-background"
              />
              <Button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="shrink-0 bg-gradient-to-r from-[hsl(195_75%_50%)] to-[hsl(160_65%_50%)] text-white hover:opacity-90 border-0 px-5"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-bold">GO!</span>}
              </Button>
            </div>

            {aiGenerating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Generating 4 variations with Imagen 4…</span>
              </div>
            )}

            {aiError && !aiGenerating && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <X className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{aiError}</span>
                <button onClick={handleAiGenerate} className="flex items-center gap-1 text-xs underline shrink-0">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {aiTiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Pick one to add to your assets</p>
                <div className="grid grid-cols-4 gap-2">
                  {aiTiles.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddAiTile(url, idx)}
                      className={`relative overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-all cursor-pointer group ${tileAspect}`}
                      title={`Add variation ${idx + 1}`}
                    >
                      <img src={url} alt={`AI variation ${idx + 1}`} className="w-full h-full object-cover block" />
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all flex items-center justify-center">
                        <Check className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 left-0 px-1.5 py-0.5 rounded-tr-md bg-black/60 text-white text-[10px] font-semibold leading-tight">{idx + 1}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">Click a tile to add it · Generate again for more options</p>
              </div>
            )}
          </div>
        )}

        {wizardState.selectedAssets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{wizardState.selectedAssets.length} asset(s) selected</p>
            <div className="flex flex-wrap gap-2">
              {wizardState.selectedAssets.map((asset) => (
                <div key={asset.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border">
                  <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveAsset(asset.id)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brand Fonts */}
      {brandFonts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            Brand Fonts
          </h3>
          <div className="flex flex-wrap gap-2">
            {brandFonts.map((font) => (
              <button
                key={font}
                onClick={() => toggleFont(font)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  wizardState.selectedFonts.includes(font)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                }`}
                style={{ fontFamily: font }}
              >
                {font}
                {wizardState.selectedFonts.includes(font) && <Check className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand Colors */}
      {brandColors.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Brand Colors
          </h3>
          <div className="flex flex-wrap gap-2">
            {brandColors.map((color) => (
              <button
                key={color}
                onClick={() => toggleColor(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  wizardState.selectedColors.includes(color)
                    ? "border-primary ring-2 ring-primary/30 scale-110"
                    : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              >
                {wizardState.selectedColors.includes(color) && <Check className="w-4 h-4 mx-auto text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={!canProceed} className="min-w-[200px]">
          Review & Generate
        </Button>
      </div>

      {/* Pickers */}
      <GoogleDriveFilePicker
        open={showGoogleDrive}
        onOpenChange={setShowGoogleDrive}
        fileTypeFilter="image"
        selectionMode="select"
        onFilesSelected={handleGoogleDriveSelect}
      />
      <LibraryAssetPicker
        open={showLibrary}
        onOpenChange={setShowLibrary}
        onAssetsSelected={handleLibrarySelect}
        maxSelection={20}
        assetTypeFilter="image"
      />
    </div>
  );
}
