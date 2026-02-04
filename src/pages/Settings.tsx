import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { Sun, Moon, FolderOpen, ExternalLink, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  // Google Drive Zapier state
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [driveSetupInfo, setDriveSetupInfo] = useState<{
    user_id: string;
    callback_url: string;
    folder_url?: string;
  } | null>(null);
  const [driveConnection, setDriveConnection] = useState<{
    folder_url?: string;
    assets_sheet_url?: string;
    last_sync_at?: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkDriveConnection(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkDriveConnection = async (userId: string) => {
    const { data: driveConn } = await supabase
      .from("google_drive_connections")
      .select("id, folder_url, assets_sheet_url, last_sync_at, connection_status")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (driveConn && driveConn.connection_status === 'connected') {
      setDriveConnection({
        folder_url: driveConn.folder_url ?? undefined,
        assets_sheet_url: driveConn.assets_sheet_url ?? undefined,
        last_sync_at: driveConn.last_sync_at ?? undefined,
      });
    }
  };

  const handleConnectGoogleDriveZapier = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("google-drive-init");
      
      if (error) {
        throw new Error(error.message);
      }

      if (data.already_connected) {
        toast.success("Google Drive already connected!");
        setDriveConnection({ folder_url: data.folder_url });
        return;
      }

      setDriveSetupInfo({
        user_id: data.user_id,
        callback_url: data.callback_url,
      });
      setShowDriveDialog(true);
    } catch (err) {
      console.error("Google Drive init error:", err);
      toast.error("Failed to initialize Google Drive connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

        {/* Appearance Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Appearance</h2>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <div>
                <Label htmlFor="dark-mode" className="text-foreground font-medium">
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark theme
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode"
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </div>

        {/* Integrations Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Integrations</h2>
          
          {/* Google Drive Zapier Integration */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-border flex items-center justify-center">
                  <GoogleDriveIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Google Drive (via Zapier)</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Connect Google Drive for automated marketing asset storage using Zapier
                  </p>
                </div>
              </div>
              <Button
                variant={driveConnection ? "outline" : "default"}
                size="sm"
                onClick={handleConnectGoogleDriveZapier}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : driveConnection ? (
                  "Manage"
                ) : (
                  "Connect"
                )}
              </Button>
            </div>

            {/* Connected Status */}
            {driveConnection && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>Connected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {driveConnection.folder_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={driveConnection.folder_url} target="_blank" rel="noopener noreferrer">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Open Folder
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {driveConnection.assets_sheet_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={driveConnection.assets_sheet_url} target="_blank" rel="noopener noreferrer">
                        Asset Index
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
                {driveConnection.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last synced: {new Date(driveConnection.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Google Drive Setup Dialog */}
      <Dialog open={showDriveDialog} onOpenChange={setShowDriveDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GoogleDriveIcon className="w-5 h-5" />
              Connect Google Drive via Zapier
            </DialogTitle>
            <DialogDescription>
              Set up a Zapier automation to connect your Google Drive for marketing asset storage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Your Zapier Setup Details:</h4>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">User ID:</span>
                  <code className="ml-2 bg-background px-2 py-0.5 rounded text-xs">{driveSetupInfo?.user_id}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Callback URL:</span>
                  <div className="mt-1">
                    <code className="bg-background px-2 py-1 rounded text-xs block break-all">{driveSetupInfo?.callback_url}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Steps to complete:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Create a Zap with a "Webhooks by Zapier" trigger (Catch Hook)</li>
                <li>Add Google Drive actions to create your asset folder structure</li>
                <li>Add Google Sheets actions to create an asset tracking spreadsheet</li>
                <li>Add a final "POST" action to send the folder/sheet IDs to the callback URL above</li>
                <li>Trigger the Zap to complete the connection</li>
              </ol>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Tip:</strong> Include <code className="text-xs">action: "setup_complete"</code> and your <code className="text-xs">user_id</code> in the POST body, along with <code className="text-xs">folder_id</code>, <code className="text-xs">folder_url</code>, and sheet details.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDriveDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(driveSetupInfo?.callback_url || '');
              toast.success("Callback URL copied to clipboard!");
            }}>
              Copy Callback URL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
