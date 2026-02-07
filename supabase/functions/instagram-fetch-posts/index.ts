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

    // Get Instagram connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "instagram")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "Instagram not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    // Fetch user profile and media
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    );

    let analytics = null;
    let userId = null;

    if (userResponse.ok) {
      const userData = await userResponse.json();
      userId = userData.id;
      analytics = {
        total_posts: userData.media_count || 0,
      };
    } else {
      const errorText = await userResponse.text();
      console.error("Instagram user fetch error:", errorText);
    }

    // Fetch media
    let posts: any[] = [];
    if (userId) {
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${accessToken}`
      );

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        
        posts = mediaData.data?.map((media: any) => ({
          id: media.id,
          platform: "instagram",
          caption: media.caption,
          thumbnail_url: media.thumbnail_url || media.media_url,
          media_url: media.media_url,
          media_type: media.media_type === "VIDEO" ? "video" : "image",
          created_at: media.timestamp,
          likes: media.like_count || 0,
          comments: media.comments_count || 0,
          permalink: media.permalink,
        })) || [];
      } else {
        const errorText = await mediaResponse.text();
        console.error("Instagram media fetch error:", errorText);
      }
    }

    return new Response(
      JSON.stringify({ posts, analytics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching Instagram posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
