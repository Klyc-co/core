import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Get YouTube connection from database
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: connection, error: connError } = await adminSupabase
      .from("social_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ 
          error: "YouTube not connected",
          connected: false 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = connection.access_token;

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      console.log("Token expired, refreshing...");
      const refreshResult = await refreshYouTubeToken(connection.refresh_token);
      
      if (refreshResult.error) {
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh token. Please reconnect YouTube.",
            connected: false 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = refreshResult.access_token;
      
      // Update stored token
      await adminSupabase
        .from("social_connections")
        .update({
          access_token: refreshResult.access_token,
          token_expires_at: new Date(Date.now() + (refreshResult.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    // Fetch channel statistics
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!channelResponse.ok) {
      const errorData = await channelResponse.json();
      console.error("Channel fetch error:", errorData);
      throw new Error("Failed to fetch channel data");
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      throw new Error("No channel found");
    }

    // Get uploads playlist ID
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // Fetch recent videos
    let videos: VideoData[] = [];
    if (uploadsPlaylistId) {
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        const videoIds = playlistData.items?.map((item: any) => item.contentDetails.videoId).join(",");

        if (videoIds) {
          // Get video statistics
          const videosResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (videosResponse.ok) {
            const videosData = await videosResponse.json();
            videos = videosData.items?.map((video: any) => ({
              id: video.id,
              title: video.snippet.title,
              thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
              publishedAt: video.snippet.publishedAt,
              views: parseInt(video.statistics.viewCount || "0"),
              likes: parseInt(video.statistics.likeCount || "0"),
              comments: parseInt(video.statistics.commentCount || "0"),
              duration: formatDuration(video.contentDetails.duration),
            })) || [];
          }
        }
      }
    }

    // Calculate totals from recent videos
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
    const avgEngagement = totalViews > 0 
      ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(2)
      : "0";

    return new Response(
      JSON.stringify({
        connected: true,
        channelId: channel.id,
        channelName: channel.snippet.title,
        channelThumbnail: channel.snippet.thumbnails?.medium?.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount || "0"),
        totalVideoCount: parseInt(channel.statistics.videoCount || "0"),
        totalChannelViews: parseInt(channel.statistics.viewCount || "0"),
        lastUpdated: new Date().toISOString(),
        recentVideos: videos,
        summary: {
          recentViews: totalViews,
          recentLikes: totalLikes,
          recentComments: totalComments,
          avgEngagementRate: avgEngagement,
          videoCount: videos.length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("YouTube analytics error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to format ISO 8601 duration to readable format
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function refreshYouTubeToken(refreshToken: string) {
  const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID")!;
  const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Token refresh failed:", data);
    return { error: data.error_description || "Token refresh failed" };
  }

  return data;
}
