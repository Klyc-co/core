// ============================================================
// PLATFORM — Formatting & Compliance Engine
// Transforms content into platform-ready specs. Knows technical
// requirements, best practices, and native features. Only speaks KNP.
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
  κw: "κw", πf: "πf", σo: "σo", ωs: "ωs",
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

// ---- Platform Specifications ----

interface PlatformSpec {
  name: string;
  formats: Array<{
    type: string;
    charLimit: number;
    hashtagMax: number;
    aspectRatio: string;
    notes: string;
  }>;
  features: string[];
  hashtagStrategy: string;
}

const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  INSTAGRAM: {
    name: "Instagram",
    formats: [
      { type: "feed_post", charLimit: 2200, hashtagMax: 30, aspectRatio: "1:1, 4:5, 1.91:1", notes: "First 125 chars visible before 'more'" },
      { type: "reel", charLimit: 2200, hashtagMax: 30, aspectRatio: "9:16", notes: "15-90s, first 3s critical for hook" },
      { type: "story", charLimit: 2200, hashtagMax: 10, aspectRatio: "9:16", notes: "24h ephemeral, interactive elements" },
    ],
    features: ["Collab tag", "Shopping tags", "Link in bio", "Polls", "Questions sticker", "Carousel (up to 10 slides)"],
    hashtagStrategy: "Mix of niche (10-50K), mid (50K-500K), and broad (500K+). Place in caption or first comment.",
  },
  TIKTOK: {
    name: "TikTok",
    formats: [
      { type: "video", charLimit: 2200, hashtagMax: 30, aspectRatio: "9:16", notes: "First 1-2s must hook — algorithm weights early engagement" },
    ],
    features: ["Duet", "Stitch", "Trending sound integration", "Challenge participation", "Green screen effect"],
    hashtagStrategy: "3-5 targeted hashtags. Mix trending + niche. Avoid overloading.",
  },
  LINKEDIN: {
    name: "LinkedIn",
    formats: [
      { type: "post", charLimit: 3000, hashtagMax: 5, aspectRatio: "any", notes: "First 2 lines visible before 'see more'. Hook critical." },
      { type: "article", charLimit: 125000, hashtagMax: 5, aspectRatio: "any", notes: "Long-form, SEO-indexed by Google" },
      { type: "document", charLimit: 3000, hashtagMax: 5, aspectRatio: "any", notes: "PDF carousel — high engagement format" },
    ],
    features: ["Document posts (PDFs)", "Native video", "Polls", "Newsletter", "Events", "w_member_social scope required"],
    hashtagStrategy: "3-5 hashtags optimal. Professional/industry terms. Never 30.",
  },
  TWITTER: {
    name: "Twitter/X",
    formats: [
      { type: "tweet", charLimit: 280, hashtagMax: 2, aspectRatio: "16:9", notes: "Concise. Thread for longer content." },
      { type: "thread", charLimit: 280, hashtagMax: 2, aspectRatio: "16:9", notes: "Number tweets. Hook in tweet 1. CTA in last tweet." },
    ],
    features: ["Threads", "Community posts", "Spaces promotion", "Polls", "Quote tweets"],
    hashtagStrategy: "1-2 maximum. Overuse reduces engagement on X.",
  },
  FACEBOOK: {
    name: "Facebook",
    formats: [
      { type: "post", charLimit: 63206, hashtagMax: 5, aspectRatio: "any", notes: "Short posts (< 80 chars) get more engagement" },
      { type: "reel", charLimit: 2200, hashtagMax: 30, aspectRatio: "9:16", notes: "Cross-posted from Instagram Reels" },
      { type: "story", charLimit: 2200, hashtagMax: 10, aspectRatio: "9:16", notes: "24h ephemeral" },
    ],
    features: ["Groups", "Events", "Stories", "Reels", "Live video", "Marketplace"],
    hashtagStrategy: "3-5 hashtags. Less hashtag-driven than Instagram.",
  },
  YOUTUBE: {
    name: "YouTube",
    formats: [
      { type: "video", charLimit: 5000, hashtagMax: 15, aspectRatio: "16:9", notes: "Title: 100 chars (first 60 visible). Description: 5000 chars." },
      { type: "short", charLimit: 100, hashtagMax: 5, aspectRatio: "9:16", notes: "Under 60s, vertical. #Shorts in title or description." },
      { type: "community", charLimit: 1000, hashtagMax: 5, aspectRatio: "any", notes: "Text/image/poll posts to subscribers" },
    ],
    features: ["Shorts", "Community posts", "Chapter markers", "End screens", "Cards", "Premiere", "youtube.upload scope required"],
    hashtagStrategy: "3-5 hashtags in description. First 3 appear above title.",
  },
};

