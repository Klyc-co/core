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

    // Get Facebook connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "Facebook not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    // First, get the user's pages (Facebook requires page access for post management)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );

    let posts: any[] = [];
    let analytics = null;

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      const pages = pagesData.data || [];

      if (pages.length > 0) {
        // Get posts from the first page
        const page = pages[0];
        const pageAccessToken = page.access_token;
        const pageId = page.id;

        // Fetch page insights for analytics
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=followers_count,fan_count&access_token=${pageAccessToken}`
        );

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          analytics = {
            followers: insightsData.followers_count || insightsData.fan_count || 0,
          };
        }

        // Fetch page posts
        const postsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)&limit=${limit}&access_token=${pageAccessToken}`
        );

        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          
          posts = postsData.data?.map((post: any) => ({
            id: post.id,
            platform: "facebook",
            caption: post.message,
            thumbnail_url: post.full_picture,
            media_url: post.full_picture,
            media_type: post.full_picture ? "image" : "text",
            created_at: post.created_time,
            likes: post.reactions?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0,
            permalink: post.permalink_url,
          })) || [];
        } else {
          const errorText = await postsResponse.text();
          console.error("Facebook posts fetch error:", errorText);
        }
      }
    } else {
      // If no pages, try to get user's own feed (limited access)
      const feedResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/feed?fields=id,message,created_time,full_picture,permalink_url&limit=${limit}&access_token=${accessToken}`
      );

      if (feedResponse.ok) {
        const feedData = await feedResponse.json();
        
        posts = feedData.data?.map((post: any) => ({
          id: post.id,
          platform: "facebook",
          caption: post.message,
          thumbnail_url: post.full_picture,
          media_url: post.full_picture,
          media_type: post.full_picture ? "image" : "text",
          created_at: post.created_time,
          permalink: post.permalink_url,
        })) || [];
      }
    }

    return new Response(
      JSON.stringify({ posts, analytics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching Facebook posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
