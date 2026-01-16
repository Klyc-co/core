import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
    if (!YOUTUBE_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "YouTube not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create state with user_id
    const state = btoa(JSON.stringify({ user_id: userId, timestamp: Date.now() }));
    
    // YouTube OAuth scopes - readonly access to channel and video data
    const scopes = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly"
    ].join(" ");
    
    // Build Google OAuth URL for YouTube
    const youtubeAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    youtubeAuthUrl.searchParams.set("client_id", YOUTUBE_CLIENT_ID);
    youtubeAuthUrl.searchParams.set("redirect_uri", `${SUPABASE_URL}/functions/v1/youtube-oauth-callback`);
    youtubeAuthUrl.searchParams.set("response_type", "code");
    youtubeAuthUrl.searchParams.set("scope", scopes);
    youtubeAuthUrl.searchParams.set("state", state);
    youtubeAuthUrl.searchParams.set("access_type", "offline");
    youtubeAuthUrl.searchParams.set("prompt", "consent");

    console.log("Generated YouTube auth URL for user:", userId);

    return new Response(
      JSON.stringify({ authUrl: youtubeAuthUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("YouTube auth URL error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
