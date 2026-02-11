import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get LinkedIn credentials
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    if (!clientId) {
      throw new Error("LINKEDIN_CLIENT_ID not configured");
    }

    // Build the redirect URI
    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth-callback`;

    // Create state parameter with user ID
    const state = JSON.stringify({
      user_id: user.id,
      timestamp: Date.now(),
    });
    const encodedState = btoa(state);

    // LinkedIn OAuth 2.0 scopes for OpenID Connect + posting
    const scopes = ["openid", "profile", "email", "w_member_social"];

    // Build the authorization URL
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", encodedState);
    authUrl.searchParams.set("scope", scopes.join(" "));

    console.log("Generated LinkedIn auth URL for user:", user.id);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating LinkedIn auth URL:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