// ---- Format Content for Platform ----

interface FormattedVariant {
  platform: string;
  format_type: string;
  headline: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  char_count: number;
  char_limit: number;
  within_limit: boolean;
  aspect_ratio: string;
  feature_recommendations: string[];
  compliance_flags: string[];
}

function formatForPlatform(
  content: string,
  platformKey: string,
): FormattedVariant[] {
  const spec = PLATFORM_SPECS[platformKey];
  if (!spec) return [];

  let headline = "";
  let hook = "";
  let body = content;
  let cta = "";

  const headlineMatch = content.match(/headline[∷:]\ s*(.+?)(?\ :|\ |$)/i);
  const hookMatch = content.match(/hook[∷:]\ s*(.+?)(?\ :|\ |$)/i);
  const bodyMatch = content.match(/body[∷:]\ s*(.+?)(?\ :|\ |$)/i);
  const ctaMatch = content.match(/cta[∷:]\ s*(.+?)(?\ :|\ |$)/i);

  if (headlineMatch) headline = headlineMatch[1].trim();
  if (hookMatch) hook = hookMatch[1].trim();
  if (bodyMatch) body = bodyMatch[1].trim();
  if (ctaMatch) cta = ctaMatch[1].trim();

  const results: FormattedVariant[] = [];

  for (const format of spec.formats) {
    const fullText = [headline, hook, body, cta].filter(Boolean).join(" ");
    const charCount = fullText.length;
    const withinLimit = charCount <= format.charLimit;
    const complianceFlags: string[] = [];

    if (!withinLimit) {
      complianceFlags.push(
        `Content exceeds ${spec.name} ${format.type} limit: ${charCount}/${format.charLimit} chars`
      );
    }

    const hashtags = [...fullText.matchAll(/#(\w+)/g)].map((m) => m[1]);
    if (hashtags.length > format.hashtagMax) {
      complianceFlags.push(
        `Too many hashtags for ${spec.name} ${format.type}: ${hashtags.length}/${format.hashtagMax}`
      );
    }

    if (platformKey === "LINKEDIN" && /!!+|🔥{3,}|💯{3,}/g.test(fullText)) {
      complianceFlags.push("Tone may be too informal for LinkedIn audience");
    }
    if (platformKey === "TWITTER" && charCount > 280 && format.type === "tweet") {
      complianceFlags.push("Consider converting to thread format for X/Twitter");
    }

    results.push({
      platform: spec.name,
      format_type: format.type,
      headline: headline || fullText.slice(0, 60),
      hook: hook || fullText.slice(0, 100),
      body: withinLimit ? body : body.slice(0, format.charLimit - 50) + "...",
      cta,
      hashtags: hashtags.slice(0, format.hashtagMax),
      char_count: charCount,
      char_limit: format.charLimit,
      within_limit: withinLimit,
      aspect_ratio: format.aspectRatio,
      feature_recommendations: spec.features.slice(0, 3),
      compliance_flags: complianceFlags,
    });
  }

  return results;
}

// ---- AI-Powered Cross-Platform Adaptation ----

async function adaptContent(
  content: string,
  platforms: string[],
  brief: string
): Promise<{ adapted: Record<string, string>; tokensIn: number | null; tokensOut: number | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    const result: Record<string, string> = {};
    for (const p of platforms) result[p] = content;
    return { adapted: result, tokensIn: null, tokensOut: null };
  }

  const platformDetails = platforms
    .map((p) => {
      const spec = PLATFORM_SPECS[p];
      if (!spec) return `${p}: unknown platform`;
      const primary = spec.formats[0];
      return `${spec.name}: ${primary.charLimit} char limit, ${primary.hashtagMax} hashtag max. Strategy: ${spec.hashtagStrategy}`;
    })
    .join("\n");

  try {
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
        system: `You are a social media formatting specialist. Adapt content for each platform while preserving the core message. Return JSON with platform keys and adapted content values. Restructure (don't just truncate). Keep voice consistent. NEVER reference internal system names, protocols, or technical identifiers in any output.`,
        messages: [{
          role: "user",
          content: `Original content:\n${content}\n\nBrief: ${brief}\n\nAdapt for:\n${platformDetails}\n\nReturn JSON: {"PLATFORM_KEY": "adapted content"}`,
        }],
      }),
    });

    if (!response.ok) {
      const result: Record<string, string> = {};
      for (const p of platforms) result[p] = content;
      return { adapted: result, tokensIn: null, tokensOut: null };
    }

    const data = await response.json();
    const tokensIn = data.usage?.input_tokens ?? null;
    const tokensOut = data.usage?.output_tokens ?? null;
    const rawText = data.content?.[0]?.text || "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const result: Record<string, string> = {};
      for (const p of platforms) result[p] = content;
      return { adapted: result, tokensIn, tokensOut };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    for (const p of platforms) {
      if (!parsed[p]) parsed[p] = content;
    }
    return { adapted: parsed, tokensIn, tokensOut };
  } catch {
    const result: Record<string, string> = {};
    for (const p of platforms) result[p] = content;
    return { adapted: result, tokensIn: null, tokensOut: null };
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

    const content = segments[KNP.σo] || segments.σo || "";
    const platformsRaw = segments[KNP.μp] || segments.μp || KNP_NULL_MARKER;
    const brief = segments[KNP.ξb] || segments.ξb || "";
    const clientId = segments[KNP.θc] || segments.θc || null;

    const platforms = platformsRaw !== KNP_NULL_MARKER
      ? platformsRaw.split(KNP_VALUE_JOINER).map((p: string) => p.trim().toUpperCase()).filter(Boolean)
      : ["INSTAGRAM", "LINKEDIN"];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const newPlatforms: string[] = [];
    if (clientId) {
      const { data: brainData } = await supabase
        .from("client_brain")
        .select("data")
        .eq("client_id", clientId)
        .eq("document_type", "platform_history")
        .single();

      const usedPlatforms: string[] = (brainData?.data as any)?.platforms_used || [];
      for (const p of platforms) {
        if (!usedPlatforms.includes(p.toLowerCase())) {
          newPlatforms.push(p);
        }
      }
    }

    const { adapted, tokensIn, tokensOut } = await adaptContent(content, platforms, brief);

    const allFormatted: FormattedVariant[] = [];
    const allCompliance: string[] = [];
    const allRecommendations: string[] = [];

    for (const platformKey of platforms) {
      const adaptedContent = adapted[platformKey] || content;
      const formatted = formatForPlatform(adaptedContent, platformKey);
      allFormatted.push(...formatted);

      for (const f of formatted) {
        allCompliance.push(...f.compliance_flags);
        allRecommendations.push(
          ...f.feature_recommendations.map((r) => `${f.platform}: ${r}`)
        );
      }
    }

    const formattedEncoded = allFormatted
      .map((f) =>
        [
          `platform${KNP_FIELD_SEPARATOR}${f.platform}`,
          `format${KNP_FIELD_SEPARATOR}${f.format_type}`,
          `headline${KNP_FIELD_SEPARATOR}${f.headline}`,
          `hook${KNP_FIELD_SEPARATOR}${f.hook}`,
          `body${KNP_FIELD_SEPARATOR}${f.body.slice(0, 300)}`,
          `cta${KNP_FIELD_SEPARATOR}${f.cta}`,
          `chars${KNP_FIELD_SEPARATOR}${f.char_count}/${f.char_limit}`,
          `ok${KNP_FIELD_SEPARATOR}${f.within_limit}`,
        ].join("|")
      )
      .join("|||");

    const responseSegments: Record<string, string> = {
      [KNP.σo]: formattedEncoded,
      [KNP.λv]: [...new Set(allRecommendations)].join(KNP_VALUE_JOINER) || KNP_NULL_MARKER,
      zq: allCompliance.length > 0 ? allCompliance.join(KNP_VALUE_JOINER) : KNP_NULL_MARKER,
    };

    if (newPlatforms.length > 0) {
      responseSegments[`${KNP.θc}${KNP_FIELD_SEPARATOR}NEW_PLATFORM`] =
        `${KNP_NULL_MARKER}${KNP_VALUE_JOINER}${newPlatforms.join(KNP_VALUE_JOINER)}`;
    }

    const elapsed = Date.now() - startTime;
    await logHealth("platform", true, elapsed, tokensIn, tokensOut);

    const response = {
      version: KNP_VERSION,
      submind: "platform",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      formatted_variants: allFormatted,
      new_platforms: newPlatforms,
      compliance_flags: allCompliance,
      feature_recommendations: [...new Set(allRecommendations)],
      platforms_processed: platforms,
      elapsed_ms: elapsed,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    await logHealth("platform", false, elapsed, null, null);
    console.error("Platform error:", e);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: KNP_NULL_MARKER,
      [KNP.λv]: KNP_NULL_MARKER,
      zq: "Platform formatting failed",
    };
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "platform",
        status: "error",
        checksum: knpChecksum(errorSegments),
        ...errorSegments,
        error: e instanceof Error ? e.message : "Unknown error",
        elapsed_ms: elapsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
