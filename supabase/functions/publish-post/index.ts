import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  postQueueId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if this is a service-role call (from cron/scheduler)
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;

    let userId: string;

    if (isServiceRole) {
      // Service role calls don't have a user - we'll verify ownership from the post itself
      userId = "";
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !data?.claims?.sub) {
        console.error("publish-post auth error:", claimsError);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = data.claims.sub as string;
    }

    const { postQueueId }: PublishRequest = await req.json();

    if (!postQueueId) {
      return new Response(JSON.stringify({ error: "Missing postQueueId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for fetching to bypass RLS when called from cron
    const fetchClient = isServiceRole
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    // Fetch the post from queue
    const { data: post, error: postError } = await fetchClient
      .from("post_queue")
      .select("*")
      .eq("id", postQueueId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership or client access (skip for service role)
    if (!isServiceRole && post.user_id !== userId && post.client_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch platform targets
    const { data: targets, error: targetsError } = await fetchClient
      .from("post_platform_targets")
      .select("*")
      .eq("post_queue_id", postQueueId);

    if (targetsError || !targets || targets.length === 0) {
      return new Response(JSON.stringify({ error: "No platform targets found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch social connections for the post owner
    const { data: connections, error: connError } = await fetchClient
      .from("social_connections")
      .select("*")
      .eq("user_id", post.user_id);

    if (connError) {
      console.error("Error fetching connections:", connError);
    }

    const connectionMap = new Map(
      (connections || []).map((c: { platform: string }) => [c.platform.toLowerCase(), c])
    );

    // Use service role for updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Update post status to publishing
    await supabaseAdmin
      .from("post_queue")
      .update({ status: "publishing" })
      .eq("id", postQueueId);

    const results: Array<{ platform: string; success: boolean; error?: string; postId?: string }> = [];

    // Process each platform target
    for (const target of targets) {
      const platform = target.platform.toLowerCase();
      const connection = connectionMap.get(platform);

      if (!connection) {
        results.push({
          platform: target.platform,
          success: false,
          error: "No connection found for this platform",
        });
        
        await supabaseAdmin
          .from("post_platform_targets")
          .update({ status: "failed", error_message: "No connection found" })
          .eq("id", target.id);
        
        continue;
      }

      try {
        // Platform-specific publishing logic
        let publishResult: { success: boolean; postId?: string; error?: string };

        switch (platform) {
          case "twitter":
          case "x":
            publishResult = await publishToTwitter(post, connection);
            break;
          case "facebook":
            publishResult = await publishToFacebook(post, connection);
            break;
          case "instagram":
            publishResult = await publishToInstagram(post, connection);
            break;
          case "linkedin":
            publishResult = await publishToLinkedIn(post, connection);
            break;
          case "tiktok":
            publishResult = await publishToTikTok(post, connection);
            break;
          case "youtube":
            publishResult = await publishToYouTube(post, connection);
            break;
          default:
            publishResult = { success: false, error: "Unsupported platform" };
        }

        results.push({
          platform: target.platform,
          ...publishResult,
        });

        // Update target status
        await supabaseAdmin
          .from("post_platform_targets")
          .update({
            status: publishResult.success ? "published" : "failed",
            platform_post_id: publishResult.postId,
            published_at: publishResult.success ? new Date().toISOString() : null,
            error_message: publishResult.error,
          })
          .eq("id", target.id);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({
          platform: target.platform,
          success: false,
          error: errorMessage,
        });

        await supabaseAdmin
          .from("post_platform_targets")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", target.id);
      }
    }

    // Determine overall status
    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);
    const finalStatus = allSuccess ? "published" : anySuccess ? "partial" : "failed";

    await supabaseAdmin
      .from("post_queue")
      .update({
        status: finalStatus,
        published_at: anySuccess ? new Date().toISOString() : null,
        error_message: allSuccess ? null : results.filter((r) => !r.success).map((r) => `${r.platform}: ${r.error}`).join("; "),
      })
      .eq("id", postQueueId);

    return new Response(
      JSON.stringify({
        success: anySuccess,
        status: finalStatus,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in publish-post:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Platform publishing functions (stubs - to be implemented with real API calls)

async function publishToTwitter(post: any, _connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  const { createHmac } = await import("node:crypto");

  const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
  const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
  const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
  const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
    return { success: false, error: "Twitter API credentials not configured" };
  }

  const postText = post.post_text || post.campaign_idea || "";
  if (!postText.trim()) {
    return { success: false, error: "No text content to tweet" };
  }

  console.log("Publishing to Twitter:", postText.substring(0, 50));

  const url = "https://api.x.com/2/tweets";
  const method = "POST";

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  // CRITICAL: Do NOT include POST body params in signature for Twitter API v2
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_TOKEN_SECRET)}`;
  const signature = createHmac("sha1", signingKey).update(signatureBaseString).digest("base64");

  const authHeader = "OAuth " + Object.entries({ ...oauthParams, oauth_signature: signature })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: postText }),
    });

    const data = await res.json();
    console.log("Twitter response:", JSON.stringify(data));

    if (!res.ok) {
      const errMsg = data?.detail || data?.title || JSON.stringify(data);
      return { success: false, error: `Twitter API error (${res.status}): ${errMsg}` };
    }

    return { success: true, postId: data?.data?.id };
  } catch (error: unknown) {
    console.error("Twitter publish error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown Twitter error" };
  }
}

async function publishToFacebook(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Facebook Graph API posting
  console.log("Publishing to Facebook:", post.post_text?.substring(0, 50));
  
  // TODO: Implement Facebook Graph API call
  return { success: false, error: "Facebook posting not yet implemented - copy content manually" };
}

async function publishToInstagram(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Instagram Graph API (requires business account)
  console.log("Publishing to Instagram:", post.post_text?.substring(0, 50));
  
  // TODO: Implement Instagram API call (requires media container creation)
  return { success: false, error: "Instagram posting not yet implemented - copy content manually" };
}

async function publishToLinkedIn(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  console.log("Publishing to LinkedIn:", post.post_text?.substring(0, 50));

  try {
    let accessToken = await decryptToken(connection.access_token);

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      if (!connection.refresh_token) {
        return { success: false, error: "LinkedIn token expired and no refresh token available. Please reconnect LinkedIn." };
      }

      const refreshToken = await decryptToken(connection.refresh_token);
      const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
      const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        return { success: false, error: "LinkedIn client credentials not configured" };
      }

      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("LinkedIn token refresh failed:", errText);
        return { success: false, error: "Failed to refresh LinkedIn token. Please reconnect LinkedIn." };
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    }

    // Get the LinkedIn member URN via userinfo
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error("LinkedIn profile fetch failed:", errText);
      return { success: false, error: "Failed to fetch LinkedIn profile. Please reconnect LinkedIn." };
    }

    const profileData = await profileRes.json();
    const personUrn = `urn:li:person:${profileData.sub}`;

    // Build the post payload using the new Posts API (UGC Posts API is deprecated)
    const postText = post.post_text || post.campaign_idea || "";
    const postBody: any = {
      author: personUrn,
      commentary: postText,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    // If there's an image URL, attach it as an article
    if (post.image_url) {
      postBody.content = {
        article: {
          source: post.image_url,
          title: postText.substring(0, 100) || "Shared via Klyc",
        },
      };
    }

    const publishRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Linkedin-Version": "202601",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      console.error("LinkedIn post failed:", errText);
      return { success: false, error: `LinkedIn post failed: ${publishRes.status} - ${errText}` };
    }

    const postId = publishRes.headers.get("x-restli-id") || publishRes.headers.get("x-linkedin-id") || "unknown";
    console.log("LinkedIn post published successfully:", postId);
    return { success: true, postId };
  } catch (error: unknown) {
    console.error("LinkedIn publish error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown LinkedIn error" };
  }
}

async function publishToTikTok(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  // TikTok Content Posting API
  console.log("Publishing to TikTok:", post.post_text?.substring(0, 50));
  
  // TODO: Implement TikTok API call (video upload required)
  return { success: false, error: "TikTok posting not yet implemented - copy content manually" };
}

async function publishToYouTube(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  console.log("Publishing to YouTube:", post.post_text?.substring(0, 50));

  try {
    let accessToken = await decryptToken(connection.access_token);

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      if (!connection.refresh_token) {
        return { success: false, error: "YouTube token expired and no refresh token available. Please reconnect YouTube." };
      }

      const refreshToken = await decryptToken(connection.refresh_token);
      const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
      const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        return { success: false, error: "YouTube client credentials not configured" };
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("YouTube token refresh failed:", errText);
        return { success: false, error: "Failed to refresh YouTube token. Please reconnect YouTube." };
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    }

    // YouTube requires a video file to upload. Check if we have a video URL.
    const videoUrl = post.video_url;
    if (!videoUrl) {
      return { success: false, error: "No video URL found in post. YouTube requires a video to upload." };
    }

    // Download the video content
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return { success: false, error: "Failed to download video for YouTube upload" };
    }
    const videoBlob = await videoRes.blob();

    // Step 1: Start resumable upload
    const title = post.post_text?.substring(0, 100) || "Uploaded via Klyc";
    const description = post.post_text || "";

    const metadata = {
      snippet: {
        title,
        description,
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const initiateRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoBlob.size),
          "X-Upload-Content-Type": videoBlob.type || "video/mp4",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initiateRes.ok) {
      const errText = await initiateRes.text();
      console.error("YouTube upload initiation failed:", errText);
      return { success: false, error: `YouTube upload failed: ${initiateRes.status}` };
    }

    const uploadUrl = initiateRes.headers.get("Location");
    if (!uploadUrl) {
      return { success: false, error: "YouTube did not return an upload URL" };
    }

    // Step 2: Upload the video
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": videoBlob.type || "video/mp4",
        "Content-Length": String(videoBlob.size),
      },
      body: videoBlob,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("YouTube video upload failed:", errText);
      return { success: false, error: `YouTube video upload failed: ${uploadRes.status}` };
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;

    console.log("YouTube video uploaded successfully:", videoId);
    return { success: true, postId: videoId };
  } catch (error: unknown) {
    console.error("YouTube publish error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown YouTube error" };
  }
}
