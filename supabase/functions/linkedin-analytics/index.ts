import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching LinkedIn analytics for user:", user.id);

    // Get LinkedIn connection from database
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connection, error: connError } = await adminSupabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "LinkedIn not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt the access token
    const accessToken = await decryptToken(connection.access_token);

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "LinkedIn token expired. Please reconnect." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile from LinkedIn OpenID Connect userinfo endpoint
    console.log("Fetching LinkedIn profile...");
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("LinkedIn API error:", profileResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Failed to fetch LinkedIn data",
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileData = await profileResponse.json();
    console.log("LinkedIn profile data:", JSON.stringify(profileData));

    // Build analytics response
    // Note: LinkedIn's OpenID Connect only provides basic profile info
    // More detailed analytics require additional API products/permissions
    const analytics = {
      profile: {
        id: profileData.sub,
        name: profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim(),
        firstName: profileData.given_name,
        lastName: profileData.family_name,
        email: profileData.email,
        emailVerified: profileData.email_verified,
        picture: profileData.picture,
        locale: profileData.locale,
      },
      connectionInfo: {
        connectedAt: connection.created_at,
        lastUpdated: connection.updated_at,
        platform_user_id: connection.platform_user_id,
        platform_username: connection.platform_username,
      },
      // Note: Additional analytics would require Marketing API access
      note: "For detailed analytics (posts, engagement, company page metrics), LinkedIn Marketing API access is required, which needs a LinkedIn Marketing Developer Platform subscription.",
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("LinkedIn analytics error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
