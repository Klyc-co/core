import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, Check, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useClientContext } from "@/contexts/ClientContext";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import DropboxIcon from "@/components/icons/DropboxIcon";
import NotionIcon from "@/components/icons/NotionIcon";
import AdobeCreativeCloudIcon from "@/components/icons/AdobeCreativeCloudIcon";
import AirtableIcon from "@/components/icons/AirtableIcon";
import ClickUpIcon from "@/components/icons/ClickUpIcon";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import DropboxFilePicker from "@/components/DropboxFilePicker";
import NotionFilePicker from "@/components/NotionFilePicker";
import AdobeFilePicker from "@/components/AdobeFilePicker";
import AirtableConnectModal from "@/components/AirtableConnectModal";
import AirtableDrawer from "@/components/AirtableDrawer";
import ClickUpConnectModal from "@/components/ClickUpConnectModal";
import ClickUpDrawer from "@/components/ClickUpDrawer";

interface ToolConnection {
  id: string;
  type: "dropbox" | "google_drive" | "notion" | "adobe_cc" | "airtable" | "clickup";
  name: string;
  email?: string;
  connected: boolean;
  lastSync?: string;
  summary?: string;
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
  const [showAdobePicker, setShowAdobePicker] = useState(false);
  const [showAirtableConnectModal, setShowAirtableConnectModal] = useState(false);
  const [showAirtableDrawer, setShowAirtableDrawer] = useState(false);
  const [showClickUpConnectModal, setShowClickUpConnectModal] = useState(false);
  const [showClickUpDrawer, setShowClickUpDrawer] = useState(false);
  const [importingFromTool, setImportingFromTool] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const userId = getEffectiveUserId();
      if (!userId) return;
      setCurrentUserId(userId);

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

      // Fetch Adobe CC connection from social_connections
      const { data: adobeConn } = await supabase
        .from("social_connections")
        .select("id, platform_username, updated_at")
        .eq("user_id", userId)
        .eq("platform", "adobe_cc")
        .maybeSingle();

      // Fetch Airtable connection
      const { data: airtableConn } = await supabase
        .from("airtable_connections")
        .select("id, connection_status, last_sync_at")
        .eq("user_id", userId)
        .maybeSingle();

      // Fetch ClickUp connection
      const { data: clickupConn } = await supabase
        .from("clickup_connections")
        .select("id, connection_status, last_sync_at, team_name")
        .eq("user_id", userId)
        .maybeSingle();

      // Get Airtable summary if connected
      let airtableSummary = "";
      if (airtableConn) {
        const { data: mappings } = await supabase
          .from("airtable_table_mappings")
          .select("table_type, synced_record_count")
          .eq("user_id", userId)
          .eq("is_synced", true);
        if (mappings && mappings.length > 0) {
          const totalRecords = mappings.reduce((s, m) => s + ((m as any).synced_record_count || 0), 0);
          airtableSummary = `${mappings.length} table${mappings.length > 1 ? "s" : ""} synced · ${totalRecords} records`;
        }
      }

      // Get ClickUp summary if connected
      let clickupSummary = "";
      if (clickupConn) {
        const { data: clickupLists } = await supabase
          .from("clickup_lists")
          .select("id")
          .eq("user_id", userId)
          .eq("is_selected_for_sync", true);
        const syncedCount = clickupLists?.length || 0;
        clickupSummary = syncedCount > 0 ? `${syncedCount} list${syncedCount > 1 ? "s" : ""} synced` : "";
      }

      const toolConnections: ToolConnection[] = [];

      toolConnections.push({
        id: dropboxConn?.id || "dropbox",
        type: "dropbox",
        name: dropboxConn?.account_display_name || "Dropbox",
        email: dropboxConn?.account_email || undefined,
        connected: !!dropboxConn,
        lastSync: dropboxConn?.last_sync_at,
      });

      toolConnections.push({
        id: driveConn?.id || "google_drive",
        type: "google_drive",
        name: "Google Drive",
        email: driveConn?.platform_username || undefined,
        connected: !!driveConn,
        lastSync: driveConn?.updated_at,
      });

