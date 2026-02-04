import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GA_OAUTH_STATE_KEY = 'ga_oauth_state';
const GA_OAUTH_STARTED_AT_KEY = 'ga_oauth_started_at';

/**
 * Hook to handle Google Analytics OAuth callback.
 * This runs on page load and checks for OAuth code/state params.
 * If found and valid, it exchanges the code for tokens, notifies opener (if popup), and closes.
 */
export function useGoogleAnalyticsOAuthCallback() {
  const processed = useRef(false);

  useEffect(() => {
    // Only run once
    if (processed.current) return;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      // If no OAuth params, nothing to do
      if (!code || !state) return;

      // Check if this looks like a GA callback (has our stored state)
      const storedState = localStorage.getItem(GA_OAUTH_STATE_KEY);
      
      // If no stored state or doesn't match, might be a different OAuth flow
      if (!storedState) return;

      processed.current = true;
      console.log('GA OAuth callback detected, processing...');

      // Verify CSRF state
      if (storedState !== state) {
        console.error('GA OAuth state mismatch');
        localStorage.removeItem(GA_OAUTH_STATE_KEY);
        localStorage.removeItem(GA_OAUTH_STARTED_AT_KEY);
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname + '?tab=analytics');
        
        toast.error('OAuth session expired. Please try connecting again.');
        
        // If popup, notify opener and close
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'ga_oauth_error' }, window.location.origin);
          window.close();
        }
        return;
      }

      // State is valid - clean up stored state
      localStorage.removeItem(GA_OAUTH_STATE_KEY);
      localStorage.removeItem(GA_OAUTH_STARTED_AT_KEY);

      // Clean URL immediately
      window.history.replaceState({}, '', window.location.pathname + '?tab=analytics');

      try {
        console.log('Exchanging code for tokens...');
        const { data, error } = await supabase.functions.invoke('google-analytics-oauth-callback', {
          body: {
            code,
            redirectUri: `${window.location.origin}/profile/company`
          }
        });

        if (error) throw error;

        console.log('GA OAuth success:', data);
        
        // If we're in a popup, notify the opener and close
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'ga_oauth_success', email: data.email }, window.location.origin);
          // Small delay to ensure message is sent before closing
          setTimeout(() => window.close(), 100);
        } else {
          // Not a popup - show success toast
          toast.success(`Connected to Google Analytics as ${data.email}`);
        }
      } catch (error) {
        console.error('GA OAuth callback error:', error);
        
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'ga_oauth_error' }, window.location.origin);
          setTimeout(() => window.close(), 100);
        } else {
          toast.error('Failed to complete Google Analytics connection');
        }
      }
    };

    handleCallback();
  }, []);
}
