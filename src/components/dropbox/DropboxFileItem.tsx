import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Folder, 
  File, 
  FileText, 
  FileSpreadsheet, 
  ChevronRight,
  Video
} from "lucide-react";
import { useDropboxThumbnail } from "@/hooks/use-dropbox-thumbnail";

interface DropboxFile {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  assetType?: string;
}

interface DropboxFileItemProps {
  file: DropboxFile;
  isSelected: boolean;
  onToggleSelection: () => void;
  onNavigateToFolder: () => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileIcon = (file: DropboxFile) => {
  if (file.isFolder) return <Folder className="w-10 h-10 text-yellow-500" />;
  switch (file.assetType) {
    case "video":
      return <Video className="w-10 h-10 text-purple-500" />;
    case "document":
      return <FileText className="w-10 h-10 text-blue-500" />;
    case "spreadsheet":
      return <FileSpreadsheet className="w-10 h-10 text-emerald-500" />;
    default:
      return <File className="w-10 h-10 text-muted-foreground" />;
  }
};

const DropboxFileItem = ({
  file,
  isSelected,
  onToggleSelection,
  onNavigateToFolder,
}: DropboxFileItemProps) => {
  const isImage = file.assetType === "image";
  const { thumbnailUrl, loading: thumbnailLoading } = useDropboxThumbnail(
    isImage ? file.path : null,
    isImage
  );
  const [imageError, setImageError] = useState(false);

  // Reset image error when file changes
  useEffect(() => {
    setImageError(false);
  }, [file.path]);

  const renderThumbnail = () => {
    if (file.isFolder || !isImage) {
      return (
        <div className="w-16 h-16 flex items-center justify-center bg-muted/30 rounded-md">
          {getFileIcon(file)}
        </div>
      );
    }

    if (thumbnailLoading) {
      return <Skeleton className="w-16 h-16 rounded-md" />;
    }

    if (thumbnailUrl && !imageError) {
      return (
        <img
          src={thumbnailUrl}
          alt={file.name}
          className="w-16 h-16 object-cover rounded-md bg-muted"
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback to icon if no thumbnail or error
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-muted/30 rounded-md">
        {getFileIcon(file)}
      </div>
    );
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelection}
      />
      
      {renderThumbnail()}
      
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => file.isFolder ? onNavigateToFolder() : onToggleSelection()}
      >
        <div className="font-medium truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground flex gap-2">
          {file.size && <span>{formatFileSize(file.size)}</span>}
          {file.modifiedAt && (
            <span>{new Date(file.modifiedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {file.isFolder && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={onNavigateToFolder}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default DropboxFileItem;
