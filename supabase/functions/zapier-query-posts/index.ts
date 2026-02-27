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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { user_id, client_id, days_back = 30, statuses } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_back);

    // Build query
    let query = supabase
      .from("post_queue")
      .select("id, user_id, client_id, campaign_draft_id, content_type, post_text, image_url, video_url, media_urls, status, scheduled_at, published_at, created_at, post_platform_targets(platform, status, platform_post_id, published_at)")
      .eq("user_id", user_id)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false });

    // Optional client filter
    if (client_id) {
      query = query.eq("client_id", client_id);
    }

    // Optional status filter
    if (statuses && Array.isArray(statuses) && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Error querying post_queue:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count posts per platform
    const platforms = ["tiktok", "instagram", "twitter", "linkedin", "facebook", "youtube"];
    const postsCountPerPlatform: Record<string, number> = {};
    platforms.forEach(p => {
      postsCountPerPlatform[p] = (posts || []).filter((post: any) =>
        post.post_platform_targets?.some((t: any) => t.platform === p)
      ).length;
    });

    // Count by status
    const statusCounts: Record<string, number> = {};
    (posts || []).forEach((post: any) => {
      statusCounts[post.status] = (statusCounts[post.status] || 0) + 1;
    });

    console.log(`Queried ${(posts || []).length} posts for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        total_posts: (posts || []).length,
        days_back,
        postsCountPerPlatform,
        statusCounts,
        posts: posts || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in zapier-query-posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
