import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function postToLinkedIn(accessToken: string, content: string): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  // Get the user's LinkedIn profile URN
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

  // Use the newer Posts API (v2/posts) instead of deprecated UGC Post API
  const postBody = {
    author: personUrn,
    commentary: content,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    console.error("[LinkedIn] Post failed:", postRes.status, errText);
    return { success: false, error: `LinkedIn post failed (${postRes.status}): ${errText}` };
  }

  // The Posts API returns the post URN in the x-restli-id header
  const postUrn = postRes.headers.get("x-restli-id") || postRes.headers.get("x-linkedin-id");
  
  // Try to get post ID from response body as fallback
  let postId = postUrn;
  if (!postId) {
    try {
      const postData = await postRes.json();
      postId = postData.id || postData.urn;
    } catch {
      // 201 with no body is normal for Posts API
    }
  }

  // Build permalink from the post URN
  // Format: urn:li:share:123456 -> activity:123456
  let permalink: string | undefined;
  if (postId) {
    const shareId = postId.replace("urn:li:share:", "").replace("urn:li:ugcPost:", "");
    permalink = `https://www.linkedin.com/feed/update/urn:li:activity:${shareId}/`;
  }

  console.log("[LinkedIn] Post created successfully:", postId);
  return { success: true, post_id: postId || undefined, permalink };
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

    // Use service role to read access_token
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

    // Decrypt the stored token
    const accessToken = await decryptToken(connection.access_token);
    const platformLower = platform.toLowerCase();

    let result: { success: boolean; post_id?: string; permalink?: string; error?: string };

    if (platformLower === "linkedin") {
      result = await postToLinkedIn(accessToken, content);
    } else {
      // Other platforms remain mock
      console.log(`[post-to-platform] Mock post to ${platform} by user ${user.id}`);
      result = { success: true, post_id: crypto.randomUUID() };
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
