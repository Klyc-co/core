import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
import {
  ArrowLeft,
  Image,
  Video,
  Film,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  Upload,
  Library,
  X,
  Save,
  Check,
  Plus,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Monitor, Smartphone, Square, Rocket } from "lucide-react";

type VideoModel = "runway" | "kling";
type OutputSize = "portrait" | "square" | "landscape";
type ColorMode = "primary" | "secondary" | "custom";

// KLYC Supabase — Imagen 4 is configured here with a valid GOOGLE_API_KEY
const KLYC_FUNCTION_URL = "https://wkqiielsazzbxziqmgdb.supabase.co/functions/v1/generate-image-composite";
const KLYC_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWlpZWxzYXp6Ynh6aXFtZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE3ODMsImV4cCI6MjA5MTA3Nzc4M30.HAoqLxzj_YdKXhldOzyjR4qaJHVLfaldMY_XKgf8htU";

const MAX_TILES = 4;

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

const OUTPUT_SIZE_OPTIONS: { value: OutputSize; label: string; description: string; dimensions: string; width: number; height: number; aspectRatio: string; icon: typeof Smartphone }[] = [
  { value: "portrait",  label: "Vertical",    description: "Best for Stories, Reels, TikTok", dimensions: "1080x1920", width: 1080, height: 1920, aspectRatio: "9:16", icon: Smartphone },
  { value: "square",    label: "Square",      description: "Best for Feed posts",             dimensions: "1080x1080", width: 1080, height: 1080, aspectRatio: "1:1",  icon: Square },
  { value: "landscape", label: "Horizontal",  description: "Best for YouTube, LinkedIn",      dimensions: "1920x1080", width: 1920, height: 1080, aspectRatio: "16:9", icon: Monitor },
];

const VIDEO_MODELS: { value: VideoModel; label: string; description: string }[] = [
  { value: "runway", label: "Runway", description: "Cinematic text-to-video generation" },
  { value: "kling",  label: "Kling",  description: "Official Kling text-to-video clips" },
];

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

  // Take each quadrant at its natural size — no aspect-ratio cropping
  // The display container uses h-auto so images show uncropped regardless
  const quadrants = [
    { sx: 0,     sy: 0 },
    { sx: halfW, sy: 0 },
    { sx: 0,     sy: halfH },
    { sx: halfW, sy: halfH },
  ];

  return quadrants.map(({ sx, sy }) => {
    const canvas = document.createElement("canvas");
    canvas.width  = halfW;
    canvas.height = halfH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, halfW, halfH, 0, 0, halfW, halfH);
    return canvas.toDataURL("image/png");
  });
}

interface ImageVideoGeneratorProps {
  onBack?: () => void;
}

interface BrandAssetImage {
  id: string;
  name: string | null;
  value: string;
}

