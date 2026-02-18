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
    const canvaClientId = Deno.env.get("CANVA_CLIENT_ID");

    if (!canvaClientId) throw new Error("CANVA_CLIENT_ID is not configured");

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
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const codeChallenge = base64URLEncode(digest);

    const state = crypto.randomUUID();

    // Store the code verifier temporarily in the DB
    await supabase.from("oauth_pkce_states").insert({
      user_id: user.id,
      state,
      code_verifier: codeVerifier,
      provider: "canva",
      display_name: "Canva",
    });

    const redirectUri = `${supabaseUrl}/functions/v1/canva-oauth-callback`;

    const authUrl = new URL("https://www.canva.com/api/oauth/authorize");
    authUrl.searchParams.set("client_id", canvaClientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "asset:read design:content:read profile:read");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating Canva auth URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
