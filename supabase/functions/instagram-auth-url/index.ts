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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Instagram/Facebook App credentials (same app for Graph API)
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    console.log("Using Instagram Client ID:", clientId?.substring(0, 6) + "...");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Instagram client ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the public frontend domain so Meta can validate the redirect against App Domains.
    // The frontend page at /oauth/instagram/callback forwards code+state to the edge function.
    const redirectUri = "https://klyc.ai/oauth/instagram/callback";
    
    // Capture the originating page so we can return the user there after OAuth
    let returnPath = "/campaigns/new";
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.returnPath && typeof body.returnPath === "string" && body.returnPath.startsWith("/")) {
        returnPath = body.returnPath;
      } else if (body?.originUrl && typeof body.originUrl === "string") {
        const u = new URL(body.originUrl);
        if (u.pathname) returnPath = u.pathname + (u.search || "") + (u.hash || "");
      }
    } catch (_) { /* no body */ }

    // Create state parameter with user ID + return path
    const state = JSON.stringify({
      user_id: user.id,
      return_path: returnPath,
      timestamp: Date.now(),
    });
    const encodedState = btoa(state);

    // Try with newer API version and explicit display mode
    console.log("Redirect URI:", redirectUri);
    console.log("Client ID:", clientId);

    // Use Facebook OAuth with minimal scope for Business app testing
    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    // Request business_management for New Pages Experience / Business Suite managed pages
    authUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,instagram_basic,business_management");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", encodedState);
    authUrl.searchParams.set("display", "page");
    
    console.log("Full auth URL:", authUrl.toString());

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating Instagram auth URL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
