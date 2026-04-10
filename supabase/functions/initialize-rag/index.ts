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

const SEED_KNOWLEDGE = [
  {
    content: `TikTok Platform Specification 2026:\nFormats: Vertical Video (9:16), 15-60s optimal. Max caption: 2200 chars. Hashtags: 4-7.\nHook rule: Pattern interrupt in first 1-3 seconds — visual/audio surprise drives completion.\nAlgorithm: Completion rate is the #1 signal. Watch time weighted above likes or comments.\nTone: Casual, authentic, trend-aware, chaotic energy acceptable. Gen Z: 48% daily usage.\nBest times: 7-9 PM local (primary), 12-2 PM (secondary).\nBest practices: Text overlays drive completion. Trending audio amplifies reach. Raw over polished performs better. Duets and stitches build community. Product demos with personality outperform ads.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "tiktok" },
  },
  {
    content: `Instagram Platform Specification 2026:\nFormats: Reels (9:16), Carousel (1:1), Stories (9:16), Feed (1:1 or 4:5). Max caption: 2200 chars. Hashtags: 5-10.\nHook rule: Front-load key message in caption first line; visual hook in first frame of Reel.\nAlgorithm: Shares and saves are weighted most heavily. Comments signal deep engagement.\nTone: Visual-first, emoji acceptable, authentic over polished. 40% daily usage.\nBest times: 11AM-1PM local (primary), 7-9PM (secondary).\nBest practices: Carousels get 3x more reach than single images. Reels reach new audiences. Alt text improves accessibility and SEO. Close Friends Stories drive highest engagement rates.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "instagram" },
  },
  {
    content: `LinkedIn Platform Specification 2026:\nFormats: Text post (1300 chars ideal), Document carousel, Native video, Single image. Max: 3000 chars. Hashtags: 3-5.\nHook rule: First 2 lines are visible before 'see more' — must create a curiosity gap or bold claim.\nAlgorithm: Dwell time and comments weighted heavily. Early engagement (first hour) determines viral coefficient.\nTone: Professional but conversational. Data-driven hooks outperform opinion hooks.\nBest times: 8-10 AM Tue-Thu (primary), 12-1PM (secondary). Avoid weekends.\nBest practices: Native documents get 3x more reach than linked articles. Personal accounts outperform brand pages.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "linkedin" },
  },
  {
    content: `YouTube Platform Specification 2026:\nFormats: Shorts (9:16, under 60s), Long-form (16:9, 8-15 min optimal). Max description: 5000 chars. Hashtags: 3-8.\nHook rule: Thumbnail drives CTR most — high contrast, faces, text overlay. First 5 seconds must deliver on thumbnail promise.\nAlgorithm: Watch time and session time are primary signals. CTR x average view duration = ranking score.\nTone: Educational or entertaining with strong personality.\nBest times: 2-4 PM Thu-Sat (primary), 6-9PM (secondary).\nBest practices: Custom thumbnails are non-negotiable. End screens drive subscriptions. Shorts feed to long-form via playlists.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "youtube" },
  },
  {
    content: `Twitter/X Platform Specification 2026:\nFormats: 280 char tweets, threads, 1-2 images, video under 2:20. Hashtags: 1-3 max.\nHook rule: First tweet must stand completely alone. Thread opener is the strongest take — do not bury the lead.\nAlgorithm: Replies and retweet-with-comment are highest value signals. Quote tweets expand reach.\nTone: Punchy, witty, provocative acceptable.\nBest times: 8-10 AM local (primary), 12-1PM (secondary).\nBest practices: Threads get 63% more impressions than single tweets. Spaces drive brand authority. Polls drive engagement.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "twitter" },
  },
  {
    content: `Facebook Platform Specification 2026:\nFormats: Text + image, Native video, Reels, Stories, Groups posts. Max: 2000 chars. Hashtags: 2-4.\nHook rule: Conversational opener — a relatable question or bold statement.\nAlgorithm: Meaningful interactions (comments, shares to Messenger) outweigh passive engagement.\nTone: Conversational, community-oriented. Facebook Groups drive highest organic reach in 2026.\nBest times: 1-3 PM local (primary), 6-8 PM (secondary).\nBest practices: Native video outperforms linked YouTube. Group content reaches more than page content.`,
    category: "platform_spec", lane_affinity: ["copy", "research"], metadata: { platform: "facebook" },
  },
  {
    content: `Campaign Hook Framework — Best Practices:\nThe first moment of any content determines its performance. Three proven hook types:\n1. Pattern Interrupt: Something visually or audibly unexpected that stops the scroll.\n2. Curiosity Gap: State a surprising outcome without the explanation.\n3. Pain Point Mirror: Name the exact frustration the audience has before offering the solution.\nHook testing: A/B test 3 hooks per campaign. Decision signal at 48 hours. Leading indicator is completion rate for video, CTR for static.`,
    category: "best_practice", lane_affinity: ["research", "strategy", "copy"], metadata: { topic: "hooks" },
  },
  {
    content: `Audience Segmentation Principles — 2026:\nBehavioral segmentation outperforms demographic segmentation. Three tiers:\nPrimary: Highest-intent, conversion-ready. Secondary: Problem-aware, mid-funnel. Awareness: Top-funnel, reach-focused.\nGen Z (18-25): Authenticity > polish. Brand values matter. Peer influence > celebrity.\nMillennials (26-40): Value and convenience. Reviews matter.\nGen X (41-55): Quality signals via social proof. Trust-based conversion.\nPsychographic over demographic: Shared values bind audiences better than age alone.`,
    category: "best_practice", lane_affinity: ["research", "strategy"], metadata: { topic: "audience_segmentation" },
  },
  {
    content: `Content Pillar Framework for Campaign Strategy:\nEvery sustainable campaign rests on 3-4 content pillars.\nPillar 1 — Education: Builds trust. Drives saves. Long-term algorithm signal.\nPillar 2 — Entertainment: Drives sharing and reach. New audience discovery.\nPillar 3 — Social Proof: Testimonials, results, UGC. Reduces purchase risk.\nPillar 4 — Conversion: Direct response. Max 20% of content mix.\nCampaign arc: Launch with Pillar 2 (reach) → sustain with 1+3 (trust) → close with Pillar 4 (conversion).`,
    category: "best_practice", lane_affinity: ["strategy"], metadata: { topic: "content_pillars" },
  },
  {
    content: `Social Media Performance Benchmarks 2026:\nCTR by platform: TikTok 0.8–2.1% | Instagram feed 0.5–1.5%, Stories 2–4%, Reels 1.2–3.0% | LinkedIn 0.3–0.9% | Twitter 0.4–1.0% | Facebook feed 0.7–1.8% | YouTube pre-roll 0.8–1.6%, Shorts 2.0–4.5%.\nEngagement rate (organic): TikTok 4–8% strong | Instagram 1–3% | LinkedIn 2–5% | Twitter 0.5–2% | Facebook 0.5–1.5% | YouTube 3–6%.`,
    category: "benchmark", lane_affinity: ["performance"], metadata: { topic: "ctr_benchmarks" },
  },
  {
    content: `Campaign Performance Scoring Criteria:\n1. Audience-Message Alignment (25pts): Does the message match the psychographic profile?\n2. Platform-Format Fit (20pts): Is the content format native to each platform?\n3. Funnel Coherence (20pts): Does the campaign arc move from awareness to conversion?\n4. Competitive Differentiation (20pts): Does messaging stand out from category norms?\n5. Measurement Readiness (15pts): KPIs defined? Clear conversion event?\nScoring: 85-100=Launch-ready | 70-84=Refine messaging | 50-69=Rethink strategy | <50=Restart.\nRisk factors: Generic messaging (-15), wrong format (-10), no CTA (-20), no audience differentiation (-15).`,
    category: "benchmark", lane_affinity: ["performance"], metadata: { topic: "scoring_criteria" },
  },
  {
    content: `KNP Protocol Ψ3 — AI-to-AI Communication Standard:\nField keys: ξb=brief, θc=client context, μp=platforms, ζq=use context, σo=agent output, λv=routing verdict (orchestrator only), κw=confidence, πf=flags, δi=agent identity stamp, ρs=source, τt=timestamp.\nSeparators: ∷=field separator, ⊕=value joiner, ∅=null.\nTwo-lane architecture: C-lane (Client↔AI, JWT, full JSON) and A-lane (AI↔AI, KNP, no auth, compressed).\nnormalize-input bridges C→A. Orchestrator dispatches on A-lane. All subminds stamp δi on responses.`,
    category: "knp_schema", lane_affinity: ["all"], metadata: { topic: "knp_protocol" },
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

    const { data: countData } = await supabase.rpc("count_knowledge");
    const existingCount = Number(countData || 0);

    if (existingCount > 0 && !force) {
      return new Response(JSON.stringify({
        already_seeded: true, existing_count: existingCount,
        message: `Knowledge base already has ${existingCount} items. Pass force:true to reseed.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (force && existingCount > 0) {
      await supabase.from("klyc_knowledge").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

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
            content: item.content, embedding: embeddingStr,
            category: item.category, lane_affinity: item.lane_affinity, metadata: item.metadata,
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
      success: true, seeded, total: SEED_KNOWLEDGE.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Seeded ${seeded}/${SEED_KNOWLEDGE.length} knowledge items.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("initialize-rag error:", e);
    return new Response(JSON.stringify({ error: e.message || "Initialization failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
