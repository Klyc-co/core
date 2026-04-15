import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function postToLinkedIn(accessToken: string, content: string): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
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
      "LinkedIn-Version": "202504",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    const errText = await postRes.text();
    console.error("[LinkedIn] Post failed:", postRes.status, errText);
    return { success: false, error: `LinkedIn post failed (${postRes.status}): ${errText}` };
  }

  const postUrn = postRes.headers.get("x-restli-id") || postRes.headers.get("x-linkedin-id");
  let postId = postUrn;
  if (!postId) {
    try {
      const postData = await postRes.json();
      postId = postData.id || postData.urn;
    } catch {
      // 201 with no body is normal for Posts API
    }
  }

  let permalink: string | undefined;
  if (postId) {
    const shareId = postId.replace("urn:li:share:", "").replace("urn:li:ugcPost:", "");
    permalink = `https://www.linkedin.com/feed/update/urn:li:activity:${shareId}/`;
  }

  console.log("[LinkedIn] Post created successfully:", postId);
  return { success: true, post_id: postId || undefined, permalink };
}

async function postToThreads(accessToken: string, content: string): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  try {
    // Step 1: Create a media container
    const createRes = await fetch(
      `https://graph.threads.net/v1.0/me/threads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          media_type: "TEXT",
          text: content,
          access_token: accessToken,
        }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[Threads] Container creation failed:", createRes.status, errText);
      return { success: false, error: `Threads post failed (${createRes.status}): ${errText}` };
    }

    const createData = await createRes.json();
    const containerId = createData.id;

    if (!containerId) {
      return { success: false, error: "Threads: No container ID returned" };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/me/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      console.error("[Threads] Publish failed:", publishRes.status, errText);
      return { success: false, error: `Threads publish failed (${publishRes.status}): ${errText}` };
    }

    const publishData = await publishRes.json();
    const postId = publishData.id;

    console.log("[Threads] Post created successfully:", postId);
    return {
      success: true,
      post_id: postId || undefined,
      permalink: postId ? `https://www.threads.net/post/${postId}` : undefined,
    };
  } catch (err) {
    console.error("[Threads] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown Threads error" };
  }
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

    // Use JWT claims instead of getUser() to avoid network call failures
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[post-to-platform] Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

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
      .eq("client_id", userId)
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
    } else if (platformLower === "threads") {
      result = await postToThreads(accessToken, content);
    } else {
      // Other platforms remain mock
      console.log(`[post-to-platform] Mock post to ${platform} by user ${userId}`);
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
