import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TrelloCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Processing Trello authorization...");

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Trello returns the token in the URL fragment (hash)
        const hash = window.location.hash.substring(1);
        const fragmentParams = new URLSearchParams(hash);
        const token = fragmentParams.get("token");
        const userId = searchParams.get("user_id");

        if (!token) {
          toast.error("No Trello token received");
          navigate("/profile/import?error=no_token");
          return;
        }

        if (!userId) {
          toast.error("Missing user context");
          navigate("/profile/import?error=missing_user");
          return;
        }

        setStatus("Connecting your Trello account...");

        // Send the token to our edge function to validate and store
        const { data, error } = await supabase.functions.invoke("trello-oauth-callback", {
          body: { userId, token },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(`Trello connected! Found ${data.boardCount || 0} boards.`);
        navigate("/profile/import?success=trello");
      } catch (err: any) {
        console.error("Trello callback error:", err);
        toast.error("Failed to connect Trello: " + (err.message || "Unknown error"));
        navigate("/profile/import?error=trello_failed");
      }
    };

    processCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
