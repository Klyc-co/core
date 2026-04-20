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

async function postToInstagram(
  pageAccessToken: string,
  igUserId: string,
  content: string,
  imageUrl?: string,
  videoUrl?: string,
): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  try {
    if (!imageUrl && !videoUrl) {
      return { success: false, error: "Instagram requires an image_url or video_url (text-only posts are not supported by the Instagram Graph API)." };
    }

    // Step 1: Create media container
    const params = new URLSearchParams({
      caption: content,
      access_token: pageAccessToken,
    });
    if (videoUrl) {
      params.set("media_type", "REELS");
      params.set("video_url", videoUrl);
    } else if (imageUrl) {
      params.set("image_url", imageUrl);
    }

    const createRes = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      { method: "POST", body: params }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[Instagram] Container creation failed:", createRes.status, errText);
      return { success: false, error: `Instagram container failed (${createRes.status}): ${errText}` };
    }

    const createData = await createRes.json();
    const containerId = createData.id;
    if (!containerId) return { success: false, error: "Instagram: No container ID returned" };

    // Step 2: For videos/reels, poll status until FINISHED
    if (videoUrl) {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(
          `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`
        );
        if (statusRes.ok) {
          const s = await statusRes.json();
          if (s.status_code === "FINISHED") break;
          if (s.status_code === "ERROR") return { success: false, error: "Instagram video processing failed" };
        }
      }
    }

    // Step 3: Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: "POST",
        body: new URLSearchParams({ creation_id: containerId, access_token: pageAccessToken }),
      }
    );

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      console.error("[Instagram] Publish failed:", publishRes.status, errText);
      return { success: false, error: `Instagram publish failed (${publishRes.status}): ${errText}` };
    }

    const publishData = await publishRes.json();
    const postId = publishData.id;

    // Fetch permalink
    let permalink: string | undefined;
    if (postId) {
      const linkRes = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=permalink&access_token=${pageAccessToken}`
      );
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        permalink = linkData.permalink;
      }
    }

    console.log("[Instagram] Post created successfully:", postId);
    return { success: true, post_id: postId, permalink };
  } catch (err) {
    console.error("[Instagram] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown Instagram error" };
  }
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

async function postToFacebook(
  pageAccessToken: string,
  pageId: string,
  content: string,
  imageUrl?: string,
  videoUrl?: string,
): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  try {
    let endpoint: string;
    const params = new URLSearchParams({ access_token: pageAccessToken });

    if (videoUrl) {
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/videos`;
      params.set("file_url", videoUrl);
      if (content) params.set("description", content);
    } else if (imageUrl) {
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
      params.set("url", imageUrl);
      if (content) params.set("caption", content);
    } else {
      endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      params.set("message", content);
    }

    const res = await fetch(endpoint, { method: "POST", body: params });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[Facebook] Post failed:", res.status, errText);
      return { success: false, error: `Facebook post failed (${res.status}): ${errText}` };
    }

    const data = await res.json();
    // photos returns { id, post_id }; feed returns { id }; videos returns { id }
    const rawId = data.post_id || data.id;
    const postId = typeof rawId === "string" ? rawId : String(rawId);
    const permalink = postId ? `https://www.facebook.com/${postId}` : undefined;

    console.log("[Facebook] Post created successfully:", postId);
    return { success: true, post_id: postId, permalink };
  } catch (err) {
    console.error("[Facebook] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown Facebook error" };
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

    const body = await req.json();
    const { platform, content } = body;
    const image_url = body.image_url ?? body.imageUrl ?? null;
    const video_url = body.video_url ?? body.videoUrl ?? null;

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

    const platformLower = platform.toLowerCase();

    // Instagram tokens live in `social_connections` (Meta OAuth flow stores them there).
    // Other platforms use `client_platform_connections`.
    let accessToken: string | null = null;
    let igUserId: string | null = null;
    let fbPageId: string | null = null;

    if (platformLower === "instagram" || platformLower === "facebook") {
      const { data: socialConn } = await serviceClient
        .from("social_connections")
        .select("access_token, platform_user_id")
        .eq("user_id", userId)
        .eq("platform", platformLower)
        .maybeSingle();

      if (socialConn) {
        accessToken = await decryptToken(socialConn.access_token);
        if (platformLower === "instagram") igUserId = socialConn.platform_user_id;
        else fbPageId = socialConn.platform_user_id;
      } else if (platformLower === "facebook") {
        // Fallback: reuse the Instagram-linked page token to discover the FB Page ID.
        const { data: igConn } = await serviceClient
          .from("social_connections")
          .select("access_token")
          .eq("user_id", userId)
          .eq("platform", "instagram")
          .maybeSingle();

        if (!igConn) {
          return new Response(
            JSON.stringify({ error: "No active Facebook Page connection. Please reconnect Instagram/Facebook in Settings to grant page publishing permission." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const savedToken = await decryptToken(igConn.access_token);

        // The token saved during IG OAuth may be a User Access Token. To post to a Page,
        // we need to exchange it for a Page Access Token via /me/accounts.
        const accountsRes = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${savedToken}`
        );
        if (!accountsRes.ok) {
          const t = await accountsRes.text();
          console.error("[Facebook] /me/accounts lookup failed:", accountsRes.status, t);
          return new Response(
            JSON.stringify({ error: "Couldn't list your Facebook Pages. Please reconnect Instagram/Facebook in Settings and grant pages_manage_posts + pages_read_engagement." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const accountsData = await accountsRes.json();
        const firstPage = accountsData?.data?.[0];
        if (!firstPage?.id || !firstPage?.access_token) {
          console.error("[Facebook] No managed pages found:", JSON.stringify(accountsData));
          return new Response(
            JSON.stringify({ error: "No Facebook Pages found on your account. Make sure your account manages a Page and reconnect to grant page publishing permissions." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        accessToken = firstPage.access_token;
        fbPageId = firstPage.id;
        console.log("[Facebook] Resolved page from /me/accounts:", fbPageId, firstPage.name);
      } else {
        return new Response(
          JSON.stringify({ error: "No active Instagram connection. Please connect your Instagram Business account first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { data: connection } = await serviceClient
        .from("client_platform_connections")
        .select("id, status, access_token, refresh_token, token_expires_at")
        .eq("client_id", userId)
        .eq("platform", platformLower)
        .eq("status", "active")
        .maybeSingle();

      if (!connection) {
        return new Response(
          JSON.stringify({ error: `No active connection for ${platform}. Please connect your account first.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = await decryptToken(connection.access_token);
    }

    let result: { success: boolean; post_id?: string; permalink?: string; error?: string };

    if (platformLower === "linkedin") {
      result = await postToLinkedIn(accessToken!, content);
    } else if (platformLower === "threads") {
      result = await postToThreads(accessToken!, content);
    } else if (platformLower === "instagram") {
      if (!igUserId) {
        result = { success: false, error: "Instagram account ID missing. Please reconnect Instagram." };
      } else {
        result = await postToInstagram(accessToken!, igUserId, content, image_url, video_url);
      }
    } else if (platformLower === "facebook") {
      if (!fbPageId) {
        result = { success: false, error: "Facebook Page ID missing. Please reconnect Instagram/Facebook." };
      } else {
        result = await postToFacebook(accessToken!, fbPageId, content, image_url, video_url);
      }
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
