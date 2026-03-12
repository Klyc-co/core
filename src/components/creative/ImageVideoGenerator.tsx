import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Image,
  Video,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type ImageModel = "nano-banana" | "runway" | "fooocus";

const IMAGE_MODELS: { value: ImageModel; label: string; description: string }[] = [
  { value: "nano-banana", label: "Nano Banana", description: "Fast AI generation (default)" },
  { value: "runway", label: "Runway", description: "High-quality cinematic visuals" },
  { value: "fooocus", label: "Fooocus", description: "Fine-tuned artistic styles" },
];

interface ImageVideoGeneratorProps {
  onBack: () => void;
}

const ImageVideoGenerator = ({ onBack }: ImageVideoGeneratorProps) => {
  const [mode, setMode] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [imageModel, setImageModel] = useState<ImageModel>("nano-banana");
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description");
      return;
    }
    setGenerating(true);
    setResultUrl(null);

    try {
      if (mode === "image") {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt, model: "nano-banana" },
        });
        if (error) throw error;
        if (!data?.imageUrl) throw new Error("No image returned");
        setResultUrl(data.imageUrl);
        toast.success("Image generated!");
      } else {
        const { data, error } = await supabase.functions.invoke("generate-broll", {
          body: { prompt, standalone: true },
        });
        if (error) throw error;
        if (data?.videoUrl) {
          setResultUrl(data.videoUrl);
          toast.success("Video generated!");
        } else {
          toast.info("Video generation started — this may take a few minutes.");
        }
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Image & Video Generator</h2>
          <p className="text-sm text-muted-foreground">Create AI-generated visuals from text descriptions</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as "image" | "video"); setResultUrl(null); }}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="image" className="gap-2">
            <Image className="w-4 h-4" /> Image
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="w-4 h-4" /> Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Describe the image you want to create. Be specific about colors, style, composition, and subject matter.
          </p>
        </TabsContent>
        <TabsContent value="video" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Describe the video clip you want to generate. Include details about motion, scene, and mood.
          </p>
        </TabsContent>
      </Tabs>

      {/* Prompt + Generate */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <Textarea
            placeholder={
              mode === "image"
                ? "e.g. A modern flat-lay of artisan coffee beans on a marble surface with soft morning light…"
                : "e.g. A slow cinematic pan across a sunlit café interior with warm golden tones…"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
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

        {/* Result */}
        <div className="flex-1 min-h-[300px]">
          {resultUrl ? (
            <Card className="overflow-hidden relative group">
              {mode === "image" ? (
                <img src={resultUrl} alt="Generated" className="w-full rounded-lg" />
              ) : (
                <video src={resultUrl} controls className="w-full rounded-lg" />
              )}
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" onClick={handleDownload} title="Download">
                  <Download className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" onClick={handleGenerate} title="Regenerate">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-full min-h-[300px] border-dashed">
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
      </div>
    </div>
  );
};

export default ImageVideoGenerator;
