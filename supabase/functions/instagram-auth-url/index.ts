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

    const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`;
    
    // Create state parameter with user ID
    const state = JSON.stringify({
      user_id: user.id,
      timestamp: Date.now(),
    });
    const encodedState = btoa(state);

    // Try with newer API version and explicit display mode
    console.log("Redirect URI:", redirectUri);
    console.log("Client ID:", clientId);

    // Use Facebook OAuth with Instagram Business scopes
    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    // Request Instagram and Pages permissions for Business app
    authUrl.searchParams.set("scope", "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", encodedState);
    authUrl.searchParams.set("display", "page");
    
    console.log("Full auth URL:", authUrl.toString());

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating Instagram auth URL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
