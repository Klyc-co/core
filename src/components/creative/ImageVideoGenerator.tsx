import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

import { Monitor, Smartphone, Square } from "lucide-react";

type ImageModel = "nano-banana" | "runway" | "fooocus";
type VideoModel = "runway" | "kling";
type OutputSize = "portrait" | "square" | "landscape";

const OUTPUT_SIZE_OPTIONS: { value: OutputSize; label: string; description: string; dimensions: string; width: number; height: number; icon: typeof Smartphone }[] = [
  { value: "portrait", label: "Vertical", description: "Best for Stories, Reels, TikTok", dimensions: "1080×1920", width: 1080, height: 1920, icon: Smartphone },
  { value: "square", label: "Square", description: "Best for Feed posts", dimensions: "1080×1080", width: 1080, height: 1080, icon: Square },
  { value: "landscape", label: "Horizontal", description: "Best for YouTube, LinkedIn", dimensions: "1920×1080", width: 1920, height: 1080, icon: Monitor },
];

const IMAGE_MODELS: { value: ImageModel; label: string; description: string }[] = [
  { value: "nano-banana", label: "Nano Banana", description: "Fast AI generation (default)" },
  { value: "runway", label: "Runway", description: "High-quality cinematic visuals" },
  { value: "fooocus", label: "Fooocus", description: "Fine-tuned artistic styles" },
];

