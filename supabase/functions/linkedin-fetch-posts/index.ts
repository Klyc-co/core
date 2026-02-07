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

    // Get LinkedIn connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ posts: [], analytics: null, error: "LinkedIn not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    // Note: LinkedIn's API is very restrictive. Without Marketing Developer Platform access,
    // we can only get basic profile info, not posts or detailed analytics.
    
    // Fetch basic profile
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let analytics = null;
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      analytics = {
        // LinkedIn doesn't expose follower count without Marketing API
        profile_name: profileData.name,
        profile_email: profileData.email,
      };
    } else {
      const errorText = await profileResponse.text();
      console.error("LinkedIn profile fetch error:", errorText);
    }

    // LinkedIn posts require Marketing Developer Platform subscription
    // Return empty posts with explanation
    const posts: any[] = [];

    return new Response(
      JSON.stringify({ 
        posts, 
        analytics,
        notice: "LinkedIn post history requires Marketing Developer Platform access. Contact LinkedIn for access."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching LinkedIn posts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ posts: [], analytics: null, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
