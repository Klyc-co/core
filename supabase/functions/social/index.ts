import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Lane Lock ─────────────────────────────────────────────────────────────────
const AGENT_ID = "copy";
const AGENT_VERSION = "v3";
const PERMITTED_LANES = new Set(["copy"]);

// ── KNP ───────────────────────────────────────────────────────────────────────
const KNP_NULL = "∅";
const KNP_JOINER = "⊕";

function parseKnp(val: unknown): string {
  if (val === null || val === undefined) return KNP_NULL;
  const s = String(val).trim();
  return s === "" ? KNP_NULL : s;
}

function isNull(v: string): boolean {
  return v === KNP_NULL || v === "" || v === "null" || v === "undefined";
}

function splitJoined(v: string): string[] {
  if (isNull(v)) return [];
  return v.split(KNP_JOINER).map(s => s.trim()).filter(Boolean);
}

function parseJsonField(v: string): Record<string, unknown> | null {
  if (isNull(v)) return null;
  try { return JSON.parse(v); } catch { return null; }
}

async function logHealth(
  submindId: string, success: boolean, latencyMs: number,
  tokensIn: number | null = null, tokensOut: number | null = null,
): Promise<void> {
  try {
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await _sb.from("submind_health_snapshots").insert({
      submind_id: submindId, invocation_count: 1,
      success_count: success ? 1 : 0, error_count: success ? 0 : 1,
      avg_latency_ms: latencyMs, avg_tokens_in: tokensIn,
      avg_tokens_out: tokensOut, window_start: new Date().toISOString(),
    });
  } catch (_) { /* non-blocking */ }
}

const PLATFORM_SPECS: Record<string, {
  formats: string[]; maxChars: number; hashtagRange: [number, number];
  hookRule: string; algorithmKey: string; toneGuide: string; aspectRatios: string[];
}> = {
  tiktok: {
    formats: ["Vertical Video (9:16)", "15-60s optimal"], maxChars: 2200, hashtagRange: [4, 7],
    hookRule: "Pattern interrupt in first 1-3 seconds — visual/audio surprise",
    algorithmKey: "Completion rate > engagement; watch time is king",
    toneGuide: "Casual, authentic, trend-aware, slightly chaotic energy OK",
    aspectRatios: ["9:16"],
  },
  instagram: {
    formats: ["Reels (9:16)", "Carousel (1:1)", "Stories (9:16)"], maxChars: 2200, hashtagRange: [5, 10],
    hookRule: "Front-load key message in caption; visual hook in first frame",
    algorithmKey: "Shares and saves weighted heavily in 2026",
    toneGuide: "Visual-first, emoji OK, authentic over polished",
    aspectRatios: ["9:16", "1:1", "4:5"],
  },
  linkedin: {
    formats: ["Text post (1300 chars ideal)", "Document carousel", "Video"], maxChars: 3000, hashtagRange: [3, 5],
    hookRule: "First 2 lines visible before 'see more' — must compel click",
    algorithmKey: "Dwell time and comments weighted heavily",
    toneGuide: "Professional but not corporate; data-driven hooks",
    aspectRatios: ["1:1", "16:9"],
  },
  youtube: {
    formats: ["Shorts (9:16, <60s)", "Long-form (16:9)"], maxChars: 5000, hashtagRange: [3, 8],
    hookRule: "Thumbnail is CTR-critical; first 5s hook",
    algorithmKey: "Watch time + session time",
    toneGuide: "Educational or entertaining; strong personality",
    aspectRatios: ["9:16", "16:9"],
  },
  twitter: {
    formats: ["280 chars", "Thread-friendly", "1-2 images or short video"], maxChars: 280, hashtagRange: [1, 3],
    hookRule: "First tweet must stand alone; thread opener = strongest take",
    algorithmKey: "Replies and retweets signal quality",
    toneGuide: "Punchy, witty, provocative OK",
    aspectRatios: ["16:9", "1:1"],
  },
  facebook: {
    formats: ["Text + image", "Video", "Reels"], maxChars: 2000, hashtagRange: [2, 4],
    hookRule: "Conversational opener; question or bold statement",
    algorithmKey: "Meaningful interactions (comments, shares to Messenger)",
    toneGuide: "Conversational, community-oriented",
    aspectRatios: ["1:1", "16:9", "9:16"],
  },
};

