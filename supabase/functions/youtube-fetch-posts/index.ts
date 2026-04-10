import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshYouTubeToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Missing credentials for token refresh");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Token refresh failed:", error);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    };
  } catch (error: unknown) {
    console.error("Token refresh error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    let accessToken = await decryptToken(connection.access_token);
    
    // Check if token is expired and refresh if needed
    const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const isExpired = tokenExpiry && tokenExpiry < new Date();
    
    if (isExpired && connection.refresh_token) {
      console.log("Token expired, attempting refresh...");
      const refreshTokenDecrypted = await decryptToken(connection.refresh_token);
      const refreshResult = await refreshYouTubeToken(refreshTokenDecrypted);
      
      if (refreshResult) {
        accessToken = refreshResult.accessToken;
        
        // Update token in database using service role
        const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
        const encryptedToken = await encryptToken(refreshResult.accessToken);
        const newExpiry = new Date(Date.now() + refreshResult.expiresIn * 1000).toISOString();
        
        await serviceSupabase
          .from("social_connections")
          .update({
            access_token: encryptedToken,
            token_expires_at: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
          
        console.log("Token refreshed successfully");
      } else {
        return new Response(
          JSON.stringify({ posts: [], analytics: null, error: "Token expired. Please reconnect YouTube." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch user's channel
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!channelResponse.ok) {
      const errorData = await channelResponse.json();
      console.error("YouTube channel fetch error:", JSON.stringify(errorData));
      
      // If 401, the token may have just expired - try refresh
      if (channelResponse.status === 401 && connection.refresh_token) {
        const refreshTokenDecrypted = await decryptToken(connection.refresh_token);
        const refreshResult = await refreshYouTubeToken(refreshTokenDecrypted);
        
        if (refreshResult) {
          // Retry with new token
          const retryResponse = await fetch(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
            {
              headers: { Authorization: `Bearer ${refreshResult.accessToken}` },
            }
          );
          
          if (retryResponse.ok) {
            // Update stored token
            const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
            const encryptedToken = await encryptToken(refreshResult.accessToken);
            const newExpiry = new Date(Date.now() + refreshResult.expiresIn * 1000).toISOString();
            
            await serviceSupabase
              .from("social_connections")
              .update({
                access_token: encryptedToken,
                token_expires_at: newExpiry,
                updated_at: new Date().toISOString(),
              })
              .eq("id", connection.id);
              
            // Continue with the retry response
            const channelData = await retryResponse.json();
            const channel = channelData.items?.[0];
            
            if (channel) {
              // Process channel data (same logic as below)
              return await processChannelData(channel, refreshResult.accessToken, limit, corsHeaders);
            }
          }
        }
        
        return new Response(
          JSON.stringify({ posts: [], analytics: null, error: "YouTube token expired. Please reconnect." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
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
    
    return await processChannelData(channel, accessToken, limit, corsHeaders);
  } catch (error: unknown) {
    console.error("Error fetching YouTube posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to process channel data
async function processChannelData(
  channel: any,
  accessToken: string,
  limit: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
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
}
