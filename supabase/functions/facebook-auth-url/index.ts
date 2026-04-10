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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Use the same Meta App as Instagram
    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    console.log("Using Facebook/Meta Client ID:", clientId?.substring(0, 6) + "...");
    
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Facebook client ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;
    
    const state = JSON.stringify({
      user_id: user.id,
      timestamp: Date.now(),
    });
    const encodedState = btoa(state);

    console.log("Redirect URI:", redirectUri);

    // Request Facebook Page permissions including Reels
    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    // Scopes for Page insights and Reels
    authUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_read_user_content,read_insights,business_management");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", encodedState);
    authUrl.searchParams.set("display", "page");
    
    console.log("Full auth URL:", authUrl.toString());

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating Facebook auth URL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
