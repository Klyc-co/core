import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      // Try to refresh the long-lived token
      const clientSecret = Deno.env.get("INSTAGRAM_CLIENT_SECRET");
      if (clientSecret) {
        const refreshResponse = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${connection.access_token}`,
          { method: "GET" }
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 5184000) * 1000).toISOString();
          
          await supabaseAdmin
            .from("social_connections")
            .update({
              access_token: refreshData.access_token,
              token_expires_at: newExpiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          connection.access_token = refreshData.access_token;
        } else {
          return new Response(
            JSON.stringify({ error: "Token expired, please reconnect Instagram", needsReconnect: true }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fetch user profile
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${connection.access_token}`
    );

    let profile = null;
    if (profileResponse.ok) {
      profile = await profileResponse.json();
    } else {
      const errorData = await profileResponse.json();
      console.error("Instagram profile API error:", errorData);
    }

    // Fetch user media
    const mediaResponse = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=20&access_token=${connection.access_token}`
    );

    let media: MediaItem[] = [];
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      media = mediaData.data || [];
    } else {
      const errorData = await mediaResponse.json();
      console.error("Instagram media API error:", errorData);
    }

    // Calculate basic stats
    const totalPosts = profile?.media_count || media.length;

    return new Response(
      JSON.stringify({
        connected: true,
        profile: {
          username: connection.platform_username || profile?.username,
          account_type: profile?.account_type,
          media_count: totalPosts,
        },
        media: media.map((item) => ({
          id: item.id,
          caption: item.caption,
          media_type: item.media_type,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          permalink: item.permalink,
          timestamp: item.timestamp,
        })),
        stats: {
          total_posts: totalPosts,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Instagram analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
