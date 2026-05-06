import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, randomBytes } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twitter OAuth 1.0a requires request token flow
const TWITTER_CONSUMER_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const TWITTER_CONSUMER_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
): string {
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const hmacSha1 = createHmac("sha1", signingKey);
  return hmacSha1.update(signatureBaseString).digest("base64");
}

function generateOAuthHeader(
  method: string,
  url: string,
  additionalParams: Record<string, string> = {},
  tokenSecret: string = ""
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_CONSUMER_KEY!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...additionalParams,
  };

  const allParams = { ...oauthParams };
  
  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    TWITTER_CONSUMER_SECRET!,
    tokenSecret
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) => a[0].localeCompare(b[0]));
  return "OAuth " + entries.map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ");
}

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

    if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET) {
      console.error("TWITTER_CONSUMER_KEY or TWITTER_CONSUMER_SECRET not set");
      return new Response(
        JSON.stringify({ error: "Twitter not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get request token from Twitter
    // oauth_callback goes ONLY in the Authorization header — not in the body.
    // Duplicating it in the body corrupts the OAuth 1.0a signature base string.
    const requestTokenUrl = "https://api.twitter.com/oauth/request_token";
    const callbackUrl = `${SUPABASE_URL}/functions/v1/twitter-oauth-callback`;

    const oauthHeader = generateOAuthHeader("POST", requestTokenUrl, {
      oauth_callback: callbackUrl,
    });

    console.log("Requesting token from Twitter...");
    console.log("Callback URL:", callbackUrl);

    const requestTokenResponse = await fetch(requestTokenUrl, {
      method: "POST",
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // Empty body — oauth_callback is in the Authorization header only
      body: "",
    });

    const requestTokenText = await requestTokenResponse.text();
    console.log("Request token response status:", requestTokenResponse.status);

    if (!requestTokenResponse.ok) {
      console.error("Failed to get request token:", requestTokenText);
      throw new Error(`Failed to get request token: ${requestTokenText}`);
    }

    // Parse the response
    const tokenParams = new URLSearchParams(requestTokenText);
    const oauthToken = tokenParams.get("oauth_token");
    const oauthTokenSecret = tokenParams.get("oauth_token_secret");
    const callbackConfirmed = tokenParams.get("oauth_callback_confirmed");

    if (!oauthToken || callbackConfirmed !== "true") {
      throw new Error("Invalid request token response");
    }

    // Store the token secret temporarily in DB for callback retrieval
    const state = btoa(JSON.stringify({
      user_id: userId,
      oauth_token_secret: oauthTokenSecret,
      timestamp: Date.now(),
    }));

    const { error: storeError } = await supabase
      .from("social_connections")
      .upsert({
        user_id: userId,
        platform: "twitter_pending",
        access_token: oauthToken,
        refresh_token: oauthTokenSecret,
        platform_user_id: state,
      }, { onConflict: "user_id,platform" });

    if (storeError) {
      console.error("Failed to store pending connection:", storeError);
    }

    // Step 2: Build authorization URL
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
    console.log("Generated auth URL successfully");

    return new Response(
      JSON.stringify({ authUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Twitter auth URL error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
