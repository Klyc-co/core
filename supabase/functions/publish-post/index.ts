import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { postQueueId }: PublishRequest = await req.json();

    if (!postQueueId) {
      return new Response(JSON.stringify({ error: "Missing postQueueId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the post from queue
    const { data: post, error: postError } = await supabase
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

    // Verify ownership or client access
    if (post.user_id !== user.id && post.client_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch platform targets
    const { data: targets, error: targetsError } = await supabase
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
    const { data: connections, error: connError } = await supabase
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

      } catch (error) {
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
  } catch (error) {
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

async function publishToTwitter(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Twitter/X API v2 posting
  // Requires: TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET + user's access tokens
  console.log("Publishing to Twitter:", post.post_text?.substring(0, 50));
  
  // TODO: Implement actual Twitter API call using OAuth 1.0a
  // For now, return placeholder
  return { success: false, error: "Twitter posting not yet implemented - copy content manually" };
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
  // LinkedIn API posting
  console.log("Publishing to LinkedIn:", post.post_text?.substring(0, 50));
  
  // TODO: Implement LinkedIn API call
  return { success: false, error: "LinkedIn posting not yet implemented - copy content manually" };
}

async function publishToTikTok(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  // TikTok Content Posting API
  console.log("Publishing to TikTok:", post.post_text?.substring(0, 50));
  
  // TODO: Implement TikTok API call (video upload required)
  return { success: false, error: "TikTok posting not yet implemented - copy content manually" };
}

async function publishToYouTube(post: any, connection: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  // YouTube Data API v3
  console.log("Publishing to YouTube:", post.post_text?.substring(0, 50));
  
  // TODO: Implement YouTube API call (video upload required)
  return { success: false, error: "YouTube posting not yet implemented - copy content manually" };
}
