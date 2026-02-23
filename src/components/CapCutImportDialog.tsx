import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileVideo, FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";

interface CapCutImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface SelectedFile {
  file: File;
  preview?: string;
}

const ACCEPTED_EXTENSIONS = ".mp4,.mov,.webm,.png,.jpg,.jpeg,.webp,.gif";

const CapCutImportDialog = ({ open, onOpenChange, userId }: CapCutImportDialogProps) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: SelectedFile[] = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles].slice(0, 20));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newFiles: SelectedFile[] = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles].slice(0, 20));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    try {
      let successCount = 0;
      for (const sf of selectedFiles) {
        try {
          const { publicUrl } = await uploadBrandAssetImage({
            userId,
            file: sf.file,
            folder: "capcut",
          });

          await supabase.from("brand_assets").insert({
            user_id: userId,
            asset_type: sf.file.type.startsWith("video/") ? "video" : "image",
            name: sf.file.name,
            value: publicUrl,
            metadata: {
              source: "capcut",
              original_name: sf.file.name,
              file_size: sf.file.size,
              mime_type: sf.file.type,
            },
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to upload ${sf.file.name}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} file${successCount > 1 ? "s" : ""} from CapCut`);
        selectedFiles.forEach((sf) => sf.preview && URL.revokeObjectURL(sf.preview));
        setSelectedFiles([]);
        onOpenChange(false);
      } else {
        toast.error("Failed to import files. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Import failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("video/")) return <FileVideo className="w-5 h-5 text-muted-foreground" />;
    return <FileImage className="w-5 h-5 text-muted-foreground" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from CapCut</DialogTitle>
          <DialogDescription>
            Export your videos or images from CapCut, then upload them here to add to your library.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Drop exported files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            MP4, MOV, WebM, PNG, JPG, WebP, GIF — up to 20 files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* File list */}
        {selectedFiles.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-2">
            {selectedFiles.map((sf, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                {sf.preview ? (
                  <img src={sf.preview} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    {getFileIcon(sf.file)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{sf.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(sf.file.size)}</p>
                </div>
                <button onClick={() => removeFile(i)} className="p-1 hover:bg-muted rounded">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Export tips:</p>
          <p>• Tap <strong>Export</strong> in CapCut to save your video to your device</p>
          <p>• For best quality: use 1080p or 4K resolution</p>
          <p>• You can also export individual frames as images</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CapCutImportDialog;
