import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Loader2, FolderOpen, ExternalLink, RefreshCw, Settings, Unlink } from "lucide-react";
import DropboxIcon from "@/components/icons/DropboxIcon";
import DropboxFilePicker from "./DropboxFilePicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DropboxConnectionCardProps {
  userId: string;
  onConnectionChange?: () => void;
}

interface DropboxConnection {
  id: string;
  account_email?: string;
  account_display_name?: string;
  last_sync_at?: string;
  auto_sync_enabled?: boolean;
  auto_sync_folder_path?: string;
  connection_status: string;
}

const DropboxConnectionCard = ({ userId, onConnectionChange }: DropboxConnectionCardProps) => {
  const [connection, setConnection] = useState<DropboxConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("dropbox_connections")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking Dropbox connection:", error);
        return;
      }

      setConnection(data);

      // Get imported asset count
      if (data) {
        const { count } = await supabase
          .from("dropbox_assets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        setImportedCount(count || 0);
      }
    } catch (err) {
      console.error("Failed to check Dropbox connection:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      checkConnection();
    }
  }, [userId]);

  const handleConnect = async () => {
    setConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("dropbox-auth-url");

      if (error) {
        throw new Error(error.message);
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      console.error("Dropbox connect error:", err);
      toast.error("Failed to connect to Dropbox");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("dropbox-disconnect");

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Dropbox disconnected successfully");
      setConnection(null);
      setImportedCount(0);
      onConnectionChange?.();
    } catch (err) {
      console.error("Dropbox disconnect error:", err);
      toast.error("Failed to disconnect Dropbox");
    } finally {
      setDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const handleImportComplete = () => {
    checkConnection();
    onConnectionChange?.();
  };

  const isConnected = connection?.connection_status === "connected";

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0061FF] flex items-center justify-center">
            <DropboxIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`p-5 ${isConnected ? "border-green-500/50 bg-green-500/5" : ""}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#0061FF] flex items-center justify-center">
            <DropboxIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Dropbox</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected 
                ? connection.account_email || "Account connected"
                : "Not connected"
              }
            </p>
          </div>
          {isConnected && <Check className="w-5 h-5 text-green-500" />}
        </div>

        {isConnected ? (
          <div className="space-y-3">
            {/* Connection Info */}
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              {connection.account_display_name && (
                <p className="text-foreground font-medium">{connection.account_display_name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {importedCount} assets imported
              </p>
              {connection.last_sync_at && (
                <p className="text-muted-foreground text-xs">
                  Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                </p>
              )}
              {connection.auto_sync_enabled && (
                <p className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Auto-sync enabled
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => setShowFilePicker(true)}
              >
                <FolderOpen className="w-4 h-4 mr-1" />
                Browse Files
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        )}
      </Card>

      {/* File Picker Dialog */}
      <DropboxFilePicker
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        onImportComplete={handleImportComplete}
      />

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Dropbox?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Dropbox connection. Your imported assets will remain in your library,
              but auto-sync will stop and you won't be able to import new files until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DropboxConnectionCard;
