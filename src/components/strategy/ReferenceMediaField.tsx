import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Link2, X, Image as ImageIcon, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReferenceMediaFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** Supabase Storage path prefix, e.g. "characters" or "scene" */
  storagePath?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function isVideo(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url) || url.includes("video");
}

export default function ReferenceMediaField({
  value,
  onChange,
  label = "Reference Media",
  storagePath = "general",
}: ReferenceMediaFieldProps) {
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large — max 25 MB");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${user.id}/${storagePath}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("client-references")
        .upload(filePath, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("client-references")
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
      toast.success("File uploaded");
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const hasValue = !!value.trim();
  const videoMode = isVideo(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${
              mode === "link"
                ? "bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Link2 className="w-3 h-3" /> Link
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium border-l border-border transition-colors ${
              mode === "upload"
                ? "bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
        </div>
      </div>

      {mode === "link" ? (
        <Input
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-xs"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3.5 h-3.5 mr-1.5" /> Choose image or video (max 25 MB)</>
            )}
          </Button>
        </div>
      )}

      {/* Thumbnail Preview */}
      {hasValue && (
        <div className="relative inline-block">
          {videoMode ? (
            <video
              src={value}
              controls
              className="w-full max-w-[240px] max-h-[160px] rounded-md border border-border object-cover"
            />
          ) : (
            <img
              src={value}
              alt="Reference"
              className="w-full max-w-[240px] max-h-[160px] rounded-md border border-border object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
          <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
            {videoMode ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
            {videoMode ? "Video" : "Image"}
          </div>
        </div>
      )}
    </div>
  );
}
