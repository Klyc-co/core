import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ChevronRight, 
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download
} from "lucide-react";
import DropboxIcon from "@/components/icons/DropboxIcon";
import DropboxFileItem from "@/components/dropbox/DropboxFileItem";

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

interface DropboxFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}


const DropboxFilePicker = ({ open, onOpenChange, onImportComplete }: DropboxFilePickerProps) => {
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [autoSync, setAutoSync] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (path: string = "") => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke("dropbox-list-files", {
        body: { path },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setFiles(data.entries || []);
      setCurrentPath(path);
    } catch (err) {
      console.error("Failed to load Dropbox files:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load files";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadFiles("");
      setSelectedFiles(new Set());
      setPathHistory([]);
    }
  }, [open, loadFiles]);

  const navigateToFolder = (folder: DropboxFile) => {
    setPathHistory([...pathHistory, currentPath]);
    loadFiles(folder.path);
  };

  const navigateBack = () => {
    const previousPath = pathHistory.pop();
    setPathHistory([...pathHistory]);
    loadFiles(previousPath || "");
  };

  const toggleFileSelection = (file: DropboxFile) => {
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
      
      const { data, error: funcError } = await supabase.functions.invoke("dropbox-import-files", {
        body: {
          files: filesToImport,
          enableAutoSync: autoSync,
          autoSyncFolderPath: autoSync ? currentPath : null,
        },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`Successfully imported ${data.imported} files!`);
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Some files had issues: ${data.errors.length} errors`);
      }

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

  const currentPathDisplay = currentPath || "/";
  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DropboxIcon className="w-6 h-6" />
            Select Files from Dropbox
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
            disabled={pathHistory.length === 0 || loading}
            className="h-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <button 
            className="hover:text-primary cursor-pointer font-medium"
            onClick={() => {
              setPathHistory([]);
              loadFiles("");
            }}
          >
            Dropbox
          </button>
          
          {pathParts.map((part, index) => (
            <span key={index} className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
              <span className={index === pathParts.length - 1 ? "text-foreground font-medium" : ""}>
                {part}
              </span>
            </span>
          ))}

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => loadFiles(currentPath)}
            disabled={loading}
            className="h-8 w-8 ml-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 min-h-[300px] border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={() => loadFiles(currentPath)}>
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
                <DropboxFileItem
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onToggleSelection={() => toggleFileSelection(file)}
                  onNavigateToFolder={() => navigateToFolder(file)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Auto-Sync Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="font-medium text-sm">Auto-sync new files</p>
            <p className="text-xs text-muted-foreground">
              Automatically import new files added to this folder
            </p>
          </div>
          <Switch
            checked={autoSync}
            onCheckedChange={setAutoSync}
          />
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

export default DropboxFilePicker;
