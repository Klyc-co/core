import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OAuth 1.0a signature helper using Web Crypto API
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const messageData = encoder.encode(signatureBaseString);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  // Convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");

    if (!consumerKey || !consumerSecret) {
      throw new Error("Twitter API credentials not configured");
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

    const { limit = 50 } = await req.json().catch(() => ({}));

    // Get Twitter connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "twitter")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "Twitter not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt tokens
    const accessToken = await decryptToken(connection.access_token);
    const accessTokenSecret = connection.refresh_token 
      ? await decryptToken(connection.refresh_token) 
      : "";

    // Twitter API v2 - Get user info
    const userId = connection.platform_user_id;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "Twitter user ID not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build OAuth 1.0a headers for user lookup
    const userUrl = `https://api.x.com/2/users/${userId}`;
    const userParams: Record<string, string> = {
      "user.fields": "public_metrics,profile_image_url",
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID().replace(/-/g, "");

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_token: accessToken,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: "1.0",
    };

    const allParams = { ...oauthParams, ...userParams };
    const signature = await generateOAuthSignature(
      "GET",
      userUrl,
      allParams,
      consumerSecret,
      accessTokenSecret
    );

    const authHeaderValue = `OAuth ${Object.entries({
      ...oauthParams,
      oauth_signature: signature,
    })
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")}`;

    const userResponse = await fetch(
      `${userUrl}?${new URLSearchParams(userParams)}`,
      {
        headers: { Authorization: authHeaderValue },
      }
    );

    let analytics = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const metrics = userData.data?.public_metrics;
      if (metrics) {
        analytics = {
          followers: metrics.followers_count || 0,
          following: metrics.following_count || 0,
          total_posts: metrics.tweet_count || 0,
        };
      }
    } else {
      const errorText = await userResponse.text();
      console.error("Twitter user fetch error:", errorText);
    }

    // Fetch user tweets
    const tweetsUrl = `https://api.x.com/2/users/${userId}/tweets`;
    const tweetsParams: Record<string, string> = {
      "tweet.fields": "created_at,public_metrics,entities,attachments",
      "media.fields": "url,preview_image_url,type",
      "expansions": "attachments.media_keys",
      "max_results": Math.min(limit, 100).toString(),
    };

    const tweetTimestamp = Math.floor(Date.now() / 1000).toString();
    const tweetNonce = crypto.randomUUID().replace(/-/g, "");

    const tweetOauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_token: accessToken,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: tweetTimestamp,
      oauth_nonce: tweetNonce,
      oauth_version: "1.0",
    };

    const tweetAllParams = { ...tweetOauthParams, ...tweetsParams };
    const tweetSignature = await generateOAuthSignature(
      "GET",
      tweetsUrl,
      tweetAllParams,
      consumerSecret,
      accessTokenSecret
    );

    const tweetAuthHeader = `OAuth ${Object.entries({
      ...tweetOauthParams,
      oauth_signature: tweetSignature,
    })
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")}`;

    const tweetsResponse = await fetch(
      `${tweetsUrl}?${new URLSearchParams(tweetsParams)}`,
      {
        headers: { Authorization: tweetAuthHeader },
      }
    );

    let posts: any[] = [];
    if (tweetsResponse.ok) {
      const tweetsData = await tweetsResponse.json();
      const mediaMap = new Map();
      
      // Build media lookup
      tweetsData.includes?.media?.forEach((media: any) => {
        mediaMap.set(media.media_key, media);
      });

      posts = tweetsData.data?.map((tweet: any) => {
        const mediaKey = tweet.attachments?.media_keys?.[0];
        const media = mediaKey ? mediaMap.get(mediaKey) : null;

        return {
          id: tweet.id,
          platform: "twitter",
          caption: tweet.text,
          thumbnail_url: media?.preview_image_url || media?.url,
          media_url: media?.url,
          media_type: media?.type === "video" ? "video" : media ? "image" : "text",
          created_at: tweet.created_at,
          likes: tweet.public_metrics?.like_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
          views: tweet.public_metrics?.impression_count || 0,
          permalink: `https://x.com/${connection.platform_username}/status/${tweet.id}`,
        };
      }) || [];
    } else {
      const errorText = await tweetsResponse.text();
      console.error("Twitter tweets fetch error:", errorText);
    }

    return new Response(
      JSON.stringify({ posts, analytics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching Twitter posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