      toolConnections.push({
        id: notionConn?.id || "notion",
        type: "notion",
        name: "Notion",
        email: notionConn?.platform_username || undefined,
        connected: !!notionConn,
        lastSync: notionConn?.updated_at,
      });

      toolConnections.push({
        id: adobeConn?.id || "adobe_cc",
        type: "adobe_cc",
        name: "Adobe Creative Cloud",
        email: adobeConn?.platform_username || undefined,
        connected: !!adobeConn,
        lastSync: adobeConn?.updated_at,
      });

      toolConnections.push({
        id: airtableConn?.id || "airtable",
        type: "airtable",
        name: "Airtable",
        connected: !!airtableConn,
        lastSync: airtableConn?.last_sync_at,
        summary: airtableSummary || undefined,
      });

      toolConnections.push({
        id: clickupConn?.id || "clickup",
        type: "clickup",
        name: "ClickUp",
        connected: !!clickupConn,
        lastSync: clickupConn?.last_sync_at,
        summary: clickupSummary || undefined,
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
      if (tool.type === "airtable") {
        setShowAirtableConnectModal(true);
        return;
      }
      if (tool.type === "clickup") {
        setShowClickUpConnectModal(true);
        return;
      }
      navigate("/profile/import");
      return;
    }

    // Open the respective file picker / drawer
    if (tool.type === "dropbox") {
      setShowDropboxPicker(true);
    } else if (tool.type === "google_drive") {
      setShowGoogleDrivePicker(true);
    } else if (tool.type === "notion") {
      setShowNotionPicker(true);
    } else if (tool.type === "adobe_cc") {
      setShowAdobePicker(true);
    } else if (tool.type === "airtable") {
      setShowAirtableDrawer(true);
    } else if (tool.type === "clickup") {
      setShowClickUpDrawer(true);
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
      case "adobe_cc":
        return <AdobeCreativeCloudIcon className="w-10 h-10" />;
      case "airtable":
        return <AirtableIcon className="w-10 h-10" />;
      case "clickup":
        return <ClickUpIcon className="w-10 h-10" />;
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
                      {tool.summary && (
                        <p className="text-xs text-muted-foreground mt-1">{tool.summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {tool.type === "airtable" || tool.type === "clickup" ? "Click to configure & browse data" : "Click to browse & import files"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      {tool.type === "airtable" || tool.type === "clickup" ? (
                        <><Settings className="w-4 h-4 mr-2" />Configure & Sync</>
                      ) : (
                        <><FolderOpen className="w-4 h-4 mr-2" />Browse Files</>
                      )}
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
                      <p className="text-sm text-muted-foreground">
                        {tool.type === "airtable"
                          ? "Pull in content calendars, briefs & social planning tables"
                          : tool.type === "clickup"
                          ? "Pull in content calendars, briefs & marketing tasks from ClickUp"
                          : "Not connected"}
                      </p>
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

      <AdobeFilePicker
        open={showAdobePicker}
        onOpenChange={setShowAdobePicker}
        onImportComplete={onImportComplete}
      />

      {/* Airtable Connect Modal */}
      <AirtableConnectModal
        open={showAirtableConnectModal}
        onOpenChange={setShowAirtableConnectModal}
        onConnected={() => fetchConnections()}
      />

      {/* Airtable Drawer */}
      {currentUserId && (
        <AirtableDrawer
          open={showAirtableDrawer}
          onOpenChange={setShowAirtableDrawer}
          userId={currentUserId}
        />
      )}

      {/* ClickUp Connect Modal */}
      <ClickUpConnectModal
        open={showClickUpConnectModal}
        onOpenChange={setShowClickUpConnectModal}
        onConnected={() => fetchConnections()}
      />

      {/* ClickUp Drawer */}
      {currentUserId && (
        <ClickUpDrawer
          open={showClickUpDrawer}
          onOpenChange={setShowClickUpDrawer}
          userId={currentUserId}
        />
      )}

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
