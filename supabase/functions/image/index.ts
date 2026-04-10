// ============================================================
// IMAGE — Asset Management Engine
// Reviews user-provided images, assesses platform suitability,
// manages reference links. Zero binary media stored.
// Only speaks KNP.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KNP_VERSION = "Ψ3";
const KNP_FIELD_SEPARATOR = "∷";
const KNP_VALUE_JOINER = "⊕";
const KNP_NULL_MARKER = "∅";

const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv",
  κw: "κw", πf: "πf", σo: "σo", δi: "δi",
} as const;

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("|");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return "Ψ" + Math.abs(h).toString(36);
}

async function logHealth(
  submindId: string,
  success: boolean,
  latencyMs: number,
  tokensIn: number | null = null,
  tokensOut: number | null = null,
): Promise<void> {
  try {
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await _sb.from("submind_health_snapshots").insert({
      submind_id: submindId,
      invocation_count: 1,
      success_count: success ? 1 : 0,
      error_count: success ? 0 : 1,
      avg_latency_ms: latencyMs,
      avg_tokens_in: tokensIn,
      avg_tokens_out: tokensOut,
      window_start: new Date().toISOString(),
    });
  } catch (_) { /* non-blocking */ }
}

// ---- Platform Sizing Specs ----

interface PlatformImageSpec {
  platform: string;
  use_case: string;
  width: number;
  height: number;
  aspect_ratio: string;
  min_resolution: number;
}

const PLATFORM_SPECS: PlatformImageSpec[] = [
  { platform: "Instagram", use_case: "feed_square", width: 1080, height: 1080, aspect_ratio: "1:1", min_resolution: 1080 },
  { platform: "Instagram", use_case: "feed_portrait", width: 1080, height: 1350, aspect_ratio: "4:5", min_resolution: 1080 },
  { platform: "Instagram", use_case: "reels_stories", width: 1080, height: 1920, aspect_ratio: "9:16", min_resolution: 1080 },
  { platform: "TikTok", use_case: "video_cover", width: 1080, height: 1920, aspect_ratio: "9:16", min_resolution: 1080 },
  { platform: "LinkedIn", use_case: "post_image", width: 1200, height: 627, aspect_ratio: "1.91:1", min_resolution: 627 },
  { platform: "Twitter", use_case: "post_image", width: 1600, height: 900, aspect_ratio: "16:9", min_resolution: 900 },
  { platform: "Facebook", use_case: "post_image", width: 1200, height: 630, aspect_ratio: "1.91:1", min_resolution: 630 },
  { platform: "YouTube", use_case: "thumbnail", width: 1280, height: 720, aspect_ratio: "16:9", min_resolution: 720 },
];

function getSpecsForPlatforms(platforms: string[]): PlatformImageSpec[] {
  const normalized = platforms.map((p) => p.toLowerCase());
  return PLATFORM_SPECS.filter((s) =>
    normalized.some((p) =>
      s.platform.toLowerCase().includes(p) ||
      p.includes(s.platform.toLowerCase()) ||
      (p === "twitter" && s.platform === "Twitter") ||
      (p === "x" && s.platform === "Twitter")
    )
  );
}

// ---- Image URL Validation ----

async function checkImageUrl(url: string): Promise<{ reachable: boolean; contentType: string | null }> {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    const contentType = response.headers.get("content-type");
    return { reachable: response.ok, contentType };
  } catch {
    return { reachable: false, contentType: null };
  }
}

// ---- Brand Consistency Scoring ----

interface BrandDimensionScores {
  color_harmony: number;
  typography: number;
  logo_placement: number;
  motif_repetition: number;
  layout_framework: number;
}

function computeBrandScore(scores: BrandDimensionScores): number {
  return Math.round((
    scores.color_harmony * 0.25 +
    scores.typography * 0.20 +
    scores.logo_placement * 0.20 +
    scores.motif_repetition * 0.15 +
    scores.layout_framework * 0.20
  ) * 100) / 100;
}

// ---- AI-Powered Image Review (Anthropic) ----

interface ImageReview {
  url: string;
  status: "accepted" | "rejected";
  rejection_reason: string | null;
  brand_alignment: string;
  brand_dimension_scores: BrandDimensionScores;
  brand_score: number;
  platform_suitability: Record<string, boolean>;
  suggestions: string[];
}

