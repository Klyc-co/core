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

    // Get TikTok connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "tiktok")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "TikTok not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    // Fetch user info
    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,video_count,likes_count",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let analytics = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const userInfo = userData.data?.user;
      if (userInfo) {
        analytics = {
          followers: userInfo.follower_count || 0,
          following: userInfo.following_count || 0,
          total_posts: userInfo.video_count || 0,
          total_views: userInfo.likes_count || 0, // TikTok returns total likes, not views at user level
        };
      }
    }

    // Fetch user videos
    const videosResponse = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: Math.min(limit, 20) }), // TikTok limits to 20 per request
      }
    );

    let posts: any[] = [];
    if (videosResponse.ok) {
      const videosData = await videosResponse.json();
      
      posts = videosData.data?.videos?.map((video: any) => ({
        id: video.id,
        platform: "tiktok",
        title: video.title,
        caption: video.video_description,
        thumbnail_url: video.cover_image_url,
        media_type: "video",
        created_at: new Date(video.create_time * 1000).toISOString(),
        views: video.view_count || 0,
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        permalink: video.share_url,
      })) || [];
    } else {
      const errorText = await videosResponse.text();
      console.error("TikTok videos fetch error:", errorText);
    }

    return new Response(
      JSON.stringify({ posts, analytics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching TikTok posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
