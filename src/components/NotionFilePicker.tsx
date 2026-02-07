import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, Database, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useClientContext } from "@/contexts/ClientContext";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon?: string;
  cover?: string;
  created_time: string;
  last_edited_time: string;
  parent_type: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  icon?: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export default function NotionFilePicker({
  open,
  onOpenChange,
  onImportComplete,
}: NotionFilePickerProps) {
  const { getEffectiveUserId } = useClientContext();
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"pages" | "databases">("pages");

  useEffect(() => {
    if (open) {
      fetchNotionContent();
    }
  }, [open]);

  const fetchNotionContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("notion-fetch-content");
      
      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setPages(data.pages || []);
      setDatabases(data.databases || []);
      setWorkspace(data.workspace || null);
    } catch (error) {
      console.error("Failed to fetch Notion content:", error);
      toast.error("Failed to load Notion content");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) {
      toast.info("Please select items to import");
      return;
    }

    setImporting(true);
    try {
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("User not found");

      const selectedPages = pages.filter(p => selectedItems.has(p.id));
      const selectedDatabases = databases.filter(d => selectedItems.has(d.id));

      // Import pages as brand assets (type: document)
      for (const page of selectedPages) {
        await supabase.from("brand_assets").insert({
          user_id: userId,
          asset_type: "document",
          name: page.title,
          value: page.url,
          metadata: {
            source: "notion",
            notion_id: page.id,
            icon: page.icon,
            cover: page.cover,
            parent_type: page.parent_type,
          },
        });
      }

      // Import databases as brand assets (type: document)
      for (const db of selectedDatabases) {
        await supabase.from("brand_assets").insert({
          user_id: userId,
          asset_type: "document",
          name: db.title,
          value: db.url,
          metadata: {
            source: "notion",
            notion_id: db.id,
            icon: db.icon,
            is_database: true,
          },
        });
      }

      const totalImported = selectedPages.length + selectedDatabases.length;
      toast.success(`Imported ${totalImported} item${totalImported > 1 ? "s" : ""} to Assets`);
      
      setSelectedItems(new Set());
      onOpenChange(false);
      onImportComplete?.();
    } catch (error) {
      console.error("Failed to import from Notion:", error);
      toast.error("Failed to import items");
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Browse Notion
            {workspace && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({workspace})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === "pages" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("pages")}
          >
            <FileText className="w-4 h-4 mr-2" />
            Pages ({pages.length})
          </Button>
          <Button
            variant={activeTab === "databases" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("databases")}
          >
            <Database className="w-4 h-4 mr-2" />
            Databases ({databases.length})
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activeTab === "pages" ? (
            pages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pages found</p>
                <p className="text-sm mt-1">Make sure you've shared pages with the integration</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {pages.map((page) => (
                  <Card
                    key={page.id}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedItems.has(page.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => toggleSelection(page.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-lg flex-shrink-0">
                        {page.icon || "📄"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {page.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDate(page.last_edited_time)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {selectedItems.has(page.id) && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          ) : databases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No databases found</p>
              <p className="text-sm mt-1">Make sure you've shared databases with the integration</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {databases.map((db) => (
                <Card
                  key={db.id}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedItems.has(db.id)
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => toggleSelection(db.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-lg flex-shrink-0">
                      {db.icon || "🗃️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {db.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(db.last_edited_time)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={db.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {selectedItems.has(db.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedItems.size === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedItems.size > 0 ? `(${selectedItems.size})` : ""}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
