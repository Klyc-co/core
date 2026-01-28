import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

type Platform =
  | "google"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "twitter"
  | "snapchat";

function buildSearchQuery(platform: Platform, trendName: string) {
  // Goal: return URLs that are *actual post/permalink pages*.
  // We bias queries toward common permalink patterns.
  const base = `"${trendName}"`;

  switch (platform) {
    case "instagram":
      // Posts/Reels
      return `${base} site:instagram.com (reel OR p OR tv)`;
    case "facebook":
      return `${base} site:facebook.com (posts OR permalink OR reel OR videos)`;
    case "linkedin":
      return `${base} site:linkedin.com (posts OR feed/update)`;
    case "snapchat":
      return `${base} site:snapchat.com (spotlight OR discover)`;
    case "tiktok":
      return `${base} site:tiktok.com (video OR @)`;
    case "twitter":
      return `${base} site:x.com (status)`;
    case "google":
    default:
      return trendName;
  }
}

function scoreUrl(platform: Platform, url: string) {
  const u = url.toLowerCase();

  // Hard domain preferences
  const domainScore: Record<Platform, number> = {
    instagram: u.includes("instagram.com") ? 50 : -50,
    facebook: u.includes("facebook.com") ? 50 : -50,
    linkedin: u.includes("linkedin.com") ? 50 : -50,
    snapchat: u.includes("snapchat.com") ? 50 : -50,
    tiktok: u.includes("tiktok.com") ? 50 : -50,
    twitter: u.includes("x.com") || u.includes("twitter.com") ? 50 : -50,
    google: 0,
  };

  // Permalink heuristics
  const patterns: Record<Platform, RegExp[]> = {
    instagram: [/\/p\//, /\/reel\//, /\/tv\//],
    facebook: [/\/posts\//, /permalink\.php/, /\/reel\//, /\/videos\//, /\/watch\//],
    linkedin: [/\/posts\//, /\/feed\/update\//],
    snapchat: [/\/spotlight\//, /\/discover\//],
    tiktok: [/\/video\//],
    twitter: [/\/(status|statuses)\//],
    google: [],
  };

  let s = domainScore[platform] ?? 0;
  for (const re of patterns[platform] ?? []) {
    if (re.test(u)) s += 25;
  }

  // Penalize obvious non-post pages
  if (u.includes("/search") || u.includes("/explore") || u.includes("/hashtag")) s -= 10;
  if (u.includes("google.") || u.includes("duckduckgo.")) s -= 100;

  return s;
}

async function firecrawlSearch(query: string) {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not configured");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 8,
      tbs: "qdr:d",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const results: { url?: string; title?: string }[] = Array.isArray(data?.data) ? data.data : [];
  return results
    .map((r) => r.url)
    .filter((u): u is string => typeof u === "string" && u.length > 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const { trendId } = await req.json();

    if (!trendId || typeof trendId !== "string") {
      return new Response(JSON.stringify({ error: "Missing trendId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: trend, error: trendError } = await supabaseAdmin
      .from("social_trends")
      .select("id,user_id,platform,trend_name,trend_url")
      .eq("id", trendId)
      .single();

    if (trendError || !trend) {
      return new Response(JSON.stringify({ error: "Trend not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (trend.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (trend.trend_url) {
      return new Response(JSON.stringify({ url: trend.trend_url, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platform = (trend.platform || "google") as Platform;
    const query = buildSearchQuery(platform, trend.trend_name);
    const urls = await firecrawlSearch(query);

    const best = urls
      .map((url) => ({ url, score: scoreUrl(platform, url) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 10) {
      return new Response(JSON.stringify({ error: "No direct post URL found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("social_trends")
      .update({ trend_url: best.url })
      .eq("id", trendId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed updating trend_url", updateError);
      return new Response(JSON.stringify({ error: "Failed to save URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: best.url, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("resolve-trend-url error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
