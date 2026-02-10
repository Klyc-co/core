import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ClickUpConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export default function ClickUpConnectModal({ open, onOpenChange, onConnected }: ClickUpConnectModalProps) {
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiToken.trim()) {
      toast.error("Please enter your ClickUp API token");
      return;
    }

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("clickup-connect", {
        body: { action: "connect", apiToken: apiToken.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`ClickUp connected! Workspace: ${data.teamName || "Connected"}`);
      setApiToken("");
      onOpenChange(false);
      onConnected();
    } catch (err: any) {
      toast.error("Failed to connect: " + (err.message || "Unknown error"));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect ClickUp</DialogTitle>
          <DialogDescription>
            Enter your ClickUp Personal API Token to import your tasks, lists, and workspaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              ClickUp API Token
            </label>
            <Input
              type="password"
              placeholder="pk_•••••••••••••"
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConnect()}
            />
          </div>

          <a
            href="https://app.clickup.com/settings/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Find it in ClickUp → Settings → Apps → API Token
          </a>

          <p className="text-xs text-muted-foreground">
            Your token gives Klyc read access to your ClickUp spaces, lists, and tasks for marketing sync.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={connecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={connecting || !apiToken.trim()}>
            {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
