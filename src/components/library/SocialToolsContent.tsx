import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useClientContext } from "@/contexts/ClientContext";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import DropboxIcon from "@/components/icons/DropboxIcon";
import NotionIcon from "@/components/icons/NotionIcon";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import DropboxFilePicker from "@/components/DropboxFilePicker";
import NotionFilePicker from "@/components/NotionFilePicker";

interface ToolConnection {
  id: string;
  type: "dropbox" | "google_drive" | "notion";
  name: string;
  email?: string;
  connected: boolean;
  lastSync?: string;
}

interface SocialToolsContentProps {
  onImportComplete?: () => void;
}

export default function SocialToolsContent({ onImportComplete }: SocialToolsContentProps) {
  const navigate = useNavigate();
  const { getEffectiveUserId } = useClientContext();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ToolConnection[]>([]);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [showDropboxPicker, setShowDropboxPicker] = useState(false);
  const [showNotionPicker, setShowNotionPicker] = useState(false);
  const [importingFromTool, setImportingFromTool] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const userId = getEffectiveUserId();
      if (!userId) return;

      // Fetch Dropbox connection
      const { data: dropboxConn } = await supabase
        .from("dropbox_connections")
        .select("id, account_email, account_display_name, last_sync_at")
        .eq("user_id", userId)
        .maybeSingle();

      // Fetch Google Drive connection from social_connections
      const { data: driveConn } = await supabase
        .from("social_connections")
        .select("id, platform_username, updated_at")
        .eq("user_id", userId)
        .eq("platform", "google_drive")
        .maybeSingle();

      // Fetch Notion connection from social_connections
      const { data: notionConn } = await supabase
        .from("social_connections")
        .select("id, platform_username, updated_at")
        .eq("user_id", userId)
        .eq("platform", "notion")
        .maybeSingle();

      const toolConnections: ToolConnection[] = [];

      // Always show Dropbox option
      toolConnections.push({
        id: dropboxConn?.id || "dropbox",
        type: "dropbox",
        name: dropboxConn?.account_display_name || "Dropbox",
        email: dropboxConn?.account_email || undefined,
        connected: !!dropboxConn,
        lastSync: dropboxConn?.last_sync_at,
      });

      // Always show Google Drive option
      toolConnections.push({
        id: driveConn?.id || "google_drive",
        type: "google_drive",
        name: "Google Drive",
        email: driveConn?.platform_username || undefined,
        connected: !!driveConn,
        lastSync: driveConn?.updated_at,
      });

      // Always show Notion option
      toolConnections.push({
        id: notionConn?.id || "notion",
        type: "notion",
        name: "Notion",
        email: notionConn?.platform_username || undefined,
        connected: !!notionConn,
        lastSync: notionConn?.updated_at,
      });

      setConnections(toolConnections);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = (tool: ToolConnection) => {
    if (!tool.connected) {
      // Navigate to import page to connect
      navigate("/profile/import");
      return;
    }

    // Open the respective file picker
    if (tool.type === "dropbox") {
      setShowDropboxPicker(true);
    } else if (tool.type === "google_drive") {
      setShowGoogleDrivePicker(true);
    } else if (tool.type === "notion") {
      setShowNotionPicker(true);
    }
  };

  const handleGoogleDriveSelect = async (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string; mimeType?: string }>) => {
    if (files.length === 0) {
      setShowGoogleDrivePicker(false);
      return;
    }

    setImportingFromTool("google_drive");
    try {
      const userId = getEffectiveUserId();
      if (!userId) throw new Error("User not found");

      // Import each selected file as a brand asset
      const imageFiles = files.filter(f => 
        f.mimeType?.startsWith("image/") || 
        f.thumbnailUrl ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
      );

      if (imageFiles.length === 0) {
        toast.info("No images selected. Only image files can be imported to Assets.");
        setShowGoogleDrivePicker(false);
        setImportingFromTool(null);
        return;
      }

      for (const file of imageFiles) {
        await supabase.from("brand_assets").insert({
          user_id: userId,
          asset_type: "image",
          name: file.name,
          value: file.thumbnailUrl || file.path,
          metadata: { 
            source: "google_drive", 
            drive_file_id: file.id,
            original_path: file.path
          },
        });
      }

      toast.success(`Imported ${imageFiles.length} file${imageFiles.length > 1 ? "s" : ""} to Assets`);
      onImportComplete?.();
    } catch (error) {
      console.error("Failed to import from Google Drive:", error);
      toast.error("Failed to import files");
    } finally {
      setShowGoogleDrivePicker(false);
      setImportingFromTool(null);
    }
  };

  // Dropbox picker handles its own import, we just need to refresh assets after
  const handleDropboxImportComplete = () => {
    toast.success("Files imported from Dropbox");
    onImportComplete?.();
  };

  const getToolIcon = (type: ToolConnection["type"]) => {
    switch (type) {
      case "dropbox":
        return <DropboxIcon className="w-10 h-10" />;
      case "google_drive":
        return <GoogleDriveIcon className="w-10 h-10" />;
      case "notion":
        return <NotionIcon className="w-10 h-10" />;
      default:
        return <FolderOpen className="w-10 h-10 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const connectedTools = connections.filter(c => c.connected);
  const disconnectedTools = connections.filter(c => !c.connected);

  return (
    <>
      <div className="space-y-6">
        {/* Connected Tools */}
        {connectedTools.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Connected Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedTools.map((tool) => (
                <Card
                  key={tool.id}
                  className="p-6 cursor-pointer hover:border-primary/50 transition-all group"
                  onClick={() => handleToolClick(tool)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getToolIcon(tool.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{tool.name}</h4>
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      {tool.email && (
                        <p className="text-sm text-muted-foreground truncate">{tool.email}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to browse & import files
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Disconnected Tools */}
        {disconnectedTools.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {connectedTools.length > 0 ? "Connect More Tools" : "Available Tools"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {disconnectedTools.map((tool) => (
                <Card
                  key={tool.id}
                  className="p-6 cursor-pointer hover:border-primary/50 transition-all opacity-75 hover:opacity-100"
                  onClick={() => handleToolClick(tool)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 grayscale">
                      {getToolIcon(tool.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground mb-1">{tool.name}</h4>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no tools exist */}
        {connections.length === 0 && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Social Tools Connected</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Connect your cloud storage tools like Dropbox or Google Drive to browse and import files directly to your Assets.
              </p>
              <Button onClick={() => navigate("/profile/import")}>
                Connect Tools
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* File Pickers */}
      <GoogleDriveFilePicker
        open={showGoogleDrivePicker}
        onOpenChange={setShowGoogleDrivePicker}
        fileTypeFilter="image"
        selectionMode="import"
        onFilesSelected={handleGoogleDriveSelect}
      />

      <DropboxFilePicker
        open={showDropboxPicker}
        onOpenChange={setShowDropboxPicker}
        onImportComplete={handleDropboxImportComplete}
      />

      <NotionFilePicker
        open={showNotionPicker}
        onOpenChange={setShowNotionPicker}
        onImportComplete={onImportComplete}
      />

      {/* Loading overlay during import */}
      {importingFromTool && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Card className="p-6 flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-foreground">Importing files to Assets...</span>
          </Card>
        </div>
      )}
    </>
  );
}
