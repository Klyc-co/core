import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, randomBytes } from "node:crypto";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWITTER_CONSUMER_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const TWITTER_CONSUMER_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
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
  oauthToken: string,
  tokenSecret: string,
  additionalParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_CONSUMER_KEY!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: oauthToken,
    oauth_version: "1.0",
    ...additionalParams,
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
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

  const url = new URL(req.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");
  const denied = url.searchParams.get("denied");

  const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://klyc.ai";

  if (denied) {
    console.log("User denied Twitter authorization");
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_error=Twitter+authorization+denied`,
      302
    );
  }

  if (!oauthToken || !oauthVerifier) {
    console.error("Missing oauth_token or oauth_verifier");
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_error=Missing+authorization+parameters`,
      302
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Retrieve the pending connection to get user_id and token secret
    const { data: pendingConnection, error: fetchError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("platform", "twitter_pending")
      .eq("access_token", oauthToken)
      .single();

    if (fetchError || !pendingConnection) {
      console.error("Failed to find pending connection:", fetchError);
      return Response.redirect(
        `${FRONTEND_URL}/campaigns/new?oauth_error=Session+expired+please+try+again`,
        302
      );
    }

    const userId = pendingConnection.user_id;
    const oauthTokenSecret = pendingConnection.refresh_token; // We stored it here temporarily

    console.log("Found pending connection for user:", userId);

    // Step 3: Exchange request token for access token
    const accessTokenUrl = "https://api.twitter.com/oauth/access_token";
    
    const oauthHeader = generateOAuthHeader(
      "POST",
      accessTokenUrl,
      oauthToken,
      oauthTokenSecret!,
      { oauth_verifier: oauthVerifier }
    );

    console.log("Exchanging token...");

    const accessTokenResponse = await fetch(accessTokenUrl, {
      method: "POST",
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `oauth_verifier=${encodeURIComponent(oauthVerifier)}`,
    });

    const accessTokenText = await accessTokenResponse.text();
    console.log("Access token response:", accessTokenText);

    if (!accessTokenResponse.ok) {
      console.error("Failed to get access token:", accessTokenText);
      throw new Error("Failed to get access token");
    }

    // Parse the access token response
    const accessParams = new URLSearchParams(accessTokenText);
    const accessToken = accessParams.get("oauth_token");
    const accessTokenSecret = accessParams.get("oauth_token_secret");
    const twitterUserId = accessParams.get("user_id");
    const screenName = accessParams.get("screen_name");

    if (!accessToken || !accessTokenSecret) {
      throw new Error("Invalid access token response");
    }

    console.log("Got access token for user:", screenName);

    // Delete the pending connection
    await supabase
      .from("social_connections")
      .delete()
      .eq("platform", "twitter_pending")
      .eq("user_id", userId);

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedAccessTokenSecret = await encryptToken(accessTokenSecret);

    // Store the final connection
    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert(
        {
          user_id: userId,
          platform: "twitter",
          access_token: encryptedAccessToken,
          refresh_token: encryptedAccessTokenSecret,
          platform_user_id: twitterUserId,
          platform_username: screenName,
          scopes: ["read", "write"],
        },
        { onConflict: "user_id,platform" }
      );

    if (upsertError) {
      console.error("Database upsert error:", upsertError);
      throw new Error("Failed to save connection");
    }

    console.log("Twitter connection saved successfully for user:", userId);

    // Redirect back to campaigns/new so the page detects oauth_success and marks twitter as connected
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_success=twitter`,
      302
    );
  } catch (err) {
    console.error("Twitter OAuth callback error:", err);
    return Response.redirect(
      `${FRONTEND_URL}/campaigns/new?oauth_error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
      302
    );
  }
});
