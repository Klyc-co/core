import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const snapchatClientId = Deno.env.get("SNAPCHAT_CLIENT_ID");

    if (!snapchatClientId) throw new Error("SNAPCHAT_CLIENT_ID is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");

    // Generate PKCE code verifier and challenge
    const codeVerifier = base64URLEncode(crypto.getRandomValues(new Uint8Array(32)).buffer);
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
    const codeChallenge = base64URLEncode(digest);

    const state = crypto.randomUUID();

    // Store the code verifier in DB
    await supabase.from("oauth_pkce_states").insert({
      user_id: user.id,
      state,
      code_verifier: codeVerifier,
      provider: "snapchat",
      display_name: "Snapchat",
    });

    const redirectUri = `${supabaseUrl}/functions/v1/snapchat-oauth-callback`;

    const authUrl = new URL("https://accounts.snapchat.com/accounts/oauth2/auth");
    authUrl.searchParams.set("client_id", snapchatClientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "https://auth.snapchat.com/oauth2/api/user.display_name");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating Snapchat auth URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
