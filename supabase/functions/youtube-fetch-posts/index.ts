import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Get YouTube connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "youtube")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "YouTube not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    // Fetch user's channel
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error("YouTube channel fetch error:", errorText);
      throw new Error("Failed to fetch YouTube channel");
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "No YouTube channel found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get uploads playlist ID
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // Fetch videos from uploads playlist
    let posts: any[] = [];
    if (uploadsPlaylistId) {
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${limit}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        const videoIds = videosData.items?.map((item: any) => item.contentDetails.videoId).join(",");

        // Get video statistics
        if (videoIds) {
          const statsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            posts = statsData.items?.map((video: any) => ({
              id: video.id,
              platform: "youtube",
              title: video.snippet.title,
              caption: video.snippet.description?.slice(0, 200),
              thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
              media_type: "video",
              created_at: video.snippet.publishedAt,
              views: parseInt(video.statistics?.viewCount || "0"),
              likes: parseInt(video.statistics?.likeCount || "0"),
              comments: parseInt(video.statistics?.commentCount || "0"),
              permalink: `https://www.youtube.com/watch?v=${video.id}`,
            })) || [];
          }
        }
      }
    }

    // Build analytics
    const analytics = {
      followers: parseInt(channel.statistics?.subscriberCount || "0"),
      total_posts: parseInt(channel.statistics?.videoCount || "0"),
      total_views: parseInt(channel.statistics?.viewCount || "0"),
    };

    return new Response(
      JSON.stringify({ posts, analytics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching YouTube posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
