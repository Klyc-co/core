import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    saved?: number;
    shares?: number;
  };
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Get Instagram connection using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("social_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "Instagram not connected", connected: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the access token
    const accessToken = await decryptToken(connection.access_token);
    const instagramAccountId = connection.platform_user_id;

    if (!instagramAccountId) {
      return new Response(
        JSON.stringify({ error: "Instagram account ID not found. Please reconnect your account.", needsReconnect: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Instagram Business Account profile
    const profileResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
    );

    let profile = null;
    if (profileResponse.ok) {
      profile = await profileResponse.json();
      console.log("Profile fetched:", profile.username);
    } else {
      const errorData = await profileResponse.json();
      console.error("Instagram profile API error:", errorData);
      
      // Check if token expired
      if (errorData.error?.code === 190) {
        return new Response(
          JSON.stringify({ error: "Token expired, please reconnect Instagram", needsReconnect: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch media with insights
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=20&access_token=${accessToken}`
    );

    let media: MediaItem[] = [];
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      media = mediaData.data || [];

      // Fetch insights for each media item
      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        
        // Different metrics for different media types
        let metrics = "reach,impressions";
        if (item.media_type === "VIDEO" || item.media_type === "REELS") {
          metrics = "reach,impressions,saved,shares,plays";
        } else if (item.media_type === "CAROUSEL_ALBUM") {
          metrics = "reach,impressions,saved";
        } else {
          metrics = "reach,impressions,saved";
        }

        try {
          const insightsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${item.id}/insights?metric=${metrics}&access_token=${accessToken}`
          );

          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            const insights: MediaItem["insights"] = {};
            
            for (const metric of insightsData.data || []) {
              if (metric.name === "reach") insights.reach = metric.values?.[0]?.value || 0;
              if (metric.name === "impressions") insights.impressions = metric.values?.[0]?.value || 0;
              if (metric.name === "saved") insights.saved = metric.values?.[0]?.value || 0;
              if (metric.name === "shares") insights.shares = metric.values?.[0]?.value || 0;
            }
            
            media[i].insights = insights;
          }
        } catch (insightError) {
          console.error(`Failed to fetch insights for media ${item.id}:`, insightError);
        }
      }
    } else {
      const errorData = await mediaResponse.json();
      console.error("Instagram media API error:", errorData);
    }

    // Fetch account insights (last 30 days)
    let accountInsights: Record<string, number> | null = null;
    try {
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramAccountId}/insights?metric=reach,impressions,follower_count,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60}&until=${Math.floor(Date.now() / 1000)}&access_token=${accessToken}`
      );

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        accountInsights = {};
        
        for (const metric of insightsData.data || []) {
          const values = metric.values || [];
          const total = values.reduce((sum: number, v: { value: number }) => sum + (v.value || 0), 0);
          accountInsights[metric.name] = total;
        }
      }
    } catch (insightError) {
      console.error("Failed to fetch account insights:", insightError);
    }

    // Calculate engagement rate
    const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
    const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
    const totalReach = media.reduce((sum, item) => sum + (item.insights?.reach || 0), 0);
    const engagementRate = totalReach > 0 
      ? ((totalLikes + totalComments) / totalReach * 100).toFixed(2)
      : "0.00";

    return new Response(
      JSON.stringify({
        connected: true,
        profile: {
          username: profile?.username || connection.platform_username,
          name: profile?.name,
          biography: profile?.biography,
          followers_count: profile?.followers_count,
          follows_count: profile?.follows_count,
          media_count: profile?.media_count,
          profile_picture_url: profile?.profile_picture_url,
        },
        media: media.map((item) => ({
          id: item.id,
          caption: item.caption,
          media_type: item.media_type,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          permalink: item.permalink,
          timestamp: item.timestamp,
          like_count: item.like_count,
          comments_count: item.comments_count,
          insights: item.insights,
        })),
        stats: {
          total_posts: profile?.media_count || media.length,
          followers: profile?.followers_count || 0,
          following: profile?.follows_count || 0,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_reach: totalReach,
          engagement_rate: engagementRate,
          account_insights: accountInsights,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Instagram analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