const ImageVideoGenerator = ({ onBack }: ImageVideoGeneratorProps = {}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"image" | "video" | "broll">("image");
  const [prompt, setPrompt] = useState("");
  const [outputSize, setOutputSize] = useState<OutputSize>("portrait");
  const [videoModel, setVideoModel] = useState<VideoModel>("runway");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [imageTiles, setImageTiles] = useState<string[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [inspirationUrls, setInspirationUrls] = useState<string[]>([]);
  const [accentColor, setAccentColor] = useState<string>("");
  const [accentColorEnabled, setAccentColorEnabled] = useState<boolean>(false);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState<ColorMode>("primary");
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState<BrandAssetImage[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [brollProjects, setBrollProjects] = useState<any[]>([]);
  const [brollLoading, setBrollLoading] = useState(false);
  const [brollUnlocked, setBrollUnlocked] = useState(false);
  const [brollPasscode, setBrollPasscode] = useState("");
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [videoPasscode, setVideoPasscode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session-level gallery of generated media (images + videos) — persists across regenerations
  // so the user can pick any of them to attach to a campaign.
  type SessionMediaItem = { id: string; type: "image" | "video"; url: string; name: string };
  const [sessionMedia, setSessionMedia] = useState<SessionMediaItem[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());

  const toggleMediaSelected = (id: string) => {
    setSelectedMediaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const removeSessionMedia = (id: string) => {
    setSessionMedia(prev => prev.filter(m => m.id !== id));
    setSelectedMediaIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Convert any data:URL image to a durable Storage URL so it survives navigation/reload
  const ensureDurableImageUrl = async (url: string): Promise<string> => {
    if (!url.startsWith("data:")) return url;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], `creative-studio-${Date.now()}.png`, { type: blob.type || "image/png" });
    const { publicUrl } = await uploadBrandAssetImage({ userId: user.id, file, folder: "creative-studio" });
    return publicUrl;
  };

  const addSelectedTilesToSession = async (tileUrls: string[]) => {
    try {
      const durable = await Promise.all(tileUrls.map(ensureDurableImageUrl));
      const newItems: SessionMediaItem[] = durable.map((u, i) => ({
        id: `img-${Date.now()}-${i}`,
        type: "image",
        url: u,
        name: `Generated image ${i + 1}`,
      }));
      setSessionMedia(prev => [...newItems, ...prev].slice(0, 24));
      setSelectedMediaIds(prev => {
        const next = new Set(prev);
        newItems.forEach(it => next.add(it.id));
        return next;
      });
    } catch (e) {
      console.error("Failed to add tiles to session", e);
    }
  };

  const addVideoToSession = (url: string) => {
    const item: SessionMediaItem = {
      id: `vid-${Date.now()}`,
      type: "video",
      url,
      name: `Generated video`,
    };
    setSessionMedia(prev => [item, ...prev].slice(0, 24));
    setSelectedMediaIds(prev => { const n = new Set(prev); n.add(item.id); return n; });
  };

  const handleAddSelectedToCampaign = () => {
    const items = sessionMedia.filter(m => selectedMediaIds.has(m.id));
    if (items.length === 0) {
      toast.error("Select at least one item to add");
      return;
    }
    const uploadedMediaUrls = items.map(it => ({ id: it.id, name: it.name, url: it.url }));
    navigate("/campaigns/new", { state: { uploadedMediaUrls } });
  };

  // Fetch brand colors from client profile on mount
  useEffect(() => {
    const fetchBrandColors = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("client_profiles")
        .select("brand_colors")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.brand_colors?.length) {
        setBrandColors(data.brand_colors);
        setAccentColor(data.brand_colors[0]);
        setColorMode("primary");
        setAccentColorEnabled(true);
      }
    };
    fetchBrandColors();
  }, []);

  useEffect(() => {
    if (!showLibrary) return;
    const fetchLibrary = async () => {
      setLoadingLibrary(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingLibrary(false); return; }
      const { data } = await supabase
        .from("brand_assets")
        .select("id, name, value")
        .eq("user_id", user.id)
        .eq("asset_type", "image")
        .order("created_at", { ascending: false })
        .limit(50);
      setLibraryImages(data || []);
      setLoadingLibrary(false);
    };
    fetchLibrary();
  }, [showLibrary]);

  useEffect(() => {
    if (mode !== "broll" || !brollUnlocked) return;
    const fetchBroll = async () => {
      setBrollLoading(true);
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      setBrollProjects(data || []);
      setBrollLoading(false);
    };
    fetchBroll();
  }, [mode, brollUnlocked]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (inspirationUrls.length >= 5) { toast.error("Maximum 5 reference images allowed"); return; }
    setUploadingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { publicUrl } = await uploadBrandAssetImage({ userId: user.id, file, folder: "inspiration" });
      setInspirationUrls((prev) => [...prev, publicUrl]);
      toast.success("Image uploaded as inspiration");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Please enter a description"); return; }
    setGenerating(true);
    setGenerateError(null);
    setImageTiles([]);
    setSelectedTile(null);
    setResultUrl(null);
    setSavedToLibrary(false);

    try {
      if (mode === "image") {
        const sizeOpt = OUTPUT_SIZE_OPTIONS.find(o => o.value === outputSize)!;
        const aspectRatio = sizeOpt.aspectRatio;
        console.log(`[Creative Studio] Composite image call -> KLYC Supabase ar=${aspectRatio}`);
        const colorInstruction = accentColorEnabled && accentColor
          ? `\n\nUse ${accentColor} as a prominent accent color throughout the composition.`
          : "";

        const data = await callImageComposite({
          brief: `${prompt}${colorInstruction}`,
          platforms: ["img@0", "img@1", "img@2", "img@3"],
          mode: "composite",
          aspectRatio,
          referenceImages: inspirationUrls.length > 0 ? inspirationUrls.slice(0, 3) : undefined,
        });

        let tiles: string[] = (data?.images as string[]) ?? [];
        if (tiles.length === 0) {
          const grids = data?.grids as any[] | undefined;
          const gridUrl: string | undefined = grids?.find((g: any) => g.success)?.gridUrl;
          if (!gridUrl) throw new Error("No images returned");
          tiles = await sliceGridIntoTiles(gridUrl, aspectRatio);
        }
        if (tiles.length === 0) throw new Error("Failed to produce image tiles");

        const finalTiles = tiles.slice(0, MAX_TILES);
        setImageTiles(finalTiles);
        setSelectedTile(finalTiles[0]);
        // Add all 4 generated tiles to the session gallery (durable URLs)
        void addSelectedTilesToSession(finalTiles);
        toast.success("4 images ready — pick your favourite!");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-broll", {
        body: { prompt, standalone: true, model: videoModel },
      });
      if (error) throw error;
      if (!data?.videoUrl) throw new Error("No video returned");
      setResultUrl(data.videoUrl);
      toast.success("Video generated!");
    } catch (err: any) {
      console.error("Generation error:", err);
      const msg = err.message || "Generation failed";
      toast.error(msg);
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    const url = selectedTile || resultUrl;
    if (!url || mode !== "image") return;
    setSavingToLibrary(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in first"); return; }
      let durableUrl = url;
      if (url.startsWith("data:")) {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `creative-studio-${Date.now()}.png`, { type: blob.type || "image/png" });
        const { publicUrl } = await uploadBrandAssetImage({ userId: user.id, file, folder: "creative-studio" });
        durableUrl = publicUrl;
      }
      const imageName = `Creative Studio - ${new Date().toLocaleDateString()}`;
      const { error } = await supabase.from("brand_assets").insert({
        user_id: user.id, asset_type: "image", name: imageName, value: durableUrl,
        metadata: { source: "creative-studio", model: "imagen-4", prompt, generated_at: new Date().toISOString() },
      });
      if (error) throw error;
      setSavedToLibrary(true);
      toast.success("Saved to Brand Library");
    } catch (error) {
      console.error("Failed to save generated image:", error);
      toast.error("Failed to save to Brand Library");
    } finally {
      setSavingToLibrary(false);
    }
  };

  const handleDownload = () => {
    const url = selectedTile || resultUrl;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated-${mode}-${Date.now()}.${mode === "image" ? "png" : "mp4"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      )}

      <Tabs value={mode} onValueChange={(v) => {
        const val = v as "image" | "video" | "broll";
        setMode(val);
        if (val !== "broll") { setImageTiles([]); setSelectedTile(null); setResultUrl(null); setSavedToLibrary(false); }
      }}>
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="image" className="gap-2"><Image className="w-4 h-4" /> Image</TabsTrigger>
          <TabsTrigger value="video" className="gap-2"><Video className="w-4 h-4" /> Video</TabsTrigger>
          <TabsTrigger value="broll" className="gap-2"><Film className="w-4 h-4" /> B-Roll</TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-2 space-y-4">
          <div className="flex flex-wrap items-stretch gap-2 max-w-3xl">
            <div className="grid grid-cols-3 gap-2 flex-1 min-w-[280px]">
              {OUTPUT_SIZE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = outputSize === opt.value;
                return (
                  <button key={opt.value} onClick={() => setOutputSize(opt.value)}
                    className={`relative flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 transition-all text-left ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"}`}>
                    {isSelected && (<div className="absolute top-1.5 right-1.5"><Check className="w-3 h-3 text-primary" /></div>)}
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className={`text-xs font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{opt.dimensions}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Accent color — pulls from brand primary/secondary, or custom picker */}
            <div className="flex items-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-2 flex-wrap">
              <Label className="text-xs font-medium text-foreground whitespace-nowrap">Accent</Label>

              {brandColors[0] && (
                <button type="button"
                  onClick={() => { setColorMode("primary"); setAccentColor(brandColors[0]); setAccentColorEnabled(true); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all ${colorMode === "primary" && accentColorEnabled ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                  <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-black/10" style={{ backgroundColor: brandColors[0] }} />
                  Primary
                </button>
              )}

              {brandColors[1] && (
                <button type="button"
                  onClick={() => { setColorMode("secondary"); setAccentColor(brandColors[1]); setAccentColorEnabled(true); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all ${colorMode === "secondary" && accentColorEnabled ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                  <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-black/10" style={{ backgroundColor: brandColors[1] }} />
                  Secondary
                </button>
              )}

              <button type="button"
                onClick={() => { setColorMode("custom"); setAccentColorEnabled(true); }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all ${colorMode === "custom" && accentColorEnabled ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                <input
                  type="color"
                  value={colorMode === "custom" ? (accentColor || "#ffffff") : (accentColor || "#ffffff")}
                  onChange={(e) => { setAccentColor(e.target.value); setColorMode("custom"); setAccentColorEnabled(true); }}
                  className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                  style={{ minWidth: 14 }}
                />
                <Input
                  value={colorMode === "custom" ? accentColor : ""}
                  onChange={(e) => { setAccentColor(e.target.value); setColorMode("custom"); setAccentColorEnabled(true); }}
                  placeholder="#bdffc1"
                  className="h-5 w-16 font-mono text-xs border-0 p-0 bg-transparent focus-visible:ring-0 shadow-none"
                  maxLength={7}
                />
              </button>

              <Switch checked={accentColorEnabled} onCheckedChange={setAccentColorEnabled} aria-label="Toggle accent color" />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="video" className="mt-3" />
        <TabsContent value="broll" className="mt-3" />
      </Tabs>

      {mode === "broll" && !brollUnlocked && (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Film className="w-8 h-8 text-primary" /></div>
          <h3 className="text-xl font-bold text-foreground mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-6">Beta access only</p>
          <div className="flex items-center gap-2 max-w-xs w-full">
            <Input type="password" placeholder="Enter passcode" value={brollPasscode} onChange={(e) => setBrollPasscode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && brollPasscode === "37") { setBrollUnlocked(true); toast.success("Access granted!"); } else if (e.key === "Enter") { toast.error("Invalid passcode"); } }}
              className="text-center" />
            <Button onClick={() => { if (brollPasscode === "37") { setBrollUnlocked(true); toast.success("Access granted!"); } else { toast.error("Invalid passcode"); } }}>Enter</Button>
          </div>
        </Card>
      )}

      {mode === "video" && !videoUnlocked && (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Video className="w-8 h-8 text-primary" /></div>
          <h3 className="text-xl font-bold text-foreground mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-6">Beta access only</p>
          <div className="flex items-center gap-2 max-w-xs w-full">
            <Input type="password" placeholder="Enter passcode" value={videoPasscode} onChange={(e) => setVideoPasscode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && videoPasscode === "37") { setVideoUnlocked(true); toast.success("Access granted!"); } else if (e.key === "Enter") { toast.error("Invalid passcode"); } }}
              className="text-center" />
            <Button onClick={() => { if (videoPasscode === "37") { setVideoUnlocked(true); toast.success("Access granted!"); } else { toast.error("Invalid passcode"); } }}>Enter</Button>
          </div>
        </Card>
      )}

      {mode === "broll" && brollUnlocked && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Create and manage your B-roll videos</p>
            <Button onClick={() => navigate("/projects/new")} className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
          </div>
          {brollLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : brollProjects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Video className="w-8 h-8 text-primary" /></div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload your first video clip to get started</p>
              <Button onClick={() => navigate("/projects/new")} className="gap-2"><Plus className="w-4 h-4" /> Create your first project</Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {brollProjects.map((project) => (
                <Card key={project.id} className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => { project.status === "processing" ? navigate(`/projects/${project.id}/processing`) : navigate(`/projects/${project.id}/edit`); }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Video className="w-5 h-5 text-muted-foreground" /></div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{project.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{project.duration_seconds ? `${Math.round(project.duration_seconds)}s` : "-"}</span>
                          <span>-</span>
                          <span>{new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">{project.status?.replace(/_/g, " ")}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {mode !== "broll" && !(mode === "video" && !videoUnlocked) && (<>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {mode === "image" && inspirationUrls.length < 5 && (
            <div className="flex sm:flex-col gap-2 shrink-0">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="gap-2 justify-start" disabled={uploadingFile} onClick={() => fileInputRef.current?.click()}>
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Image
              </Button>
              <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => setShowLibrary(!showLibrary)}>
                <Library className="w-4 h-4" /> Brand Library
              </Button>
            </div>
          )}
          <Textarea
            placeholder={mode === "image" ? "e.g. A modern flat-lay of artisan coffee beans on a marble surface with soft morning light..." : "e.g. A slow cinematic pan across a sunlit cafe interior with warm golden tones..."}
            value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
            className="resize-none flex-1 min-h-0 sm:h-auto sm:self-stretch"
          />
          <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}
            className="shrink-0 h-auto sm:self-stretch w-24 p-2 flex items-center justify-center text-2xl font-extrabold tracking-wide text-center bg-gradient-to-r from-[hsl(195_75%_50%)] to-[hsl(160_65%_50%)] text-white hover:opacity-90">
            {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>GO!</span>}
          </Button>
        </div>

        <div className="w-full">
          {mode === "image" ? (
            imageTiles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Pick your favourite · tap to select</p>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {selectedTile && (
                      <Button variant="secondary" size="sm" onClick={handleSaveToLibrary} disabled={savingToLibrary || savedToLibrary} className="gap-2">
                        {savingToLibrary ? <Loader2 className="w-4 h-4 animate-spin" /> : savedToLibrary ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span className="hidden sm:inline">{savedToLibrary ? "Saved" : "Save"}</span>
                      </Button>
                    )}
                    {selectedTile && <Button size="sm" variant="secondary" onClick={handleDownload} className="gap-2"><Download className="w-4 h-4" />Download</Button>}
                    <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={generating} className="gap-2"><RefreshCw className="w-4 h-4" />Regenerate</Button>
                    {selectedTile && (
                      <Button size="sm" variant="secondary" onClick={() => navigate("/campaigns/new", { state: { referenceImageUrl: selectedTile } })} className="gap-2">
                        <Rocket className="w-4 h-4" /><span>Add to Campaign</span>
                      </Button>
                    )}
                    {selectedTile && (
                      <Button size="sm" onClick={() => navigate("/campaigns/generate", { state: { referenceImageUrl: selectedTile } })}
                        className="gap-2 bg-gradient-to-r from-[hsl(195_75%_50%)] to-[hsl(160_65%_50%)] text-white hover:opacity-90 border-0">
                        <Sparkles className="w-4 h-4" /><span>Use in Post</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2×2 grid — tiles render at natural dimensions, no forced crop */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {imageTiles.map((url, idx) => (
                    <button key={idx} onClick={() => { setSelectedTile(url); setLightboxUrl(url); }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-zoom-in w-full ${selectedTile === url ? "border-primary shadow-lg ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                      {/* h-auto: image drives height, no aspect-ratio forced crop */}
                      <img src={url} alt={`Variation ${idx + 1}`} className="w-full h-auto block" />
                      {/* Selected checkmark — flush top-right corner */}
                      {selectedTile === url && (
                        <div className="absolute top-0 right-0 w-6 h-6 rounded-bl-lg bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      {/* Tile number — flush bottom-left corner */}
                      <div className="absolute bottom-0 left-0 px-2 py-0.5 rounded-tr-md bg-black/60 text-white text-[10px] font-semibold leading-tight">{idx + 1}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Card className={`flex items-center justify-center w-full min-h-[350px] border-dashed ${generateError ? "border-destructive/50" : ""}`}>
                <div className="text-center text-muted-foreground px-6">
                  {generateError ? (
                    <>
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center"><X className="w-6 h-6 text-destructive" /></div>
                      <p className="text-sm font-medium text-destructive mb-1">Generation failed</p>
                      <p className="text-xs text-destructive/80 max-w-xs">{generateError}</p>
                      <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating} className="mt-4 gap-2"><RefreshCw className="w-3.5 h-3.5" /> Try again</Button>
                    </>
                  ) : (
                    <>
                      <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">4 image variations will appear here</p>
                      <p className="text-xs opacity-60 mt-1">1 API call · 4 tiles · pick your favourite</p>
                    </>
                  )}
                </div>
              </Card>
            )
          ) : (
            resultUrl ? (
              <Card className="overflow-hidden relative group">
                <video src={resultUrl} controls className="w-full rounded-lg max-h-[500px]" />
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" onClick={() => navigate("/campaigns/new", { state: { referenceVideoUrl: resultUrl } })} className="gap-2"><Rocket className="w-4 h-4" /> Add to Campaign</Button>
                  <Button size="icon" variant="secondary" onClick={handleDownload} title="Download"><Download className="w-4 h-4" /></Button>
                  <Button size="icon" variant="secondary" onClick={handleGenerate} title="Regenerate"><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </Card>
            ) : (
              <Card className="flex items-center justify-center w-full min-h-[350px] border-dashed">
                <div className="text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Your generated video will appear here</p>
                </div>
              </Card>
            )
          )}
        </div>

        {mode === "image" && (
          <div className="space-y-3">
            {inspirationUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {inspirationUrls.map((url, idx) => (
                  <div key={idx} className="relative inline-block">
                    <img src={url} alt={`Inspiration ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover border border-border" />
                    <button onClick={() => setInspirationUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            {showLibrary && inspirationUrls.length < 5 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Select from Library</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLibrary(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                {loadingLibrary ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : libraryImages.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No images in your library yet.</p>
                ) : (
                  <ScrollArea className="h-80">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                      {libraryImages.map((img) => {
                        const isSelected = inspirationUrls.includes(img.value);
                        return (
                          <button key={img.id} disabled={isSelected}
                            onClick={() => { setInspirationUrls((prev) => [...prev, img.value]); if (inspirationUrls.length + 1 >= 5) setShowLibrary(false); }}
                            className={`group relative aspect-square rounded-md overflow-hidden border transition-colors ${isSelected ? "border-primary opacity-50" : "border-border hover:border-primary"}`}>
                            <img src={img.value} alt={img.name || "Library image"} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </Card>
            )}
          </div>
        )}
      </>)}

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Full size preview" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain" />
            <button onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageVideoGenerator;
