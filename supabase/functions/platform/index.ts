// ============================================================
// PLATFORM SUBMIND — Formatting & Compliance Engine
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

  // Parse content (may be KNP-encoded or plain text)
  let headline = "";
  let hook = "";
  let body = content;
  let cta = "";

  // Try to extract structured parts
  const headlineMatch = content.match(/headline[∷:]\s*(.+?)(?:\||$)/i);
  const hookMatch = content.match(/hook[∷:]\s*(.+?)(?:\||$)/i);
  const bodyMatch = content.match(/body[∷:]\s*(.+?)(?:\||$)/i);
  const ctaMatch = content.match(/cta[∷:]\s*(.+?)(?:\||$)/i);

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

    // Extract hashtags from content
    const hashtags = [...fullText.matchAll(/#(\w+)/g)].map((m) => m[1]);
    if (hashtags.length > format.hashtagMax) {
      complianceFlags.push(
        `Too many hashtags for ${spec.name} ${format.type}: ${hashtags.length}/${format.hashtagMax}`
      );
    }

    // Platform-specific compliance checks
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
): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    // Return raw content for each platform
    const result: Record<string, string> = {};
    for (const p of platforms) result[p] = content;
    return result;
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
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a social media formatting engine. Adapt content for each platform while preserving the core message. Return JSON with platform keys and adapted content values. Restructure (don't just truncate). Keep voice consistent.`,
          },
          {
            role: "user",
            content: `Original content:\n${content}\n\nBrief: ${brief}\n\nAdapt for:\n${platformDetails}\n\nReturn JSON: {"PLATFORM_KEY": "adapted content"}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const result: Record<string, string> = {};
      for (const p of platforms) result[p] = content;
      return result;
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    // Fill in missing platforms with original content
    for (const p of platforms) {
      if (!parsed[p]) parsed[p] = content;
    }
    return parsed;
  } catch {
    const result: Record<string, string> = {};
    for (const p of platforms) result[p] = content;
    return result;
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
      : ["INSTAGRAM", "LINKEDIN"]; // default

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Check for new platforms
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

    // 2. Adapt content for each platform via AI
    const adaptedContent = await adaptContent(content, platforms, brief);

    // 3. Format for each platform
    const allFormatted: FormattedVariant[] = [];
    const allCompliance: string[] = [];
    const allRecommendations: string[] = [];

    for (const platformKey of platforms) {
      const adapted = adaptedContent[platformKey] || content;
      const formatted = formatForPlatform(adapted, platformKey);
      allFormatted.push(...formatted);

      for (const f of formatted) {
        allCompliance.push(...f.compliance_flags);
        allRecommendations.push(
          ...f.feature_recommendations.map((r) => `${f.platform}: ${r}`)
        );
      }
    }

    // 4. Build KNP response
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

    // Set new platform flag
    if (newPlatforms.length > 0) {
      responseSegments[`${KNP.θc}${KNP_FIELD_SEPARATOR}NEW_PLATFORM`] =
        `${KNP_NULL_MARKER}${KNP_VALUE_JOINER}${newPlatforms.join(KNP_VALUE_JOINER)}`;
    }

    const elapsed = Date.now() - startTime;

    const response = {
      version: KNP_VERSION,
      submind: "platform",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      // Structured data for Orchestrator
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
    console.error("Platform submind error:", e);
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
        elapsed_ms: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
