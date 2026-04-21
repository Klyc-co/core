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

    const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
    if (!TIKTOK_CLIENT_KEY) {
      return new Response(
        JSON.stringify({ error: "TikTok not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create state with user_id
    const state = btoa(JSON.stringify({ user_id: userId, timestamp: Date.now() }));
    
    // TikTok OAuth scopes — TikTok rejects the request entirely if you ask for a scope your app
    // isn't approved for. Configure via TIKTOK_SCOPES secret. Default to the safest set that works
    // with the basic "Login Kit" + "Content Posting API (sandbox/upload)" approval.
    // Once your app is approved for direct publishing, set TIKTOK_SCOPES to include video.publish.
    const scopes = Deno.env.get("TIKTOK_SCOPES") 
      || "user.info.basic,video.upload";
    
    // Build TikTok OAuth URL
    const tiktokAuthUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    tiktokAuthUrl.searchParams.set("client_key", TIKTOK_CLIENT_KEY);
    tiktokAuthUrl.searchParams.set("response_type", "code");
    tiktokAuthUrl.searchParams.set("scope", scopes);
    tiktokAuthUrl.searchParams.set("redirect_uri", `${SUPABASE_URL}/functions/v1/tiktok-oauth-callback`);
    tiktokAuthUrl.searchParams.set("state", state);

    return new Response(
      JSON.stringify({ authUrl: tiktokAuthUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("TikTok auth URL error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
