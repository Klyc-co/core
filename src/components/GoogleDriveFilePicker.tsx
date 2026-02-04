import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// NOTE: Radix ScrollArea can be finicky inside Dialogs depending on layout constraints.
// We use a plain overflow container here for reliable scrolling.
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Folder, 
  File, 
  FileText, 
  FileSpreadsheet, 
  ChevronRight, 
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download,
  Video,
  Image as ImageIcon
} from "lucide-react";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";

interface DriveFile {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  assetType?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

interface GoogleDriveFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileIcon = (file: DriveFile) => {
  if (file.isFolder) return <Folder className="w-10 h-10 text-yellow-500" />;
  switch (file.assetType) {
    case "image":
      return <ImageIcon className="w-10 h-10 text-green-500" />;
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

const GoogleDriveFilePicker = ({ open, onOpenChange, onImportComplete }: GoogleDriveFilePickerProps) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (folderId: string = "root") => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke("google-drive-list-files", {
        body: { folderId },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setFiles(data.entries || []);
      setCurrentFolderId(folderId);
    } catch (err) {
      console.error("Failed to load Google Drive files:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load files";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadFiles("root");
      setSelectedFiles(new Set());
      setFolderHistory([]);
    }
  }, [open, loadFiles]);

  const navigateToFolder = (folder: DriveFile) => {
    setFolderHistory([...folderHistory, { id: currentFolderId, name: currentFolderId === "root" ? "My Drive" : folder.name }]);
    loadFiles(folder.id);
  };

  const navigateBack = () => {
    const previous = folderHistory.pop();
    setFolderHistory([...folderHistory]);
    loadFiles(previous?.id || "root");
  };

  const toggleFileSelection = (file: DriveFile) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file.id)) {
      newSelected.delete(file.id);
    } else {
      newSelected.add(file.id);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) {
      toast.error("Please select files to import");
      return;
    }

    setImporting(true);

    try {
      const filesToImport = files.filter((f) => selectedFiles.has(f.id));
      
      // TODO: Implement google-drive-import-files edge function
      // For now, just show a success message
      toast.success(`Selected ${filesToImport.length} files for import. Import functionality coming soon!`);
      
      setSelectedFiles(new Set());
      onOpenChange(false);
      onImportComplete?.();
    } catch (err) {
      console.error("Import failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      toast.error(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const renderThumbnail = (file: DriveFile) => {
    if (file.isFolder) {
      return (
        <div className="w-16 h-16 flex items-center justify-center bg-muted/30 rounded-md">
          {getFileIcon(file)}
        </div>
      );
    }

    if (file.assetType === "image" && file.thumbnailUrl) {
      return (
        <img
          src={file.thumbnailUrl}
          alt={file.name}
          className="w-16 h-16 object-cover rounded-md bg-muted"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    return (
      <div className="w-16 h-16 flex items-center justify-center bg-muted/30 rounded-md">
        {getFileIcon(file)}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GoogleDriveIcon className="w-6 h-6" />
            Select Files from Google Drive
          </DialogTitle>
          <DialogDescription>
            Choose files and folders to import into your asset library
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm border-b pb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={navigateBack}
            disabled={folderHistory.length === 0 || loading}
            className="h-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <button 
            className="hover:text-primary cursor-pointer font-medium"
            onClick={() => {
              setFolderHistory([]);
              loadFiles("root");
            }}
          >
            My Drive
          </button>
          
          {folderHistory.map((folder, index) => (
            <span key={index} className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
              <span className={index === folderHistory.length - 1 ? "text-foreground font-medium" : ""}>
                {folder.name}
              </span>
            </span>
          ))}

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => loadFiles(currentFolderId)}
            disabled={loading}
            className="h-8 w-8 ml-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* File List */}
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={() => loadFiles(currentFolderId)}>
                Try Again
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
              This folder is empty
            </div>
          ) : (
            <div className="divide-y">
              {/* Select All Header */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 sticky top-0">
                <Checkbox
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedFiles.size > 0 
                    ? `${selectedFiles.size} selected` 
                    : "Select all"
                  }
                </span>
              </div>

              {/* File Items */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${
                    selectedFiles.has(file.id) ? "bg-primary/5" : ""
                  }`}
                >
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => toggleFileSelection(file)}
                  />
                  
                  {renderThumbnail(file)}
                  
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => file.isFolder ? navigateToFolder(file) : toggleFileSelection(file)}
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
                      onClick={() => navigateToFolder(file)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedFiles.size === 0 || importing}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Import {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleDriveFilePicker;
