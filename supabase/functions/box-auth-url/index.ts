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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const boxClientId = Deno.env.get("BOX_CLIENT_ID");
    const boxClientSecret = Deno.env.get("BOX_CLIENT_SECRET");

    if (!boxClientId || !boxClientSecret) {
      throw new Error("Box credentials not configured. Please add BOX_CLIENT_ID and BOX_CLIENT_SECRET secrets.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from("social_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "box")
      .maybeSingle();

    if (existingConnection) {
      return new Response(
        JSON.stringify({ already_connected: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build OAuth URL
    const redirectUri = `${supabaseUrl}/functions/v1/box-oauth-callback`;
    const state = btoa(JSON.stringify({ user_id: user.id }));

    const authUrl = new URL("https://account.box.com/api/oauth2/authorize");
    authUrl.searchParams.set("client_id", boxClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating Box auth URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
