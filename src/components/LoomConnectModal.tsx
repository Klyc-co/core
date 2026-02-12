import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LoomConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export default function LoomConnectModal({ open, onOpenChange, onConnected }: LoomConnectModalProps) {
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiToken.trim()) {
      toast.error("Please enter your API token");
      return;
    }

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("loom-connect", {
        body: { action: "connect", apiToken: apiToken.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Loom connected successfully!");
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
          <DialogTitle>Connect Loom</DialogTitle>
          <DialogDescription>
            Enter your Loom Developer API token to connect your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              API Token
            </label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConnect()}
            />
          </div>

          <a
            href="https://www.loom.com/developer-portal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Get your API token from the Loom Developer Portal
          </a>

          <p className="text-xs text-muted-foreground">
            Visit <strong>loom.com/developer-portal</strong>, create an app, and copy your Personal Access Token.
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