const VIDEO_MODELS: { value: VideoModel; label: string; description: string }[] = [
  { value: "runway", label: "Runway", description: "Cinematic text-to-video generation" },
  { value: "kling", label: "Kling", description: "Official Kling text-to-video clips" },
];

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
  const [imageModel, setImageModel] = useState<ImageModel>("nano-banana");
  const [videoModel, setVideoModel] = useState<VideoModel>("runway");
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  const [inspirationUrls, setInspirationUrls] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState<BrandAssetImage[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // B-Roll state
  const [brollProjects, setBrollProjects] = useState<any[]>([]);
  const [brollLoading, setBrollLoading] = useState(false);
  const [brollUnlocked, setBrollUnlocked] = useState(false);
  const [brollPasscode, setBrollPasscode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showLibrary) return;
    const fetchLibrary = async () => {
      setLoadingLibrary(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingLibrary(false);
        return;
      }

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

  // Fetch B-Roll projects when mode switches to broll
  useEffect(() => {
    if (mode !== "broll" || !brollUnlocked) return;
    const fetchBroll = async () => {
      setBrollLoading(true);
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      setBrollProjects(data || []);
      setBrollLoading(false);
    };
    fetchBroll();
  }, [mode, brollUnlocked]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (inspirationUrls.length >= 5) {
      toast.error("Maximum 5 reference images allowed");
      return;
    }

    setUploadingFile(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { publicUrl } = await uploadBrandAssetImage({
        userId: user.id,
        file,
        folder: "inspiration",
      });
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
    if (!prompt.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setGenerating(true);
    setResultUrl(null);
    setSavedToLibrary(false);

    try {
      if (mode === "image") {
        const body: Record<string, any> = { prompt, model: imageModel };
        if (inspirationUrls.length > 0) body.inspirationImageUrl = inspirationUrls[0];

        const { data, error } = await supabase.functions.invoke("generate-image", { body });
        if (error) throw error;
        if (!data?.imageUrl) throw new Error("No image returned");

        setResultUrl(data.imageUrl);
        toast.success("Image generated!");
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
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!resultUrl || mode !== "image") return;

    setSavingToLibrary(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      let durableUrl = resultUrl;

      if (resultUrl.startsWith("data:")) {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const file = new File([blob], `creative-studio-${Date.now()}.png`, {
          type: blob.type || "image/png",
        });

        const { publicUrl } = await uploadBrandAssetImage({
          userId: user.id,
          file,
          folder: "creative-studio",
        });

        durableUrl = publicUrl;
      }

      const imageName = `Creative Studio - ${new Date().toLocaleDateString()}`;
      const { error } = await supabase.from("brand_assets").insert({
        user_id: user.id,
        asset_type: "image",
        name: imageName,
        value: durableUrl,
        metadata: {
          source: "creative-studio",
          model: imageModel,
          prompt,
          generated_at: new Date().toISOString(),
        },
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
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `generated-${mode}-${Date.now()}.${mode === "image" ? "png" : "mp4"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xl font-bold text-foreground">Image & Video Generator</h2>
        </div>
      </div>

      {/* Mode Tabs + Model selector */}
      <Tabs
        value={mode}
        onValueChange={(v) => {
          const val = v as "image" | "video" | "broll";
          setMode(val);
          if (val !== "broll") {
            setResultUrl(null);
            setSavedToLibrary(false);
          }
        }}
      >
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="image" className="gap-2">
            <Image className="w-4 h-4" /> Image
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="w-4 h-4" /> Video
          </TabsTrigger>
          <TabsTrigger value="broll" className="gap-2">
            <Film className="w-4 h-4" /> B-Roll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Model</Label>
            <Select value={imageModel} onValueChange={(v) => setImageModel(v as ImageModel)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
        <TabsContent value="video" className="mt-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Model</Label>
            <Select value={videoModel} onValueChange={(v) => setVideoModel(v as VideoModel)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
        <TabsContent value="broll" className="mt-3" />
      </Tabs>

      {/* B-Roll inline content */}
      {mode === "broll" && !brollUnlocked && (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-6">Beta access only</p>
          <div className="flex items-center gap-2 max-w-xs w-full">
            <Input
              type="password"
              placeholder="Enter passcode"
              value={brollPasscode}
              onChange={(e) => setBrollPasscode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && brollPasscode === "37") {
                  setBrollUnlocked(true);
                  toast.success("Access granted!");
                } else if (e.key === "Enter") {
                  toast.error("Invalid passcode");
                }
              }}
              className="text-center"
            />
            <Button
              onClick={() => {
                if (brollPasscode === "37") {
                  setBrollUnlocked(true);
                  toast.success("Access granted!");
                } else {
                  toast.error("Invalid passcode");
                }
              }}
            >
              Enter
            </Button>
          </div>
        </Card>
      )}

      {mode === "broll" && brollUnlocked && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Create and manage your B-roll videos</p>
            <Button onClick={() => navigate("/projects/new")} className="gap-2">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </div>

          {brollLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : brollProjects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload your first video clip to get started</p>
              <Button onClick={() => navigate("/projects/new")} className="gap-2">
                <Plus className="w-4 h-4" /> Create your first project
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {brollProjects.map((project) => (
                <Card
                  key={project.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    if (project.status === "processing") {
                      navigate(`/projects/${project.id}/processing`);
                    } else {
                      navigate(`/projects/${project.id}/edit`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Video className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{project.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{project.duration_seconds ? `${Math.round(project.duration_seconds)}s` : "—"}</span>
                          <span>•</span>
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

      {mode !== "broll" && (<>
      {/* Result preview - full width on top */}
      <div className="w-full">
        {resultUrl ? (
          <Card className="overflow-hidden relative group">
            {mode === "image" ? (
              <img src={resultUrl} alt="Generated" className="w-full rounded-lg max-h-[500px] object-contain" />
            ) : (
              <video src={resultUrl} controls className="w-full rounded-lg max-h-[500px]" />
            )}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {mode === "image" && (
                <Button
                  variant="secondary"
                  onClick={handleSaveToLibrary}
                  disabled={savingToLibrary || savedToLibrary}
                  title={savedToLibrary ? "Saved to Brand Library" : "Save to Brand Library"}
                  className="gap-2"
                >
                  {savingToLibrary ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedToLibrary ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{savedToLibrary ? "Saved" : "Save"}</span>
                </Button>
              )}
              <Button size="icon" variant="secondary" onClick={handleDownload} title="Download">
                <Download className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleGenerate} title="Regenerate">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center w-full min-h-[350px] border-dashed">
            <div className="text-center text-muted-foreground">
              {mode === "image" ? (
                <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
              ) : (
                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
              )}
              <p className="text-sm">Your generated {mode} will appear here</p>
            </div>
          </Card>
        )}
      </div>

      {/* Prompt + Generate */}
      <div className="space-y-3">
        <Textarea
          placeholder={
            mode === "image"
              ? "e.g. A modern flat-lay of artisan coffee beans on a marble surface with soft morning light…"
              : "e.g. A slow cinematic pan across a sunlit café interior with warm golden tones…"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <Button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full sm:w-auto gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate {mode === "image" ? "Image" : "Video"}
            </>
          )}
        </Button>
      </div>

      {/* Upload + Brand Library */}
      {mode === "image" && (
        <div className="space-y-3">
          {/* Selected inspiration thumbnails */}
          {inspirationUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {inspirationUrls.map((url, idx) => (
                <div key={idx} className="relative inline-block">
                  <img
                    src={url}
                    alt={`Inspiration ${idx + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                  <button
                    onClick={() => setInspirationUrls((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {inspirationUrls.length < 5 && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowLibrary(!showLibrary)}
              >
                <Library className="w-4 h-4" />
                Brand Library
              </Button>
            </div>
          )}

          {/* Library picker - full width, scrollable */}
          {showLibrary && inspirationUrls.length < 5 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Select from Library</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLibrary(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : libraryImages.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No images in your library yet.</p>
              ) : (
                <ScrollArea className="h-80">
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {libraryImages.map((img) => {
                      const isSelected = inspirationUrls.includes(img.value);
                      return (
                        <button
                          key={img.id}
                          disabled={isSelected}
                          onClick={() => {
                            setInspirationUrls((prev) => [...prev, img.value]);
                            if (inspirationUrls.length + 1 >= 5) setShowLibrary(false);
                          }}
                          className={`group relative aspect-square rounded-md overflow-hidden border transition-colors ${
                            isSelected ? "border-primary opacity-50" : "border-border hover:border-primary"
                          }`}
                        >
                          <img
                            src={img.value}
                            alt={img.name || "Library image"}
                            className="w-full h-full object-cover"
                          />
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
    </div>
  );
};

export default ImageVideoGenerator;
