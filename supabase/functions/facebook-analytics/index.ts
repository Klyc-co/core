import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReelItem {
  id: string;
  description?: string;
  permalink_url?: string;
  created_time: string;
  video_insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Facebook connection
    const { data: connection, error: connectionError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "Facebook not connected" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the access token
    const accessToken = await decryptToken(connection.access_token);
    const pageId = connection.platform_user_id;

    console.log("Fetching analytics for Page:", pageId);

    // Fetch Page details
    const pageResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=name,fan_count,followers_count,picture&access_token=${accessToken}`
    );
    const pageData = await pageResponse.json();
    console.log("Page data:", JSON.stringify(pageData, null, 2));

    // Fetch Page insights (last 28 days)
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/insights?` +
      `metric=page_impressions,page_engaged_users,page_post_engagements,page_fans,page_views_total` +
      `&period=day&date_preset=last_28d` +
      `&access_token=${accessToken}`
    );
    const insightsData = await insightsResponse.json();
    console.log("Insights response status:", insightsResponse.status);

    // Fetch recent posts including Reels
    const postsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/posts?` +
      `fields=id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)` +
      `&limit=10&access_token=${accessToken}`
    );
    const postsData = await postsResponse.json();
    console.log("Posts count:", postsData.data?.length || 0);

    // Fetch Reels/Videos
    const videosResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/videos?` +
      `fields=id,description,permalink_url,created_time,length,video_insights{values,name}` +
      `&limit=10&access_token=${accessToken}`
    );
    const videosData = await videosResponse.json();
    console.log("Videos/Reels count:", videosData.data?.length || 0);

    // Process insights
    const processedInsights: Record<string, number> = {};
    if (insightsData.data) {
      for (const metric of insightsData.data) {
        const values = metric.values || [];
        const total = values.reduce((sum: number, v: { value: number }) => sum + (v.value || 0), 0);
        processedInsights[metric.name] = total;
      }
    }

    // Process posts
    const posts = (postsData.data || []).map((post: {
      id: string;
      message?: string;
      created_time: string;
      permalink_url?: string;
      shares?: { count: number };
      reactions?: { summary: { total_count: number } };
      comments?: { summary: { total_count: number } };
    }) => ({
      id: post.id,
      message: post.message || "",
      createdTime: post.created_time,
      permalink: post.permalink_url,
      shares: post.shares?.count || 0,
      reactions: post.reactions?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
    }));

    // Process videos/reels
    const reels = (videosData.data || []).map((video: ReelItem) => {
      const insights: Record<string, number> = {};
      if (video.video_insights?.data) {
        for (const insight of video.video_insights.data) {
          insights[insight.name] = insight.values?.[0]?.value || 0;
        }
      }
      return {
        id: video.id,
        description: video.description || "",
        permalink: video.permalink_url,
        createdTime: video.created_time,
        views: insights["total_video_views"] || 0,
        reach: insights["total_video_impressions"] || 0,
        avgWatchTime: insights["total_video_avg_time_watched"] || 0,
      };
    });

    // Calculate aggregated stats
    const totalEngagement = processedInsights["page_post_engagements"] || 0;
    const totalImpressions = processedInsights["page_impressions"] || 0;
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions * 100).toFixed(2) : "0";

    return new Response(
      JSON.stringify({
        page: {
          id: pageId,
          name: pageData.name,
          followers: pageData.followers_count || pageData.fan_count || 0,
          picture: pageData.picture?.data?.url,
        },
        insights: {
          impressions: processedInsights["page_impressions"] || 0,
          engagedUsers: processedInsights["page_engaged_users"] || 0,
          postEngagements: processedInsights["page_post_engagements"] || 0,
          pageViews: processedInsights["page_views_total"] || 0,
          fans: processedInsights["page_fans"] || 0,
        },
        stats: {
          engagementRate: parseFloat(engagementRate),
          totalPosts: posts.length,
          totalReels: reels.length,
        },
        posts,
        reels,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Facebook analytics:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