async function reviewImages(
  imageUrls: string[],
  platforms: string[],
  brief: string,
  useContext: string,
): Promise<ImageReview[]> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  const specs = getSpecsForPlatforms(platforms);
  const specsDesc = specs
    .map((s) => `${s.platform} ${s.use_case}: ${s.width}×${s.height} (${s.aspect_ratio})`)
    .join("; ");

  const defaultScores: BrandDimensionScores = { color_harmony: 0.5, typography: 0.5, logo_placement: 0.5, motif_repetition: 0.5, layout_framework: 0.5 };

  if (!apiKey) {
    return imageUrls.map((url) => ({
      url,
      status: "accepted" as const,
      rejection_reason: null,
      brand_alignment: "Unable to assess without AI — accepted by default",
      brand_dimension_scores: defaultScores,
      brand_score: computeBrandScore(defaultScores),
      platform_suitability: Object.fromEntries(platforms.map((p) => [p, true])),
      suggestions: [],
    }));
  }

  try {
    const systemPrompt = `You are a visual design direction and brand compliance reviewer. You review image assets for brand consistency and platform compliance. NEVER reference internal system names, protocols, or technical identifiers in any output.

For each image URL, assess and score brand consistency on 5 dimensions (0.0-1.0 each):
- color_harmony (weight 0.25): Match with brand palette
- typography (weight 0.20): Font consistency
- logo_placement (weight 0.20): Position, size, clear space
- motif_repetition (weight 0.15): Visual pattern consistency
- layout_framework (weight 0.20): Composition and grid

Platform requirements: ${specsDesc}

Since you cannot view actual images, score based on URL context, file patterns, and provided metadata. Be conservative — flag unknowns.

Return JSON array: [{"url":"...","status":"accepted"|"rejected","rejection_reason":null|"reason","brand_alignment":"assessment","brand_dimension_scores":{"color_harmony":0.0-1.0,"typography":0.0-1.0,"logo_placement":0.0-1.0,"motif_repetition":0.0-1.0,"layout_framework":0.0-1.0},"platform_suitability":{"platform":true/false},"suggestions":["..."]}]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Review these image URLs for a campaign:\nBrief: ${brief.slice(0, 500)}\nUse context: ${useContext}\nTarget platforms: ${platforms.join(", ")}\n\nURLs:\n${imageUrls.map((u, i) => `${i + 1}. ${u}`).join("\n")}`,
        }],
      }),
    });

    if (!response.ok) {
      return imageUrls.map((url) => ({
        url, status: "accepted" as const, rejection_reason: null,
        brand_alignment: "Review unavailable — accepted by default",
        brand_dimension_scores: defaultScores,
        brand_score: computeBrandScore(defaultScores),
        platform_suitability: Object.fromEntries(platforms.map((p) => [p, true])),
        suggestions: [],
      }));
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text;
    if (!rawContent) throw new Error("No content");

    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    const items = Array.isArray(parsed) ? parsed : parsed.reviews || parsed.results || [parsed];

    return items.map((item: any) => {
      const scores: BrandDimensionScores = item.brand_dimension_scores || defaultScores;
      return {
        ...item,
        brand_dimension_scores: scores,
        brand_score: computeBrandScore(scores),
      };
    });
  } catch {
    return imageUrls.map((url) => ({
      url, status: "accepted" as const, rejection_reason: null,
      brand_alignment: "Review unavailable — accepted by default",
      brand_dimension_scores: defaultScores,
      brand_score: computeBrandScore(defaultScores),
      platform_suitability: Object.fromEntries(platforms.map((p) => [p, true])),
      suggestions: [],
    }));
  }
}

