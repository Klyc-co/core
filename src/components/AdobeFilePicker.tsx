import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Cloud, BookOpen, Layout, Palette, Type, Image, Layers, Grid3X3, FileImage, FileText, File, Smartphone, Monitor, Hexagon, ArrowLeft, Download, Check } from "lucide-react";
import { toast } from "sonner";
import AdobeCreativeCloudIcon from "@/components/icons/AdobeCreativeCloudIcon";

interface AdobeFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface AssetCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface AssetItem {
  id: string;
  name: string;
  type: string;
  icon?: string;
  ext?: string;
  description?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  cloud: <Cloud className="w-5 h-5" />,
  "book-open": <BookOpen className="w-5 h-5" />,
  layout: <Layout className="w-5 h-5" />,
  palette: <Palette className="w-5 h-5" />,
  type: <Type className="w-5 h-5" />,
  image: <Image className="w-5 h-5" />,
  layers: <Layers className="w-5 h-5" />,
  grid: <Grid3X3 className="w-5 h-5" />,
  "file-image": <FileImage className="w-5 h-5" />,
  "file-text": <FileText className="w-5 h-5" />,
  file: <File className="w-5 h-5" />,
  smartphone: <Smartphone className="w-5 h-5" />,
  monitor: <Monitor className="w-5 h-5" />,
  hexagon: <Hexagon className="w-5 h-5" />,
};

export default function AdobeFilePicker({ open, onOpenChange, onImportComplete }: AdobeFilePickerProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
      setCurrentCategory(null);
      setSelectedAssets(new Set());
    }
  }, [open]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("adobe-cc-list-assets", {
        body: {},
      });
      if (error) throw error;
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Failed to load Adobe categories:", err);
      toast.error("Failed to load Adobe Creative Cloud categories");
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async (categoryId: string) => {
    setLoading(true);
    setCurrentCategory(categoryId);
    try {
      const { data, error } = await supabase.functions.invoke("adobe-cc-list-assets", {
        body: { category: categoryId },
      });
      if (error) throw error;
      setAssets(data.assets || []);
    } catch (err) {
      console.error("Failed to load Adobe assets:", err);
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedAssets.size === 0) return;
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedItems = assets.filter(a => selectedAssets.has(a.id));
      
      for (const item of selectedItems) {
        await supabase.from("brand_assets").insert({
          user_id: user.id,
          asset_type: item.type === "file_category" ? "image" : item.type === "library_category" ? "style" : "template",
          name: item.name,
          value: `adobe_cc://${currentCategory}/${item.id}`,
          metadata: {
            source: "adobe_cc",
            category: currentCategory,
            adobe_type: item.type,
            extension: item.ext || null,
          },
        });
      }

      toast.success(`Imported ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} from Adobe CC`);
      onImportComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import assets");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] grid grid-rows-[auto_1fr_auto] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF0000] flex items-center justify-center">
              <AdobeCreativeCloudIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Adobe Creative Cloud</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {currentCategory ? "Select items to import" : "Choose a category to browse"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto min-h-0">
          {currentCategory && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2"
              onClick={() => { setCurrentCategory(null); setAssets([]); setSelectedAssets(new Set()); }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to categories
            </Button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !currentCategory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm"
                  onClick={() => loadAssets(cat.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {iconMap[cat.icon] || <Cloud className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{cat.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset) => {
                const isSelected = selectedAssets.has(asset.id);
                return (
                  <Card
                    key={asset.id}
                    className={`p-3 cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary/30"
                    }`}
                    onClick={() => toggleAsset(asset.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isSelected ? <Check className="w-4 h-4" /> : (iconMap[asset.icon || "file"] || <File className="w-4 h-4" />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground">{asset.name}</h4>
                        {asset.description && (
                          <p className="text-xs text-muted-foreground truncate">{asset.description}</p>
                        )}
                      </div>
                      {asset.ext && (
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase">
                          {asset.ext}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {currentCategory && assets.length > 0 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedAssets.size} item{selectedAssets.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              onClick={handleImport}
              disabled={selectedAssets.size === 0 || importing}
            >
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Import Selected
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
