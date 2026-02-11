import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TrelloConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export default function TrelloConnectModal({ open, onOpenChange, onConnected }: TrelloConnectModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiToken.trim()) {
      toast.error("Please enter both API key and token");
      return;
    }

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("trello-connect", {
        body: { action: "connect", apiKey: apiKey.trim(), apiToken: apiToken.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Trello connected! Found ${data.boardCount || 0} boards.`);
      setApiKey("");
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
          <DialogTitle>Connect Trello</DialogTitle>
          <DialogDescription>
            Enter your Trello API credentials to connect your boards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              API Key
            </label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>

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
            href="https://trello.com/app-key"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Get your API key and token
          </a>

          <p className="text-xs text-muted-foreground">
            Visit <strong>trello.com/app-key</strong>, copy your API key, then click "Token" to generate your token.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={connecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={connecting || !apiKey.trim() || !apiToken.trim()}>
            {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