// ---- Main Handler ----

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload = await req.json();
    const segments = payload.segments || payload;

    const imageUrlsRaw = segments[KNP.σo] || segments.σo || "";
    const platformsRaw = segments[KNP.μp] || segments.μp || KNP_NULL_MARKER;
    const brief = segments[KNP.ξb] || segments.ξb || "";
    const clientId = segments[KNP.θc] || segments.θc || null;
    const useContext = segments.zq || segments[KNP.ζq] || "HERO";

    let imageUrls: string[] = [];
    if (imageUrlsRaw.startsWith("[")) {
      try { imageUrls = JSON.parse(imageUrlsRaw); } catch { imageUrls = [imageUrlsRaw]; }
    } else {
      imageUrls = imageUrlsRaw.split(KNP_VALUE_JOINER).filter((u: string) => u && u !== KNP_NULL_MARKER);
    }

    const platforms = platformsRaw !== KNP_NULL_MARKER
      ? platformsRaw.split(KNP_VALUE_JOINER).map((p: string) => p.trim().toUpperCase()).filter(Boolean)
      : ["INSTAGRAM"];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    const reachabilityChecks = await Promise.all(imageUrls.map((url) => checkImageUrl(url)));

    const reachableUrls: string[] = [];
    const staleUrls: string[] = [];
    imageUrls.forEach((url, i) => {
      if (reachabilityChecks[i].reachable) reachableUrls.push(url);
      else staleUrls.push(url);
    });

    const reviews = await reviewImages(reachableUrls, platforms, brief, useContext);

    for (const url of staleUrls) {
      reviews.push({
        url,
        status: "rejected",
        rejection_reason: "Image URL is unreachable or returns an error. Please check the link and re-upload.",
        brand_alignment: "N/A — unreachable",
        brand_dimension_scores: { color_harmony: 0, typography: 0, logo_placement: 0, motif_repetition: 0, layout_framework: 0 },
        brand_score: 0,
        platform_suitability: {},
        suggestions: ["Re-upload the image or provide a working URL"],
      });
    }

    const specs = getSpecsForPlatforms(platforms);
    const specsMap: Record<string, PlatformImageSpec[]> = {};
    for (const s of specs) {
      if (!specsMap[s.platform]) specsMap[s.platform] = [];
      specsMap[s.platform].push(s);
    }

    let referencesStored = false;
    if (userId) {
      const inserts = reviews.map((r) => ({
        user_id: userId!,
        client_id: clientId,
        original_url: r.url,
        status: r.status,
        rejection_reason: r.rejection_reason,
        platform_specs: r.status === "accepted" ? specsMap : {},
        use_context: useContext,
        reviewed_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from("image_assets").insert(inserts);
      if (insertError) {
        console.warn("Image assets insert warning:", insertError.message);
      } else {
        referencesStored = true;
      }
    }

    const allSuggestions = reviews.flatMap((r) => r.suggestions).filter(Boolean);

    const reviewEncoded = reviews.map((r) =>
      [
        `url${KNP_FIELD_SEPARATOR}${r.url.slice(0, 200)}`,
        `status${KNP_FIELD_SEPARATOR}${r.status.toUpperCase()}`,
        r.rejection_reason ? `reason${KNP_FIELD_SEPARATOR}${r.rejection_reason}` : null,
        `alignment${KNP_FIELD_SEPARATOR}${r.brand_alignment}`,
      ].filter(Boolean).join("|")
    ).join("|||");

    const specsEncoded = specs.map((s) =>
      `${s.platform}${KNP_FIELD_SEPARATOR}${s.use_case}${KNP_FIELD_SEPARATOR}${s.width}x${s.height}${KNP_FIELD_SEPARATOR}${s.aspect_ratio}`
    ).join(KNP_VALUE_JOINER);

    const responseSegments: Record<string, string> = {
      [KNP.σo]: reviewEncoded || KNP_NULL_MARKER,
      [KNP.λv]: specsEncoded || KNP_NULL_MARKER,
    };

    if (referencesStored) responseSegments[`${KNP.θc}${KNP_FIELD_SEPARATOR}REFERENCES_STORED`] = KNP_NULL_MARKER;
    if (allSuggestions.length > 0) responseSegments[`zq${KNP_FIELD_SEPARATOR}SUGGESTIONS`] = KNP_NULL_MARKER;

    const elapsed = Date.now() - startTime;
    await logHealth("image", true, elapsed, null, null);

    return new Response(JSON.stringify({
      version: KNP_VERSION,
      submind: "image",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      reviews,
      accepted_count: reviews.filter((r) => r.status === "accepted").length,
      rejected_count: reviews.filter((r) => r.status === "rejected").length,
      stale_count: staleUrls.length,
      platform_specs: specsMap,
      references_stored: referencesStored,
      suggestions: allSuggestions,
      elapsed_ms: elapsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Image submind error:", e);
    const elapsed = Date.now() - startTime;
    await logHealth("image", false, elapsed, null, null);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: KNP_NULL_MARKER,
      [KNP.λv]: KNP_NULL_MARKER,
    };
    return new Response(JSON.stringify({
      version: KNP_VERSION,
      submind: "image",
      status: "error",
      checksum: knpChecksum(errorSegments),
      ...errorSegments,
      error: e instanceof Error ? e.message : "Unknown error",
      elapsed_ms: elapsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
