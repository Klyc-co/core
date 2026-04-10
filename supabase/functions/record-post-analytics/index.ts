import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      post_queue_id,
      platform,
      views = 0,
      likes = 0,
      comments = 0,
      shares = 0,
      saves = 0,
      clicks = 0,
      impressions = 0,
      reach = 0,
      engagement_rate = 0,
      raw_metrics = null,
      platform_post_id = null,
    } = body;

    if (!post_queue_id || !platform) {
      return new Response(JSON.stringify({ error: "Missing post_queue_id or platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to INSERT into post_analytics (RLS restricts client inserts)
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Verify the post_queue entry exists and belongs to the user
    const { data: post, error: postError } = await serviceClient
      .from("post_queue")
      .select("id, user_id")
      .eq("id", post_queue_id)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (post.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized for this post" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await serviceClient
      .from("post_analytics")
      .insert({
        post_queue_id,
        platform,
        views,
        likes,
        comments,
        shares,
        saves,
        clicks,
        impressions,
        reach,
        engagement_rate,
        raw_metrics,
        platform_post_id,
        fetched_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert analytics:", insertError.message);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("record-post-analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
