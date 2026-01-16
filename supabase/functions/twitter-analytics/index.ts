import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

function validateEnvironmentVariables() {
  console.log("API_KEY present:", !!API_KEY, "length:", API_KEY?.length);
  console.log("API_SECRET present:", !!API_SECRET, "length:", API_SECRET?.length);
  console.log("ACCESS_TOKEN present:", !!ACCESS_TOKEN, "length:", ACCESS_TOKEN?.length);
  console.log("ACCESS_TOKEN_SECRET present:", !!ACCESS_TOKEN_SECRET, "length:", ACCESS_TOKEN_SECRET?.length);
  
  if (!API_KEY) throw new Error("Missing TWITTER_CONSUMER_KEY");
  if (!API_SECRET) throw new Error("Missing TWITTER_CONSUMER_SECRET");
  if (!ACCESS_TOKEN) throw new Error("Missing TWITTER_ACCESS_TOKEN");
  if (!ACCESS_TOKEN_SECRET) throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET");
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  return hmacSha1.update(signatureBaseString).digest("base64");
}

function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    API_SECRET!,
    ACCESS_TOKEN_SECRET!
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) => a[0].localeCompare(b[0]));
  return "OAuth " + entries.map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ");
}

const BASE_URL = "https://api.x.com/2";

async function getUser() {
  const url = `${BASE_URL}/users/me?user.fields=public_metrics,profile_image_url,description,created_at`;
  const method = "GET";
  const oauthHeader = generateOAuthHeader(method, url.split("?")[0]);
  
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch user: ${response.status} - ${text}`);
  }
  
  return response.json();
}

async function getUserTweets(userId: string) {
  const url = `${BASE_URL}/users/${userId}/tweets?max_results=10&tweet.fields=public_metrics,created_at`;
  const method = "GET";
  const oauthHeader = generateOAuthHeader(method, url.split("?")[0]);
  
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("Tweets fetch error:", text);
    return { data: [] };
  }
  
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateEnvironmentVariables();

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching Twitter/X analytics for user:", user.id);

    // Fetch user profile
    const userData = await getUser();
    console.log("Twitter user data:", JSON.stringify(userData));

    // Fetch recent tweets
    const tweetsData = await getUserTweets(userData.data.id);
    console.log("Tweets data:", JSON.stringify(tweetsData));

    const publicMetrics = userData.data.public_metrics || {};
    
    // Calculate engagement metrics from recent tweets
    let totalLikes = 0;
    let totalRetweets = 0;
    let totalReplies = 0;
    let totalImpressions = 0;
    
    const recentTweets = tweetsData.data || [];
    recentTweets.forEach((tweet: any) => {
      if (tweet.public_metrics) {
        totalLikes += tweet.public_metrics.like_count || 0;
        totalRetweets += tweet.public_metrics.retweet_count || 0;
        totalReplies += tweet.public_metrics.reply_count || 0;
        totalImpressions += tweet.public_metrics.impression_count || 0;
      }
    });

    const analytics = {
      profile: {
        id: userData.data.id,
        username: userData.data.username,
        name: userData.data.name,
        description: userData.data.description,
        profileImageUrl: userData.data.profile_image_url,
        createdAt: userData.data.created_at,
      },
      metrics: {
        followers: publicMetrics.followers_count || 0,
        following: publicMetrics.following_count || 0,
        tweetCount: publicMetrics.tweet_count || 0,
        listedCount: publicMetrics.listed_count || 0,
      },
      recentEngagement: {
        totalLikes,
        totalRetweets,
        totalReplies,
        totalImpressions,
        tweetsAnalyzed: recentTweets.length,
      },
      recentTweets: recentTweets.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics,
      })),
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Twitter analytics error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