const POSTING_WINDOWS: Record<string, { primary: string; secondary: string; timezone_note: string }> = {
  tiktok:    { primary: "7-9 PM local",           secondary: "12-2 PM local",    timezone_note: "Gen Z peaks evening; lunch break secondary" },
  instagram: { primary: "11 AM - 1 PM local",     secondary: "7-9 PM local",     timezone_note: "Lunch discovery + evening scroll" },
  linkedin:  { primary: "8-10 AM local (Tue-Thu)", secondary: "12-1 PM local",    timezone_note: "Morning commute + lunch; avoid weekends" },
  youtube:   { primary: "2-4 PM local (Thu-Sat)",  secondary: "6-9 PM local",     timezone_note: "Pre-weekend + evening viewing" },
  twitter:   { primary: "8-10 AM local",           secondary: "12-1 PM local",    timezone_note: "Morning scroll + lunch break" },
  facebook:  { primary: "1-3 PM local",            secondary: "6-8 PM local",     timezone_note: "Afternoon break + early evening" },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startTime = Date.now();

  try {
    const body = await req.json();

    // ── Health ────────────────────────────────────────────────────────────────
    if (body.action === "health") {
      return new Response(JSON.stringify({
        status: "ok", agent: AGENT_ID, version: AGENT_VERSION,
        "δi": AGENT_ID, lane: "copy", permitted_lanes: [...PERMITTED_LANES],
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Lane lock ─────────────────────────────────────────────────────────────
    const requestedLane = body.lane as string | undefined;
    if (requestedLane && !PERMITTED_LANES.has(requestedLane)) {
      return new Response(JSON.stringify({
        error: `Lane violation: [${AGENT_ID}] only serves [${[...PERMITTED_LANES].join(", ")}]. Requested: ${requestedLane}`,
        "δi": AGENT_ID, lane_requested: requestedLane, permitted_lanes: [...PERMITTED_LANES],
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Decode KNP ────────────────────────────────────────────────────────────
    const creativeRaw = parseKnp(body["θc"]);
    const platformsRaw = parseKnp(body["πf"]);
    const audienceRaw = parseKnp(body.zq ?? body["zq"]);
    const narrativeRaw = parseKnp(body["Ν"]);

    const platforms = splitJoined(platformsRaw);
    if (!platforms.length) platforms.push("tiktok", "instagram");

    let creative: Record<string, unknown> | null = parseJsonField(creativeRaw);
    if (!creative && body.creative) creative = body.creative;
    const audience = isNull(audienceRaw) ? "general" : audienceRaw;
    const narrative = parseJsonField(narrativeRaw);

    if (!creative) {
      return new Response(JSON.stringify({
        version: "Ψ3", status: "error", "σo": KNP_NULL,
        error: "Creative input (θc) is required", "δi": AGENT_ID, lane: "copy",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const platformSpecPrompts = platforms.map(p => {
      const spec = PLATFORM_SPECS[p] || PLATFORM_SPECS.instagram;
      return `### ${p.toUpperCase()}\n- Formats: ${spec.formats.join(", ")}\n- Max chars: ${spec.maxChars}\n- Hashtags: ${spec.hashtagRange[0]}-${spec.hashtagRange[1]}\n- Hook rule: ${spec.hookRule}\n- Algorithm: ${spec.algorithmKey}\n- Tone: ${spec.toneGuide}\n- Aspect ratios: ${spec.aspectRatios.join(", ")}`;
    }).join("\n\n");

    const systemPrompt = `You are a social media content adapter and platform-specific tactical mapper. Your ONLY job is copy adaptation — producing platform-native copy from a provided creative brief. You do NOT produce research, strategy scores, or imagery. Copy only.

CREATIVE INPUT:
${JSON.stringify(creative)}

AUDIENCE: ${audience}
${narrative ? `NARRATIVE CONTEXT: ${JSON.stringify(narrative)}` : ""}

PLATFORM SPECS:
${platformSpecPrompts}

For EACH platform, return a JSON object:
{
  "platform": "platform_name",
  "format_recommendation": "...",
  "adapted_headline": "...",
  "adapted_body": "...",
  "adapted_hook": "...",
  "adapted_cta": "...",
  "hashtags": ["..."],
  "platform_notes": "...",
  "algorithm_tip": "..."
}

RULES:
- Preserve CORE MESSAGE across platforms
- Adapt TONE and FORMAT to each platform's culture
- Twitter/X: MUST be under 280 chars total
- LinkedIn: Lead with data or insight, professional tone
- TikTok: Think in video script beats, not text
- NEVER include research, strategy scores, or performance metrics
- NEVER reference internal system names or technical identifiers

Return ONLY a JSON array of platform packages.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 2048, system: systemPrompt,
        messages: [{ role: "user", content: `Adapt the creative for these platforms: ${platforms.join(", ")}` }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) throw new Error("RATE_LIMITED");
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const tokensIn = aiResult.usage?.input_tokens ?? null;
    const tokensOut = aiResult.usage?.output_tokens ?? null;
    const raw = aiResult.content?.[0]?.text || "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON array");
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>[];

    const packages = parsed.map((pkg: any) => {
      const p = (pkg.platform || "").toLowerCase();
      const spec = PLATFORM_SPECS[p] || PLATFORM_SPECS.instagram;
      const timing = POSTING_WINDOWS[p] || POSTING_WINDOWS.instagram;
      const bodyText = pkg.adapted_body || "";
      return {
        platform: p, format_recommendation: pkg.format_recommendation || spec.formats[0],
        aspect_ratios: spec.aspectRatios, adapted_headline: pkg.adapted_headline || "",
        adapted_body: bodyText, adapted_hook: pkg.adapted_hook || "",
        adapted_cta: pkg.adapted_cta || "", hashtags: Array.isArray(pkg.hashtags) ? pkg.hashtags : [],
        posting_time: timing, platform_notes: pkg.platform_notes || "",
        algorithm_tip: pkg.algorithm_tip || spec.algorithmKey,
        char_count: bodyText.length, within_limit: bodyText.length <= spec.maxChars,
      };
    });

    const elapsed = Date.now() - startTime;
    await logHealth(AGENT_ID, true, elapsed, tokensIn, tokensOut);

    return new Response(JSON.stringify({
      version: "Ψ3", status: "complete", "σo": JSON.stringify(packages),
      "δi": AGENT_ID, lane: "copy", platform_count: packages.length, packages,
      cross_platform_coherence: true, elapsed_ms: elapsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    const status = errMsg === "RATE_LIMITED" ? 429 : 500;
    const elapsed = Date.now() - startTime;
    await logHealth(AGENT_ID, false, elapsed, null, null);
    return new Response(JSON.stringify({
      version: "Ψ3", status: "error", "σo": KNP_NULL,
      error: errMsg, "δi": AGENT_ID, lane: "copy", elapsed_ms: elapsed,
    }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
