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

// Platform-native search/explore URLs (fallback when no direct post found)
function getPlatformFallbackUrl(platform: Platform, trendName: string): string {
  const q = encodeURIComponent(trendName);
  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/search?q=${q}`;
    case "instagram":
      // Instagram hashtag explore (remove spaces for hashtag)
      const hashtag = trendName.replace(/\s+/g, "").toLowerCase();
      return `https://www.instagram.com/explore/tags/${hashtag}/`;
    case "facebook":
      return `https://www.facebook.com/search/posts?q=${q}`;
    case "linkedin":
      return `https://www.linkedin.com/search/results/content/?keywords=${q}`;
    case "twitter":
      return `https://x.com/search?q=${q}&src=typed_query&f=top`;
    case "snapchat":
      return `https://www.snapchat.com/explore/${q}`;
    case "google":
    default:
      return `https://trends.google.com/trends/explore?q=${q}&geo=US`;
  }
}

function buildSearchQuery(platform: Platform, trendName: string) {
  // Goal: return URLs that are *actual post/permalink pages*.
  const base = `"${trendName}"`;

  switch (platform) {
    case "instagram":
      return `${base} site:instagram.com/p OR site:instagram.com/reel`;
    case "facebook":
      return `${base} site:facebook.com/*/posts OR site:facebook.com/watch`;
    case "linkedin":
      return `${base} site:linkedin.com/posts OR site:linkedin.com/feed/update`;
    case "snapchat":
      return `${base} site:snapchat.com/spotlight`;
    case "tiktok":
      return `${base} site:tiktok.com/@*/video`;
    case "twitter":
      return `${base} site:x.com/*/status`;
    case "google":
    default:
      return trendName;
  }
}

function scoreUrl(platform: Platform, url: string): number {
  const u = url.toLowerCase();

  // Must be on the correct domain
  const domainMap: Record<Platform, string[]> = {
    instagram: ["instagram.com"],
    facebook: ["facebook.com", "fb.com", "fb.watch"],
    linkedin: ["linkedin.com"],
    snapchat: ["snapchat.com"],
    tiktok: ["tiktok.com"],
    twitter: ["x.com", "twitter.com"],
    google: ["google.com", "trends.google.com"],
  };

  const domains = domainMap[platform] || [];
  const onCorrectDomain = domains.some((d) => u.includes(d));
  if (!onCorrectDomain) return -100;

  let score = 50; // Base score for being on correct domain

  // Permalink heuristics (bonus points)
  const patterns: Record<Platform, RegExp[]> = {
    instagram: [/\/p\/[A-Za-z0-9_-]+/, /\/reel\/[A-Za-z0-9_-]+/, /\/tv\/[A-Za-z0-9_-]+/],
    facebook: [/\/posts\//, /permalink\.php/, /\/reel\//, /\/videos\//, /\/watch\//],
    linkedin: [/\/posts\/[a-z0-9-]+/, /\/feed\/update\//],
    snapchat: [/\/spotlight\//, /\/discover\//],
    tiktok: [/\/@[^/]+\/video\/\d+/],
    twitter: [/\/status\/\d+/],
    google: [/\/trends\/explore/],
  };

  for (const re of patterns[platform] ?? []) {
    if (re.test(u)) {
      score += 30;
      break; // Only count once
    }
  }

  // Penalize non-post pages
  if (u.includes("/search") || u.includes("/explore/search")) score -= 20;
  if (u.includes("/login") || u.includes("/signup")) score -= 50;
  if (u.includes("help.") || u.includes("about.")) score -= 30;

  return score;
}

async function firecrawlSearch(query: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) {
    console.log("FIRECRAWL_API_KEY not configured");
    return [];
  }

  try {
    console.log("Searching Firecrawl:", query);

    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 10,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Firecrawl search failed (${res.status}):`, text.slice(0, 300));
      return [];
    }

    const data = await res.json();
    const results: { url?: string; title?: string }[] = Array.isArray(data?.data) ? data.data : [];
    
    console.log(`Firecrawl returned ${results.length} results`);
    
    return results
      .map((r) => r.url)
      .filter((u): u is string => typeof u === "string" && u.length > 0);
  } catch (error: unknown) {
    console.error("Firecrawl search error:", error);
    return [];
  }
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

    // If we already have a URL, return it
    if (trend.trend_url) {
      return new Response(JSON.stringify({ url: trend.trend_url, cached: true, type: "direct" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platform = (trend.platform || "google") as Platform;
    const query = buildSearchQuery(platform, trend.trend_name);
    const urls = await firecrawlSearch(query);

    console.log(`Scoring ${urls.length} URLs for platform ${platform}`);

    // Score and sort URLs
    const scored = urls
      .map((url) => ({ url, score: scoreUrl(platform, url) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    console.log("Top scored URLs:", scored.slice(0, 3).map(s => `${s.url} (${s.score})`));

    const best = scored[0];

    // If we found a good direct URL, save and return it
    if (best && best.score >= 50) {
      const { error: updateError } = await supabaseAdmin
        .from("social_trends")
        .update({ trend_url: best.url })
        .eq("id", trendId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Failed updating trend_url", updateError);
      }

      return new Response(JSON.stringify({ url: best.url, cached: false, type: "direct" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return platform-native search/explore URL
    const fallbackUrl = getPlatformFallbackUrl(platform, trend.trend_name);
    console.log(`No direct post found, using fallback: ${fallbackUrl}`);

    return new Response(
      JSON.stringify({ 
        url: fallbackUrl, 
        cached: false, 
        type: "search",
        message: "No direct post found. Opening platform search instead."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("resolve-trend-url error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
