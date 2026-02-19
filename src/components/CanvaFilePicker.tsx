import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Download, Check, ImageIcon, RefreshCw } from "lucide-react";
import CanvaIcon from "@/components/icons/CanvaIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CanvaDesign {
  id: string;
  title: string;
  thumbnail?: { url: string };
  urls?: { edit_url?: string; view_url?: string };
  created_at?: string;
  updated_at?: string;
}

interface CanvaFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export default function CanvaFilePicker({ open, onOpenChange, onImportComplete }: CanvaFilePickerProps) {
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [continuation, setContinuation] = useState<string | null>(null);
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchDesigns = useCallback(async (query?: string, cont?: string) => {
    const isLoadMore = !!cont;
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params: Record<string, string> = { action: "list" };
      if (query) params.query = query;
      if (cont) params.continuation = cont;

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/canva-list-designs?${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch designs");
      }

      const result = await response.json();
      const newDesigns = result.items || [];

      if (isLoadMore) {
        setDesigns((prev) => [...prev, ...newDesigns]);
      } else {
        setDesigns(newDesigns);
      }

      setContinuation(result.continuation || null);
    } catch (error: any) {
      console.error("Failed to fetch Canva designs:", error);
      toast.error(error.message || "Failed to load Canva designs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setDesigns([]);
      setSelectedDesigns(new Set());
      setContinuation(null);
      setSearchQuery("");
      fetchDesigns();
    }
  }, [open, fetchDesigns]);

  const handleSearch = () => {
    setContinuation(null);
    fetchDesigns(searchQuery || undefined);
  };

  const toggleSelect = (id: string) => {
    setSelectedDesigns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedDesigns.size === 0) return;
    setImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selected = designs.filter((d) => selectedDesigns.has(d.id));
      let importedCount = 0;

      for (const design of selected) {
        // Use thumbnail URL directly as the asset value
        const imageUrl = design.thumbnail?.url;
        if (!imageUrl) continue;

        await supabase.from("brand_assets").insert({
          user_id: user.id,
          asset_type: "image",
          name: design.title || "Canva Design",
          value: imageUrl,
          metadata: {
            source: "canva",
            canva_design_id: design.id,
            edit_url: design.urls?.edit_url,
          },
        });
        importedCount++;
      }

      toast.success(`Imported ${importedCount} design${importedCount > 1 ? "s" : ""} to Assets`);
      onImportComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Canva import error:", error);
      toast.error(error.message || "Failed to import designs");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] !grid-rows-[auto_auto_1fr_auto] p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CanvaIcon className="w-5 h-5" />
              Canva Designs
            </DialogTitle>
            <DialogDescription>
              Browse and import your Canva designs into your library
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Search bar */}
        <div className="px-6 pt-3 flex gap-2">
          <Input
            placeholder="Search designs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => fetchDesigns(searchQuery || undefined)} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Designs grid */}
        <div className="overflow-y-auto border-t mx-6 mt-3 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No designs found</p>
              <p className="text-xs">Try a different search or check your Canva account</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
                {designs.map((design) => {
                  const isSelected = selectedDesigns.has(design.id);
                  return (
                    <button
                      key={design.id}
                      onClick={() => toggleSelect(design.id)}
                      className={`group relative rounded-lg overflow-hidden border transition-all text-left ${
                        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="aspect-[4/3] bg-muted">
                        {design.thumbnail?.url ? (
                          <img
                            src={design.thumbnail.url}
                            alt={design.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CanvaIcon className="w-8 h-8 opacity-30" />
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{design.title || "Untitled"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {continuation && (
                <div className="flex justify-center pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDesigns(searchQuery || undefined, continuation)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedDesigns.size > 0
              ? `${selectedDesigns.size} design${selectedDesigns.size > 1 ? "s" : ""} selected`
              : "Select designs to import"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={selectedDesigns.size === 0 || importing}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import to Assets
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
