import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoAnalytics {
  id: string;
  title: string;
  create_time: number;
  cover_image_url: string;
  share_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
}

interface AudienceData {
  gender_distribution: { male: number; female: number; other: number };
  age_distribution: Record<string, number>;
  top_countries: { country: string; percentage: number }[];
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

    // Get TikTok connection using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("social_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "tiktok")
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "TikTok not connected", connected: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt tokens
    let accessToken = await decryptToken(connection.access_token);
    const refreshToken = connection.refresh_token ? await decryptToken(connection.refresh_token) : null;

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      // Attempt to refresh token
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: "Token expired, please reconnect TikTok", needsReconnect: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const refreshResult = await refreshTikTokToken(refreshToken);
      if (refreshResult.error) {
        return new Response(
          JSON.stringify({ error: "Token expired, please reconnect TikTok", needsReconnect: true }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Encrypt and update stored tokens
      const encryptedAccessToken = await encryptToken(refreshResult.access_token);
      const encryptedRefreshToken = refreshResult.refresh_token 
        ? await encryptToken(refreshResult.refresh_token) 
        : connection.refresh_token;

      await supabaseAdmin
        .from("social_connections")
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: refreshResult.expires_in
            ? new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
            : null,
        })
        .eq("id", connection.id);

      accessToken = refreshResult.access_token;
    }

    // Fetch videos from TikTok
    const videosResponse = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_count: 20,
        }),
      }
    );

    const videosData = await videosResponse.json();

    if (videosData.error) {
      console.error("TikTok videos API error:", videosData);
      return new Response(
        JSON.stringify({ 
          error: (videosData.error as Error).message || "Failed to fetch videos",
          code: videosData.error.code 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videos: VideoAnalytics[] = videosData.data?.videos || [];

    // Calculate aggregate stats
    const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0);
    const totalComments = videos.reduce((sum, v) => sum + (v.comment_count || 0), 0);
    const totalShares = videos.reduce((sum, v) => sum + (v.share_count || 0), 0);
    const avgEngagementRate = videos.length > 0
      ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2)
      : "0";

    // Note: TikTok's audience demographics requires additional scopes
    // For now, return what we can access with video.list scope
    const analytics = {
      connected: true,
      platform: "tiktok",
      username: connection.platform_username,
      lastUpdated: new Date().toISOString(),
      summary: {
        totalVideos: videos.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate: `${avgEngagementRate}%`,
      },
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title || "Untitled",
        thumbnail: v.cover_image_url,
        url: v.share_url,
        views: v.view_count || 0,
        likes: v.like_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0,
        createdAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
        engagementRate: v.view_count > 0
          ? (((v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0)) / v.view_count * 100).toFixed(2) + "%"
          : "0%",
      })),
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("TikTok analytics error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshTikTokToken(refreshToken: string): Promise<any> {
  const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
  const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");

  if (!refreshToken || !TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    return { error: "Missing credentials" };
  }

  try {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    if (data.error) {
      return { error: data.error_description || data.error };
    }
    return data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Refresh failed" };
  }
}
