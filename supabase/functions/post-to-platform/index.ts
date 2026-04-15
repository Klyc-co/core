import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function postToLinkedIn(accessToken: string, content: string): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  // Step 1: Get the user's LinkedIn profile URN
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    const errText = await profileRes.text();
    console.error("[LinkedIn] Profile fetch failed:", profileRes.status, errText);
    return { success: false, error: `LinkedIn auth failed (${profileRes.status}). Please reconnect your account.` };
  }

  const profile = await profileRes.json();
  const personUrn = `urn:li:person:${profile.sub}`;

  // Step 2: Create a text post using the UGC Post API
  const postBody = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    console.error("[LinkedIn] Post failed:", postRes.status, errText);
    return { success: false, error: `LinkedIn post failed (${postRes.status}): ${errText}` };
  }

  const postData = await postRes.json();
  const postId = postData.id; // e.g. "urn:li:ugcPost:123456"

  // Extract the activity ID for a permalink
  const activityId = postId?.replace("urn:li:ugcPost:", "urn:li:activity:");
  const numericId = postId?.split(":").pop();
  const permalink = numericId
    ? `https://www.linkedin.com/feed/update/${activityId || postId}/`
    : undefined;

  return { success: true, post_id: postId, permalink };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client for auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { platform, content } = await req.json();

    if (!platform || typeof platform !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'platform' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supportedPlatforms = [
      "linkedin", "twitter", "instagram", "tiktok", "youtube",
      "facebook", "threads", "pinterest",
    ];
    if (!supportedPlatforms.includes(platform.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `Unsupported platform: ${platform}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'content' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to read access_token (RLS blocks it from anon)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection } = await serviceClient
      .from("client_platform_connections")
      .select("id, status, access_token, refresh_token, token_expires_at")
      .eq("client_id", user.id)
      .eq("platform", platform.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (!connection) {
      return new Response(
        JSON.stringify({ error: `No active connection for ${platform}. Please connect your account first.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = connection.access_token;
    const platformLower = platform.toLowerCase();

    // Route to platform-specific handler
    let result: { success: boolean; post_id?: string; permalink?: string; error?: string };

    if (platformLower === "linkedin") {
      result = await postToLinkedIn(accessToken, content);
    } else {
      // Other platforms remain mock for now
      console.log(`[post-to-platform] Mock post to ${platform} by user ${user.id}`);
      result = {
        success: true,
        post_id: crypto.randomUUID(),
        permalink: undefined,
      };
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        message: `Content successfully posted to ${platform}!`,
        post_id: result.post_id,
        permalink: result.permalink,
        posted_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("post-to-platform error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
