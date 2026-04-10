import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "text-embedding-004";

async function generateEmbedding(text: string, geminiKey: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${EMBED_MODEL}`, content: { parts: [{ text }] } }),
    }
  );
  if (!response.ok) throw new Error(`Embed failed ${response.status}`);
  const data = await response.json();
  return data?.embedding?.values || [];
}

// ── Seed knowledge ────────────────────────────────────────────────────────────
const SEED_KNOWLEDGE = [
  // Platform specs — copy + research lanes
  {
    content: `TikTok Platform Specification 2026:
Formats: Vertical Video (9:16), 15-60s optimal. Max caption: 2200 chars. Hashtags: 4-7.
Hook rule: Pattern interrupt in first 1-3 seconds — visual/audio surprise drives completion.
Algorithm: Completion rate is the #1 signal. Watch time weighted above likes or comments.
Tone: Casual, authentic, trend-aware, chaotic energy acceptable. Gen Z: 48% daily usage.
Best times: 7-9 PM local (primary), 12-2 PM (secondary).
Best practices: Text overlays drive completion. Trending audio amplifies reach. Raw over polished performs better. Duets and stitches build community. Product demos with personality outperform ads.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "tiktok" },
  },
  {
    content: `Instagram Platform Specification 2026:
Formats: Reels (9:16), Carousel (1:1), Stories (9:16), Feed (1:1 or 4:5). Max caption: 2200 chars. Hashtags: 5-10.
Hook rule: Front-load key message in caption first line; visual hook in first frame of Reel.
Algorithm: Shares and saves are weighted most heavily. Comments signal deep engagement.
Tone: Visual-first, emoji acceptable, authentic over polished. 40% daily usage.
Best times: 11AM-1PM local (primary), 7-9PM (secondary).
Best practices: Carousels get 3x more reach than single images. Reels reach new audiences. Alt text improves accessibility and SEO. Close Friends Stories drive highest engagement rates.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "instagram" },
  },
  {
    content: `LinkedIn Platform Specification 2026:
Formats: Text post (1300 chars ideal), Document carousel, Native video, Single image. Max: 3000 chars. Hashtags: 3-5.
Hook rule: First 2 lines are visible before 'see more' — must create a curiosity gap or bold claim.
Algorithm: Dwell time and comments weighted heavily. Early engagement (first hour) determines viral coefficient.
Tone: Professional but conversational. Data-driven hooks outperform opinion hooks. Personal stories with professional insight perform best.
Best times: 8-10 AM Tue-Thu (primary), 12-1PM (secondary). Avoid weekends.
Best practices: Native documents get 3x more reach than linked articles. Personal accounts outperform brand pages. First-person storytelling wins.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "linkedin" },
  },
  {
    content: `YouTube Platform Specification 2026:
Formats: Shorts (9:16, under 60s), Long-form (16:9, 8-15 min optimal). Max description: 5000 chars. Hashtags: 3-8.
Hook rule: Thumbnail drives CTR most — high contrast, faces, text overlay. First 5 seconds must deliver on thumbnail promise.
Algorithm: Watch time and session time are primary signals. Click-through rate x average view duration = ranking score.
Tone: Educational or entertaining with strong personality. Chapters improve average view duration.
Best times: 2-4 PM Thu-Sat (primary), 6-9PM (secondary).
Best practices: Custom thumbnails are non-negotiable. End screens drive subscriptions. Pinned comments guide conversation. Shorts feed to long-form via playlists.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "youtube" },
  },
  {
    content: `Twitter/X Platform Specification 2026:
Formats: 280 char tweets, threads, 1-2 images, video under 2:20. Hashtags: 1-3 max.
Hook rule: First tweet must stand completely alone. Thread opener is the strongest take — do not bury the lead.
Algorithm: Replies and retweet-with-comment are highest value signals. Quote tweets expand reach.
Tone: Punchy, witty, provocative acceptable. Hot takes and contrarian views get amplified.
Best times: 8-10 AM local (primary), 12-1PM (secondary).
Best practices: Threads get 63% more impressions than single tweets. Twitter Blue subscribers get priority in replies. Spaces drive brand authority for thought leaders. Polls drive engagement.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "twitter" },
  },
  {
    content: `Facebook Platform Specification 2026:
Formats: Text + image, Native video, Reels, Stories, Groups posts. Max: 2000 chars. Hashtags: 2-4.
Hook rule: Conversational opener — a relatable question or bold statement. Facebook users scroll slower than other platforms.
Algorithm: Meaningful interactions (comments, shares to Messenger) outweigh passive engagement.
Tone: Conversational, community-oriented. Facebook Groups drive highest organic reach in 2026.
Best times: 1-3 PM local (primary), 6-8 PM (secondary).
Best practices: Native video outperforms linked YouTube. Group content reaches more than page content. Events drive foot traffic. Marketplace drives commerce intent.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "facebook" },
  },
  // Campaign strategy best practices — research + strategy lanes
  {
    content: `Campaign Hook Framework — Best Practices:
The first moment of any content determines its performance. Three proven hook types:
1. Pattern Interrupt: Something visually or audibly unexpected that stops the scroll. Works on TikTok, Instagram Reels, YouTube Shorts.
2. Curiosity Gap: State a surprising outcome without the explanation — "Why this brand lost 50% of customers in one week (and doubled revenue)."
3. Pain Point Mirror: Name the exact frustration the audience has before offering the solution. "Tired of campaigns that look great but convert nothing?"
Hook testing: A/B test 3 hooks per campaign. Decision signal at 48 hours. Leading indicator is completion rate for video, CTR for static.`,
    category: "best_practice", lane_affinity: ["research", "strategy", "copy"],
    metadata: { topic: "hooks" },
  },
  {
    content: `Audience Segmentation Principles — 2026:
Behavioral segmentation outperforms demographic segmentation for campaign performance. Three tiers:
Primary segment: Your highest-intent audience. Already problem-aware. Conversion-ready. Targets bottom-funnel.
Secondary segment: Problem-aware but solution-agnostic. Mid-funnel. Targets comparative content.
Awareness segment: Not yet problem-aware. Reach-focused. Top-funnel. Targets pattern interrupt content.

Gen Z (18-25): Authenticity > polish. Brand values matter. Peer influence > celebrity. Short-form native.
Millennials (26-40): Value and convenience. Reviews matter. Long-form willingness. Desktop + mobile balanced.
Gen X (41-55): Quality signals via social proof. Email + Facebook primary. Trust-based conversion.
Psychographic over demographic: Shared values and aspirations bind audiences across age groups better than age alone.`,
    category: "best_practice", lane_affinity: ["research", "strategy"],
    metadata: { topic: "audience_segmentation" },
  },
  {
    content: `Content Pillar Framework for Campaign Strategy:
Every sustainable campaign rests on 3-4 content pillars. Rotate across pillars to maintain freshness and serve the full funnel.

Pillar 1 — Education: Builds trust and authority. How-to content, explainers, tips. Drives saves and bookmarks. Feeds algorithm long-term.
Pillar 2 — Entertainment: Drives sharing and reach expansion. Trends, humor, behind-the-scenes, personality. Feeds new audience discovery.
Pillar 3 — Social Proof: Drives conversion consideration. Testimonials, results, case studies, user-generated content. Reduces purchase risk.
Pillar 4 — Conversion: Direct response. Offers, urgency, specific CTA. Used sparingly — maximum 20% of content mix.

Campaign arc: Launch with Pillar 2 (reach), sustain with Pillars 1 + 3 (trust), close with Pillar 4 (conversion). Duration aligns with purchase decision cycle — shorter for impulse, longer for considered purchases.`,
    category: "best_practice", lane_affinity: ["strategy"],
    metadata: { topic: "content_pillars" },
  },
  // Performance benchmarks — performance lane
  {
    content: `Social Media Performance Benchmarks 2026:
CTR (Click-Through Rate) by platform:
- TikTok in-feed ads: 0.8–2.1% (organic completion rate 45–60% = strong)
- Instagram feed: 0.5–1.5% | Stories: 2–4% | Reels: 1.2–3.0%
- LinkedIn targeted: 0.3–0.9% (higher value per click)
- Twitter/X: 0.4–1.0% (higher for trending topics)
- Facebook feed: 0.7–1.8% | Video: 1.1–2.5%
- YouTube pre-roll: 0.8–1.6% | Shorts: 2.0–4.5%

Engagement rate benchmarks (organic):
- TikTok: 4–8% strong | Instagram: 1–3% strong | LinkedIn: 2–5% strong | Twitter: 0.5–2% strong
- Facebook: 0.5–1.5% strong | YouTube: 3–6% strong (likes/views)

CPM benchmarks vary significantly by industry and targeting precision. B2B LinkedIn CPM averages $35-75. Consumer Instagram/TikTok CPM averages $8-20.`,
    category: "benchmark", lane_affinity: ["performance"],
    metadata: { topic: "ctr_benchmarks" },
  },
  {
    content: `Campaign Performance Scoring Criteria:
When scoring a campaign strategy, evaluate across 5 dimensions:

1. Audience-Message Alignment (25pts): Does the core message match the psychographic profile? Is the tone native to the target segment?
2. Platform-Format Fit (20pts): Is the proposed content format native to each platform? Are aspect ratios and length correct?
3. Funnel Coherence (20pts): Does the campaign arc move audiences from awareness → consideration → conversion? Is there content for each stage?
4. Competitive Differentiation (20pts): Does the messaging stand out from category norms? Is there a distinctive angle or hook?
5. Measurement Readiness (15pts): Are KPIs defined? Is there a clear conversion event? Can A/B testing be applied?

Scoring: 85-100 = Launch-ready | 70-84 = Refine messaging | 50-69 = Rethink strategy | Below 50 = Restart with new insight.
Risk factors: Generic messaging (-15), wrong format for platform (-10), no CTA (-20), no audience differentiation (-15).`,
    category: "benchmark", lane_affinity: ["performance"],
    metadata: { topic: "scoring_criteria" },
  },
  // KNP protocol documentation — all lanes
  {
    content: `KNP Protocol Ψ3 — AI-to-AI Communication Standard:
KNP (Klyc Neural Protocol) is the internal compressed format for AI-to-AI communication between subminds.

Field keys (unicode-encoded):
ξb = campaign brief (compressed summary of the campaign intent)
θc = client context (brand voice, audience, constraints)  
μp = target platforms (joined with ⊕ separator)
ζq = use context / campaign goal
σo = agent output (each submind stamps their result here)
λv = routing verdict (set ONLY by orchestrator — the sequence of lanes)
κw = confidence weight (submind certainty 0.0-1.0)
πf = platform flags (additional platform metadata)
δi = agent identity stamp (functional lane ID, not a name)
ρs = source identifier
τt = timestamp

Separators: ∷ = field separator | ⊕ = value joiner (for arrays) | ∅ = null value

Two-lane architecture:
C-lane (Client ↔ AI): Standard HTTPS/JSON with auth. Full conversation context. klyc-chat handles this.
A-lane (AI ↔ AI): KNP protocol. No auth. Compressed. normalize-input bridges C→A. Orchestrator dispatches. Subminds stamp δi on all outputs.`,
    category: "knp_schema", lane_affinity: ["all"],
    metadata: { topic: "knp_protocol" },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check existing count
    const { data: countData } = await supabase.rpc("count_knowledge");
    const existingCount = Number(countData || 0);

    if (existingCount > 0 && !force) {
      return new Response(JSON.stringify({
        already_seeded: true,
        existing_count: existingCount,
        message: `Knowledge base already has ${existingCount} items. Pass force:true to reseed.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (force && existingCount > 0) {
      // Clear existing
      await supabase.from("klyc_knowledge").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Generate all embeddings in parallel batches of 5
    const batchSize = 5;
    let seeded = 0;
    const errors: string[] = [];

    for (let i = 0; i < SEED_KNOWLEDGE.length; i += batchSize) {
      const batch = SEED_KNOWLEDGE.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          const embedding = await generateEmbedding(item.content.slice(0, 2000), geminiKey);
          const embeddingStr = `[${embedding.join(",")}]`;
          const { error } = await supabase.from("klyc_knowledge").insert({
            content: item.content,
            embedding: embeddingStr,
            category: item.category,
            lane_affinity: item.lane_affinity,
            metadata: item.metadata,
          });
          if (error) throw new Error(error.message);
          return true;
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") seeded++;
        else errors.push(result.reason?.message || "Unknown error");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      seeded,
      total: SEED_KNOWLEDGE.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Seeded ${seeded}/${SEED_KNOWLEDGE.length} knowledge items into RAG store.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("initialize-rag error:", e);
    return new Response(JSON.stringify({ error: e.message || "Initialization failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
