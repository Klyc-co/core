import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Lane Lock ─────────────────────────────────────────────────────────────────
const AGENT_ID = "copy";
const AGENT_VERSION = "v4";
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

// ── Platform specs ────────────────────────────────────────────────────────────
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
  tiktok:    { primary: "7-9 PM local",            secondary: "12-2 PM local",    timezone_note: "Gen Z peaks evening; lunch break secondary" },
  instagram: { primary: "11 AM - 1 PM local",      secondary: "7-9 PM local",     timezone_note: "Lunch discovery + evening scroll" },
  linkedin:  { primary: "8-10 AM local (Tue-Thu)",  secondary: "12-1 PM local",    timezone_note: "Morning commute + lunch; avoid weekends" },
  youtube:   { primary: "2-4 PM local (Thu-Sat)",   secondary: "6-9 PM local",     timezone_note: "Pre-weekend + evening viewing" },
  twitter:   { primary: "8-10 AM local",            secondary: "12-1 PM local",    timezone_note: "Morning scroll + lunch break" },
  facebook:  { primary: "1-3 PM local",             secondary: "6-8 PM local",     timezone_note: "Afternoon break + early evening" },
};

// ── Copy output sanitization ──────────────────────────────────────────────────
// Strip markdown code fences and surrounding whitespace before parsing
function sanitizeAiOutput(raw: string): string {
  let s = raw.trim();
  // Strip leading ```json or ```
  s = s.replace(/^```(?:json|JSON)?\s*/i, "");
  // Strip trailing ```
  s = s.replace(/\s*```\s*$/, "");
  s = s.trim();
  return s;
}

// ── Balanced-bracket JSON extractor ──────────────────────────────────────────
// Finds the FIRST complete JSON object or array using bracket-depth counting.
// Immune to greedy-regex failures (e.g. prose containing ] after the JSON ends).
function extractBalancedJson(text: string, opener: "{" | "["): string | null {
  const closer = opener === "{" ? "}" : "]";
  const start = text.indexOf(opener);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let escNext = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escNext) { escNext = false; continue; }
    if (ch === "\\" && inStr) { escNext = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === opener) depth++;
    else if (ch === closer) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// ── Schema validation ─────────────────────────────────────────────────────────
interface CopyPost {
  platform: string;
  hook?: string;
  body?: string;
  adapted_body?: string;
  adapted_hook?: string;
  text?: string;
  hashtags?: string[];
  cta?: string;
  adapted_cta?: string;
}

interface CopyOutput {
  posts: CopyPost[];
}

function validateCopySchema(parsed: unknown): { valid: boolean; error?: string; data?: CopyOutput } {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, error: "Root must be an object, not array or primitive" };
  }
  const obj = parsed as Record<string, unknown>;
  const posts = obj.posts;
  if (!Array.isArray(posts)) {
    return { valid: false, error: `Missing 'posts' array — found keys: [${Object.keys(obj).join(", ")}]` };
  }
  if (posts.length === 0) {
    return { valid: false, error: "posts array is empty" };
  }
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i] as Record<string, unknown>;
    if (!post || typeof post !== "object") {
      return { valid: false, error: `posts[${i}] is not an object` };
    }
    if (!post.platform) {
      return { valid: false, error: `posts[${i}] missing required 'platform' field` };
    }
    const hasText = post.body || post.adapted_body || post.text || post.hook || post.adapted_hook || post.cta || post.adapted_cta;
    if (!hasText) {
      return { valid: false, error: `posts[${i}] (${post.platform}) missing all text fields — need at least one of: body, hook, cta` };
    }
  }
  return { valid: true, data: { posts: posts as CopyPost[] } };
}

// ── Map validated posts to canonical package shape ────────────────────────────
function mapToPackages(posts: CopyPost[]): Record<string, unknown>[] {
  return posts.map((post) => {
    const p = String(post.platform || "tiktok").toLowerCase().trim();
    const spec = PLATFORM_SPECS[p] || PLATFORM_SPECS.instagram;
    const timing = POSTING_WINDOWS[p] || POSTING_WINDOWS.instagram;
    const bodyText = post.body || post.adapted_body || post.text || post.hook || post.adapted_hook || "";
    return {
      platform: p,
      format_recommendation: spec.formats[0],
      aspect_ratios: spec.aspectRatios,
      adapted_headline: "",
      adapted_body: bodyText,
      adapted_hook: post.hook || post.adapted_hook || "",
      adapted_cta: post.cta || post.adapted_cta || "",
      hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
      posting_time: timing,
      platform_notes: "",
      algorithm_tip: spec.algorithmKey,
      char_count: bodyText.length,
      within_limit: bodyText.length <= spec.maxChars,
    };
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
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
      return `### ${p.toUpperCase()}\n- Formats: ${spec.formats.join(", ")}\n- Max chars: ${spec.maxChars}\n- Hashtags: ${spec.hashtagRange[0]}-${spec.hashtagRange[1]}\n- Hook rule: ${spec.hookRule}\n- Algorithm: ${spec.algorithmKey}\n- Tone: ${spec.toneGuide}`;
    }).join("\n\n");

    // ── Hardened system prompt — explicit JSON-only contract ──────────────────
    const systemPrompt = `You are a social media copy adapter. Your ONLY job is to produce platform-native post copy from the provided creative brief.

CREATIVE INPUT:
${JSON.stringify(creative)}

AUDIENCE: ${audience}
${narrative ? `NARRATIVE CONTEXT: ${JSON.stringify(narrative)}` : ""}

PLATFORM SPECS:
${platformSpecPrompts}

CRITICAL — OUTPUT FORMAT CONTRACT:
- Return ONLY a valid JSON object. Nothing else.
- No markdown. No code fences. No backticks. No asterisks.
- No prose before or after the JSON.
- No explanations. No comments. No preamble. No sign-off.
- Your entire response must start with { and end with }
- If you cannot fill a field, use an empty string ""

REQUIRED JSON STRUCTURE:
{
  "posts": [
    {
      "platform": "<platform_name>",
      "hook": "<attention-grabbing opening — 1-2 sentences>",
      "body": "<main post copy — full text for the platform>",
      "hashtags": ["tag1", "tag2"],
      "cta": "<call to action>"
    }
  ]
}

RULES:
- Produce one post object per platform listed
- Every post MUST have: platform, body
- Twitter/X body MUST be under 280 characters
- LinkedIn: lead with a data point or insight
- TikTok: write as a video script beat opener
- NEVER include research scores, strategy scores, or performance metrics
- NEVER reference internal system identifiers`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 3000, system: systemPrompt,
        messages: [{ role: "user", content: `Produce post copy for these platforms: ${platforms.join(", ")}. Return ONLY valid JSON starting with {` }],
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

    // ── Parse pipeline with debug fields ─────────────────────────────────────
    const copy_raw_model_output: string = aiResult.content?.[0]?.text || "";
    const copy_cleaned_output: string = sanitizeAiOutput(copy_raw_model_output);
    let copy_parse_error: string | null = null;
    let copy_schema_error: string | null = null;

    // Step 1: extract balanced JSON object from cleaned output
    const jsonStr = extractBalancedJson(copy_cleaned_output, "{");
    if (!jsonStr) {
      // Fallback: maybe it returned an array instead of an object — try to wrap it
      const arrayStr = extractBalancedJson(copy_cleaned_output, "[");
      if (arrayStr) {
        copy_parse_error = "Model returned array instead of object — wrapping in {posts:[...]}";
        try {
          const arr = JSON.parse(arrayStr) as unknown[];
          // Array of post objects → wrap as {posts:[...]}
          const validated = validateCopySchema({ posts: arr });
          if (validated.valid && validated.data) {
            const packages = mapToPackages(validated.data.posts);
            const elapsed = Date.now() - startTime;
            await logHealth(AGENT_ID, true, elapsed, tokensIn, tokensOut);
            return new Response(JSON.stringify({
              version: "Ψ3", status: "complete", "σo": packages,
              "δi": AGENT_ID, lane: "copy", platform_count: packages.length,
              packages, posts: packages,
              copy_raw_model_output, copy_cleaned_output,
              copy_parse_error, copy_schema_error: null,
              elapsed_ms: elapsed,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          } else {
            copy_schema_error = validated.error || "Array schema invalid";
          }
        } catch (e2: any) {
          copy_parse_error = `Array parse failed: ${e2.message}`;
        }
      } else {
        copy_parse_error = `No JSON object or array found in model output. Output starts with: ${copy_cleaned_output.slice(0, 120)}`;
      }
      throw new Error(`Copy submind output parse failure: ${copy_parse_error}`);
    }

    // Step 2: JSON.parse the extracted object
    let parsedObj: unknown;
    try {
      parsedObj = JSON.parse(jsonStr);
    } catch (e: any) {
      copy_parse_error = `JSON.parse failed: ${e.message}. Extracted string (first 200): ${jsonStr.slice(0, 200)}`;
      throw new Error(`Copy submind JSON parse error: ${e.message}`);
    }

    // Step 3: schema validation
    const validation = validateCopySchema(parsedObj);
    if (!validation.valid) {
      copy_schema_error = validation.error || "Schema validation failed";
      throw new Error(`Copy submind schema validation failed: ${copy_schema_error}`);
    }

    // Step 4: map to canonical package shape
    const packages = mapToPackages(validation.data!.posts);
    const elapsed = Date.now() - startTime;
    await logHealth(AGENT_ID, true, elapsed, tokensIn, tokensOut);

    return new Response(JSON.stringify({
      version: "Ψ3", status: "complete", "σo": packages,
      "δi": AGENT_ID, lane: "copy", platform_count: packages.length,
      // Both carriers: packages (legacy compat) + posts (new schema)
      packages, posts: packages,
      cross_platform_coherence: true, elapsed_ms: elapsed,
      // Debug fields — always included so dashboard can inspect
      copy_raw_model_output, copy_cleaned_output,
      copy_parse_error: null, copy_schema_error: null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    const status = errMsg.startsWith("RATE_LIMITED") ? 429 : 500;
    const elapsed = Date.now() - startTime;
    await logHealth(AGENT_ID, false, elapsed, null, null);
    return new Response(JSON.stringify({
      version: "Ψ3", status: "error", "σo": KNP_NULL,
      error: errMsg, "δi": AGENT_ID, lane: "copy", elapsed_ms: elapsed,
      // Debug fields preserved even on error — essential for diagnosis
      copy_raw_model_output: (e as any)._raw || null,
      copy_cleaned_output: null,
      copy_parse_error: errMsg.includes("parse") ? errMsg : null,
      copy_schema_error: errMsg.includes("schema") || errMsg.includes("validation") ? errMsg : null,
    }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
