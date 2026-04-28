import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeImage, Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Instagram accepts aspect ratios between 4:5 (0.8) and 1.91:1 (1.91).
const IG_MIN_RATIO = 0.8;
const IG_MAX_RATIO = 1.91;

/**
 * Ensures the image at `imageUrl` is fetchable, JPEG/PNG, and within Instagram's
 * accepted aspect ratio range. If not, downloads, center-crops, re-uploads to
 * the public `brand-assets` bucket and returns the new public URL. Otherwise
 * returns the original URL.
 */
async function ensureInstagramCompatibleImage(
  imageUrl: string,
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ url: string; cropped: boolean; warning?: string }> {
  try {
    const headRes = await fetch(imageUrl, { method: "GET" });
    if (!headRes.ok) {
      return { url: imageUrl, cropped: false, warning: `Image URL not reachable (${headRes.status})` };
    }
    const buf = new Uint8Array(await headRes.arrayBuffer());
    const ct = headRes.headers.get("content-type") || "";

    // ImageScript supports PNG/JPEG/GIF/TIFF/BMP. Skip unknown formats.
    let img: Image;
    try {
      img = (await decodeImage(buf)) as Image;
    } catch (e) {
      console.warn("[Instagram] Could not decode image, sending original:", e);
      return { url: imageUrl, cropped: false };
    }

    const w = img.width;
    const h = img.height;
    const ratio = w / h;
    console.log(`[Instagram] Source image ${w}x${h} ratio=${ratio.toFixed(3)} ct=${ct}`);

    if (ratio >= IG_MIN_RATIO && ratio <= IG_MAX_RATIO) {
      return { url: imageUrl, cropped: false };
    }

    // Compute target crop within original
    let targetRatio: number;
    if (ratio < IG_MIN_RATIO) {
      // Too tall — crop height to 4:5
      targetRatio = IG_MIN_RATIO;
    } else {
      // Too wide — crop width to 1.91:1
      targetRatio = IG_MAX_RATIO;
    }

    let newW = w;
    let newH = h;
    if (ratio < targetRatio) {
      // need to reduce height
      newH = Math.floor(w / targetRatio);
    } else {
      // need to reduce width
      newW = Math.floor(h * targetRatio);
    }
    const xOff = Math.floor((w - newW) / 2);
    const yOff = Math.floor((h - newH) / 2);

    img.crop(xOff, yOff, newW, newH);
    const out = await img.encodeJPEG(90);

    const path = `${userId}/instagram-autocrop/${Date.now()}-${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("brand-assets")
      .upload(path, out, { contentType: "image/jpeg", upsert: false });
    if (upErr) {
      console.error("[Instagram] Re-upload failed:", upErr);
      return { url: imageUrl, cropped: false, warning: "Auto-crop failed; sent original" };
    }
    const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
    console.log(`[Instagram] Auto-cropped to ${newW}x${newH} -> ${data.publicUrl}`);
    return { url: data.publicUrl, cropped: true };
  } catch (e) {
    console.error("[Instagram] ensureInstagramCompatibleImage error:", e);
    return { url: imageUrl, cropped: false, warning: e instanceof Error ? e.message : String(e) };
  }
}

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
      let friendly = `Instagram container failed (${createRes.status})`;
      try {
        const parsed = JSON.parse(errText);
        const m = parsed?.error?.error_user_msg || parsed?.error?.message;
        if (m) friendly = `Instagram: ${m}`;
      } catch { /* ignore */ }
      return { success: false, error: friendly };
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

async function postToTwitter(accessToken: string, accessTokenSecret: string, content: string): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  const { createHmac } = await import("node:crypto");

  const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
  const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
  const ACCESS_TOKEN = accessToken;
  const ACCESS_TOKEN_SECRET = accessTokenSecret;

  if (!API_KEY || !API_SECRET) {
    return { success: false, error: "Twitter app credentials not configured. Add TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET to edge function secrets." };
  }

  if (!content?.trim()) {
    return { success: false, error: "No text content to tweet" };
  }

  // X has 280 char limit
  const tweetText = content.length > 280 ? content.substring(0, 277) + "..." : content;

  const url = "https://api.x.com/2/tweets";
  const method = "POST";

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  // CRITICAL: Do NOT include POST body params in signature for Twitter API v2 JSON requests
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_TOKEN_SECRET)}`;
  const signature = createHmac("sha1", signingKey).update(signatureBaseString).digest("base64");

  const authHeader = "OAuth " + Object.entries({ ...oauthParams, oauth_signature: signature })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText }),
    });

    const data = await res.json();
    console.log("[Twitter] Response:", res.status, JSON.stringify(data));

    if (!res.ok) {
      const errMsg = data?.detail || data?.title || JSON.stringify(data);
      return { success: false, error: `Twitter API error (${res.status}): ${errMsg}` };
    }

    const postId = data?.data?.id;
    return {
      success: true,
      post_id: postId,
      permalink: postId ? `https://x.com/i/status/${postId}` : undefined,
    };
  } catch (error: unknown) {
    console.error("[Twitter] Publish error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown Twitter error" };
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

async function postToTikTok(
  accessToken: string,
  content: string,
  videoUrl?: string,
): Promise<{ success: boolean; post_id?: string; permalink?: string; error?: string }> {
  try {
    if (!videoUrl) {
      return { success: false, error: "TikTok requires a public video URL. Image- and text-only posts are not supported." };
    }

    // Try DIRECT POST first (requires video.publish scope, app must be approved).
    // Falls back to INBOX (drafts) which only needs video.upload.
    const caption = (content || "").slice(0, 2200);

    const directInitRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "SELF_ONLY", // safest default; users can change in TikTok app. PUBLIC_TO_EVERYONE requires audited app.
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    });

    let publishId: string | undefined;
    let usedDirect = false;

    if (directInitRes.ok) {
      const directData = await directInitRes.json();
      publishId = directData?.data?.publish_id;
      usedDirect = true;
      console.log("[TikTok] Direct publish init OK, publish_id:", publishId);
    } else {
      const directErr = await directInitRes.text();
      console.warn("[TikTok] Direct publish init failed, falling back to inbox:", directInitRes.status, directErr);

      // Fallback: upload to user's inbox as a draft.
      const inboxRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
          },
        }),
      });

      if (!inboxRes.ok) {
        const inboxErr = await inboxRes.text();
        console.error("[TikTok] Inbox init failed:", inboxRes.status, inboxErr);
        return {
          success: false,
          error: `TikTok upload failed (${inboxRes.status}): ${inboxErr}. Make sure your TikTok app has 'video.upload' or 'video.publish' approved and the video URL is publicly accessible.`,
        };
      }

      const inboxData = await inboxRes.json();
      publishId = inboxData?.data?.publish_id;
      console.log("[TikTok] Inbox upload init OK, publish_id:", publishId);
    }

    if (!publishId) {
      return { success: false, error: "TikTok did not return a publish_id" };
    }

    // Poll status (up to ~60s). TikTok pulls the video asynchronously.
    let finalStatus = "PROCESSING";
    let lastError: string | undefined;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      });
      if (!statusRes.ok) continue;
      const statusData = await statusRes.json();
      const s = statusData?.data?.status;
      lastError = statusData?.data?.fail_reason || statusData?.error?.message;
      if (s === "PUBLISH_COMPLETE" || s === "SEND_TO_USER_INBOX") {
        finalStatus = s;
        break;
      }
      if (s === "FAILED") {
        return { success: false, error: `TikTok publish failed: ${lastError || "unknown reason"}` };
      }
    }

    const note = usedDirect && finalStatus === "PUBLISH_COMPLETE"
      ? "Published to TikTok."
      : finalStatus === "SEND_TO_USER_INBOX"
      ? "Sent to your TikTok drafts inbox — open the TikTok app to review and publish."
      : "TikTok is still processing the video. It will appear once processing completes.";

    console.log("[TikTok] Final status:", finalStatus, "-", note);
    return {
      success: true,
      post_id: publishId,
      permalink: undefined, // TikTok doesn't return a permalink until the user finalizes/publishes
    };
  } catch (err) {
    console.error("[TikTok] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown TikTok error" };
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

    // Instagram, Facebook, and TikTok tokens live in `social_connections` (OAuth callbacks store them there).
    // Other platforms use `client_platform_connections`.
    let accessToken: string | null = null;
    let igUserId: string | null = null;
    let fbPageId: string | null = null;
    let twitterTokenSecret: string | null = null;

    if (platformLower === "instagram" || platformLower === "facebook" || platformLower === "tiktok") {
      const { data: socialConn } = await serviceClient
        .from("social_connections")
        .select("access_token, platform_user_id")
        .eq("user_id", userId)
        .eq("platform", platformLower)
        .maybeSingle();

      if (socialConn) {
        accessToken = await decryptToken(socialConn.access_token);
        if (platformLower === "instagram") igUserId = socialConn.platform_user_id;
        else if (platformLower === "facebook") fbPageId = socialConn.platform_user_id;
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
            JSON.stringify({ success: false, error: "No active Facebook Page connection. Please reconnect Instagram/Facebook in Settings to grant page publishing permission." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const savedToken = await decryptToken(igConn.access_token);

        const accountsRes = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${savedToken}`
        );

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const firstPage = accountsData?.data?.[0];

          if (!firstPage?.id || !firstPage?.access_token) {
            console.error("[Facebook] No managed pages found:", JSON.stringify(accountsData));
            return new Response(
              JSON.stringify({ success: false, error: "No Facebook Pages found on your account. Make sure your account manages a Page and reconnect to grant page publishing permissions." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          accessToken = firstPage.access_token;
          fbPageId = firstPage.id;
          console.log("[Facebook] Resolved page from /me/accounts:", fbPageId, firstPage.name);
        } else {
          const accountsError = await accountsRes.text();
          console.error("[Facebook] /me/accounts lookup failed:", accountsRes.status, accountsError);

          const meRes = await fetch(
            `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${savedToken}`
          );

          if (!meRes.ok) {
            const meError = await meRes.text();
            console.error("[Facebook] /me lookup failed:", meRes.status, meError);
            return new Response(
              JSON.stringify({ success: false, error: "Couldn't resolve your Facebook Page. Please reconnect Instagram/Facebook in Settings and grant page publishing permissions." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const meData = await meRes.json();
          if (!meData?.id) {
            console.error("[Facebook] Missing page id from /me response:", JSON.stringify(meData));
            return new Response(
              JSON.stringify({ success: false, error: "Couldn't determine which Facebook Page to publish to. Please reconnect Instagram/Facebook." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          accessToken = savedToken;
          fbPageId = meData.id;
          console.log("[Facebook] Resolved page directly from /me using stored page token:", fbPageId, meData.name);
        }
      } else if (platformLower === "tiktok") {
        return new Response(
          JSON.stringify({ success: false, error: "No active TikTok connection. Please connect your TikTok account first." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "No active Instagram connection. Please connect your Instagram Business account first." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (platformLower === "twitter") {
      // Twitter uses per-user OAuth 1.0a tokens; consumer key/secret stay as app env vars
      const { data: socialConn } = await serviceClient
        .from("social_connections")
        .select("access_token, refresh_token")
        .eq("user_id", userId)
        .eq("platform", "twitter")
        .maybeSingle();

      if (!socialConn) {
        return new Response(
          JSON.stringify({ success: false, error: "No active Twitter connection. Please reconnect your Twitter account." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = await decryptToken(socialConn.access_token);
      twitterTokenSecret = await decryptToken(socialConn.refresh_token);
    } else if (platformLower === "youtube" || platformLower === "pinterest") {
      // Mock-only platforms — no OAuth token required; posting is handled as mock below
    } else {
      // linkedin, threads, snapchat, and any other OAuth platforms → social_connections
      const { data: socialConn } = await serviceClient
        .from("social_connections")
        .select("access_token, platform_user_id")
        .eq("user_id", userId)
        .eq("platform", platformLower)
        .maybeSingle();

      if (!socialConn) {
        return new Response(
          JSON.stringify({ success: false, error: `No active ${platform} connection. Please reconnect your account first.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = await decryptToken(socialConn.access_token);
    }

    let result: { success: boolean; post_id?: string; permalink?: string; error?: string };

    if (platformLower === "linkedin") {
      result = await postToLinkedIn(accessToken!, content);
    } else if (platformLower === "threads") {
      result = await postToThreads(accessToken!, content);
    } else if (platformLower === "twitter") {
      result = await postToTwitter(accessToken!, twitterTokenSecret!, content);
    } else if (platformLower === "instagram") {
      if (!igUserId) {
        result = { success: false, error: "Instagram account ID missing. Please reconnect Instagram." };
      } else {
        let igImageUrl: string | null = image_url;
        if (igImageUrl && !video_url) {
          const processed = await ensureInstagramCompatibleImage(igImageUrl, serviceClient, userId);
          igImageUrl = processed.url;
          if (processed.warning) console.warn("[Instagram] preprocess warning:", processed.warning);
        }
        result = await postToInstagram(accessToken!, igUserId, content, igImageUrl || undefined, video_url || undefined);
      }
    } else if (platformLower === "facebook") {
      if (!fbPageId) {
        result = { success: false, error: "Facebook Page ID missing. Please reconnect Instagram/Facebook." };
      } else {
        result = await postToFacebook(accessToken!, fbPageId, content, image_url, video_url);
      }
    } else if (platformLower === "tiktok") {
      result = await postToTikTok(accessToken!, content, video_url);
    } else {
      // Other platforms (youtube, pinterest, snapchat) remain mock
      console.log(`[post-to-platform] Mock post to ${platform} by user ${userId}`);
      result = { success: true, post_id: crypto.randomUUID() };
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
