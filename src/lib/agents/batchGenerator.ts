import type { CampaignManifest, ScheduledPost } from "@/lib/campaigns/campaignManifest";
import { getTemplate, generateStructureVariations, type SocialPlatform } from "./platformTemplates";
import { estimateTokenCost, type TokenEstimate } from "./tokenMonitor";

// ============================================================
// KLYC Batch Content Generator
// Generates posts across platforms from a campaign manifest.
// Processes in batches of 10 with concurrency limit of 3.
// ============================================================

export interface GeneratedPost {
  post_id: string;
  platform: string;
  publish_time: string;
  content: GeneratedContent;
  variation: number;
  estimated_tokens: number;
  estimated_cost: number;
}

export interface GeneratedContent {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  full_text: string;
  structure: string;
  tone: string;
}

export interface BatchResult {
  campaign_id: string;
  total_requested: number;
  total_generated: number;
  total_failed: number;
  posts: GeneratedPost[];
  failures: BatchFailure[];
  tokenEstimate: TokenEstimate;
  generated_at: string;
}

export interface BatchFailure {
  post_id: string;
  platform: string;
  error: string;
  attempts: number;
}

interface GenerationJob {
  scheduledPost: ScheduledPost;
  manifest: CampaignManifest;
}

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 3;
const MAX_RETRIES = 2;

// ---- Tone labels indexed by variation_index ----
const TONE_LABELS = ["professional", "conversational", "bold"] as const;

/**
 * Generate all posts defined in a campaign manifest.
 */
export async function generateBatchContent(
  manifest: CampaignManifest
): Promise<BatchResult> {
  const jobs: GenerationJob[] = manifest.schedule.map((sp) => ({
    scheduledPost: sp,
    manifest,
  }));

  // Token estimate for the full batch
  const tokenEstimate = estimateTokenCost(
    manifest.total_posts,
    manifest.variation_count,
    ["social", "editor"],
  );

  const posts: GeneratedPost[] = [];
  const failures: BatchFailure[] = [];

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const results = await processWithConcurrency(batch, CONCURRENCY_LIMIT);

    for (const result of results) {
      if (result.success && result.post) {
        posts.push(result.post);
      } else {
        failures.push({
          post_id: result.postId,
          platform: result.platform,
          error: result.error || "Unknown error",
          attempts: result.attempts,
        });
      }
    }
  }

  return {
    campaign_id: manifest.campaign_id,
    total_requested: jobs.length,
    total_generated: posts.length,
    total_failed: failures.length,
    posts,
    failures,
    tokenEstimate,
    generated_at: new Date().toISOString(),
  };
}

// ---- Concurrency-limited execution ----

interface JobResult {
  postId: string;
  platform: string;
  success: boolean;
  post?: GeneratedPost;
  error?: string;
  attempts: number;
}

async function processWithConcurrency(
  jobs: GenerationJob[],
  limit: number
): Promise<JobResult[]> {
  const results: JobResult[] = [];
  const executing = new Set<Promise<void>>();

  for (const job of jobs) {
    const task = (async () => {
      const result = await executeWithRetry(job);
      results.push(result);
    })();

    executing.add(task);
    task.finally(() => executing.delete(task));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

async function executeWithRetry(job: GenerationJob): Promise<JobResult> {
  const { scheduledPost } = job;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const post = await generateSinglePost(job);
      return {
        postId: scheduledPost.post_id,
        platform: scheduledPost.platform,
        success: true,
        post,
        attempts: attempt,
      };
    } catch (err: any) {
      lastError = err?.message || String(err);
      // Wait briefly before retry
      if (attempt <= MAX_RETRIES) {
        await delay(500 * attempt);
      }
    }
  }

  return {
    postId: scheduledPost.post_id,
    platform: scheduledPost.platform,
    success: false,
    error: lastError,
    attempts: MAX_RETRIES + 1,
  };
}

// ---- Single post generation (delegates to Social Agent logic) ----

async function generateSinglePost(job: GenerationJob): Promise<GeneratedPost> {
  const { scheduledPost, manifest } = job;
  const { platform, structure, variation_index, post_id, publish_time } = scheduledPost;

  // Resolve template and variation
  const template = getTemplate(platform as SocialPlatform, structure);
  const toneIndex = variation_index % TONE_LABELS.length;
  const tone = TONE_LABELS[toneIndex];

  let hook = "";
  let body = "";
  let cta = "";
  let hashtags: string[] = [];

  if (template) {
    const variations = generateStructureVariations(template);
    const variation = variations[toneIndex] || variations[0];

    // Build content from variation sections (role, instruction, example_snippet)
    const sections = variation.sections;
    hook = sections.find((s) => s.role === "hook")?.example_snippet || buildFallbackHook(manifest.campaign_goal, template.hook_type);
    body = sections
      .filter((s) => s.role !== "hook" && s.role !== "cta")
      .map((s) => s.example_snippet)
      .join("\n\n");
    cta = sections.find((s) => s.role === "cta")?.example_snippet || template.cta_pattern.examples[0] || "";
    hashtags = buildHashtags(template.hashtag_pattern.count, platform);
  } else {
    // Fallback for platforms without templates
    hook = buildFallbackHook(manifest.campaign_goal, "bold_claim");
    body = `Content for ${platform} — ${manifest.campaign_goal}`;
    cta = "Learn more ↓";
    hashtags = [`#${platform}`, "#marketing"];
  }

  const full_text = [hook, body, cta, hashtags.join(" ")].filter(Boolean).join("\n\n");

  // Per-post token estimate
  const perPostEstimate = estimateTokenCost(1, 1, ["social", "editor"]);

  return {
    post_id,
    platform,
    publish_time,
    content: {
      hook,
      body,
      cta,
      hashtags,
      full_text,
      structure: structure || "default",
      tone,
    },
    variation: variation_index,
    estimated_tokens: perPostEstimate.totalEstimatedTokens,
    estimated_cost: perPostEstimate.estimatedCostUsd,
  };
}

// ---- Helpers ----

function buildFallbackHook(goal: string, hookType: string): string {
  const hooks: Record<string, string> = {
    question: `What if you could ${goal.toLowerCase()}?`,
    bold_claim: `Here's the truth about ${goal.toLowerCase()} that nobody talks about.`,
    statistic: `93% of brands that focus on ${goal.toLowerCase()} see 2x growth.`,
    story_opener: `Last year, we set out to ${goal.toLowerCase()}. Here's what happened.`,
    pattern_interrupt: `Stop scrolling. This changes everything about ${goal.toLowerCase()}.`,
    controversial_take: `Unpopular opinion: most ${goal.toLowerCase()} strategies are broken.`,
    curiosity_gap: `We discovered something unexpected about ${goal.toLowerCase()}…`,
    direct_address: `If you're serious about ${goal.toLowerCase()}, read this.`,
  };
  return hooks[hookType] || hooks["bold_claim"];
}

function buildHashtags(count: number, platform: string): string[] {
  const base = [`#${platform}`, "#marketing", "#contentstrategy", "#growthhacking", "#brandbuilding"];
  return base.slice(0, Math.min(count, base.length));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
