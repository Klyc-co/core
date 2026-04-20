import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Frontend bridge for Instagram/Facebook OAuth.
 * Meta redirects here (https://klyc.ai/oauth/instagram/callback) with ?code=...&state=...
 * We forward those params to the edge function which handles the token exchange,
 * then redirect the user to /profile/import with the result.
 */
export default function InstagramOAuthCallback() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      toast.error(`Instagram connection failed: ${errorDescription || error}`);
      navigate(`/profile/import?error=${encodeURIComponent(errorDescription || error)}`);
      return;
    }

    if (!code || !state) {
      toast.error("Instagram connection failed: missing authorization code");
      navigate("/profile/import?error=Missing+authorization+code");
      return;
    }

    // Forward to the edge function for the token exchange.
    // The edge function will redirect us back to /profile/import on completion.
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const callbackUrl = `https://${projectId}.supabase.co/functions/v1/instagram-oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    window.location.replace(callbackUrl);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Completing Instagram connection…</p>
      </div>
    </div>
  );
}
