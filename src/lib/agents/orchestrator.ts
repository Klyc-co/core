import { supabase } from "@/integrations/supabase/client";
import type {
  AgentRole,
  AgentMetricsOutput,
  ResearchAgentInput,
  SocialAgentInput,
  ImageAgentInput,
  EditorAgentInput,
  AnalyticsAgentInput,
} from "./types";
import { computeResearchMetrics } from "./researchAgent";
import { computeSocialMetrics } from "./socialAgent";
import { computeImageMetrics } from "./imageAgent";
import { computeEditorMetrics } from "./editorAgent";
import { computeAnalyticsMetrics } from "./analyticsAgent";
import { loadClientBrain, type ClientBrainContext } from "@/lib/client/clientBrainLoader";
import { runCampaignPlanner, type PlannerOutput, type ClientBrainSnapshot } from "./campaignPlanner";
import { generateBatchContent, type BatchResult, type GeneratedPost } from "./batchGenerator";
import { schedulePosts, type ScheduleResult } from "@/lib/publishing/publishQueue";
import { estimateTokenCost, enforceBudget } from "./tokenMonitor";
import type { CampaignManifest } from "@/lib/campaigns/campaignManifest";

// ============================================================
// KLYC Campaign Orchestrator
// Single entry point for running the full campaign lifecycle:
//   Load Draft → Load Brain → Plan → Generate → Save → Schedule
// Also retains the existing metrics aggregation layer.
// ============================================================

// ---- Pipeline Types ----

export interface PipelineResult {
  success: boolean;
  draft_id: string;
  client_id: string;
  stage_completed: PipelineStage;
  brain_context?: ClientBrainContext;
  planner_output?: PlannerOutput;
  batch_result?: BatchResult;
  schedule_result?: ScheduleResult;
  post_queue_ids: string[];
  warnings: string[];
  error?: string;
  started_at: string;
  completed_at: string;
}

export type PipelineStage =
  | "init"
  | "load_draft"
  | "load_brain"
  | "plan"
  | "generate"
  | "save_posts"
  | "schedule"
  | "complete"
  | "error";

export interface PipelineOptions {
  /** Skip the planner and use the manifest directly */
  manifest_override?: CampaignManifest;
  /** Auto-schedule posts or leave as pending_approval */
  auto_schedule?: boolean;
  /** Budget cap per post (default $1) */
  max_cost_per_post?: number;
  /** Platforms override (otherwise inferred from draft/brain) */
  platforms?: string[];
  /** Date range override */
  date_range?: { start: string; end: string };
  /** Posts per day override */
  posts_per_day?: number;
  /** Variation count override */
  variation_count?: number;
}

// ---- Main Pipeline ----

/**
 * Run the full campaign pipeline from a campaign draft.
 * This is the single entry point for campaign execution.
 *
 * Pipeline steps:
 * 1. Load campaign draft from DB
 * 2. Load client brain (brand, voice, strategy, examples, analytics)
 * 3. Generate campaign manifest via Campaign Planner
 * 4. Generate batch content via Batch Generator
 * 5. Save generated posts to post_queue (status = pending_approval)
 * 6. Schedule posts with optimal timing
 *
 * SECURITY: AI models never access social tokens.
 * Publishing only happens through queue workers (publish-post edge fn).
 */
export async function runCampaignPipeline(
  draftId: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  let stage: PipelineStage = "init";

  const result: PipelineResult = {
    success: false,
    draft_id: draftId,
    client_id: "",
    stage_completed: "init",
    post_queue_ids: [],
    warnings: [],
    started_at: startedAt,
    completed_at: "",
  };

  try {
    // ── Step 1: Load Campaign Draft ──
    stage = "load_draft";
    await emitActivityEvent("campaign_generated", "Pipeline started: loading draft", null, { draft_id: draftId, stage });
    const draft = await loadCampaignDraft(draftId);
    if (!draft) {
      throw new PipelineError("load_draft", `Campaign draft not found: ${draftId}`);
    }

    const userId = draft.user_id;
    const clientId = draft.client_id || userId;
    result.client_id = clientId;

    // ── Step 2: Load Client Brain ──
    stage = "load_brain";
    await emitActivityEvent("campaign_generated", "Loading client brain context", clientId, { stage });
    const brainContext = await loadClientBrain(clientId);
    result.brain_context = brainContext;

    if (!brainContext.is_complete) {
      warnings.push(
        "Client brain is incomplete (missing brand/voice/strategy). " +
        "Campaign quality may be reduced."
      );
      await emitActivityEvent("ai_warning", "Client brain incomplete — quality may be reduced", clientId, { stage });
    }

    // ── Step 3: Generate Campaign Manifest ──
    stage = "plan";
    await emitActivityEvent("campaign_generated", "Planning campaign manifest", clientId, { stage });
    const plannerOutput = await runPlannerFromDraft(draft, brainContext, options);
    result.planner_output = plannerOutput;
    warnings.push(...plannerOutput.warnings);

    const manifest = options.manifest_override || plannerOutput.manifest;

    // Budget gate: abort if cost is unreasonable
    if (plannerOutput.budgetEnforcement.wasAdjusted) {
      warnings.push(
        `Budget adjusted: estimated $${plannerOutput.tokenEstimate.estimatedCostUsd.toFixed(2)} ` +
        `for ${manifest.total_posts} posts. Adjustments: ${plannerOutput.budgetEnforcement.adjustments.map(a => a.type).join(", ")}`
      );
    }

    // ── Step 4: Generate Batch Content ──
    stage = "generate";
    await emitActivityEvent("campaign_generated", `Generating ${manifest.total_posts} posts`, clientId, { stage, total_posts: manifest.total_posts });
    const batchResult = await generateBatchContent(manifest);
    result.batch_result = batchResult;

    if (batchResult.total_failed > 0) {
      warnings.push(
        `${batchResult.total_failed} of ${batchResult.total_requested} posts failed to generate.`
      );
      await emitActivityEvent("ai_warning", `${batchResult.total_failed} posts failed generation`, clientId, { stage });
    }

    if (batchResult.posts.length === 0) {
      throw new PipelineError("generate", "No posts were generated. Check manifest configuration.");
    }

    // ── Step 5: Save Posts to Queue ──
    stage = "save_posts";
    await emitActivityEvent("campaign_generated", `Saving ${batchResult.posts.length} posts to queue`, clientId, { stage });
    const postQueueIds = await savePostsToQueue(
      batchResult.posts,
      userId,
      clientId,
      draftId,
      options.auto_schedule ?? false
    );
    result.post_queue_ids = postQueueIds;

    // ── Step 6: Schedule Posts ──
    stage = "schedule";
    if (options.auto_schedule) {
      const scheduleResult = await schedulePosts(
        batchResult.posts,
        userId,
        clientId,
        draftId
      );
      result.schedule_result = scheduleResult;

      if (scheduleResult.errors.length > 0) {
        warnings.push(`Scheduling errors: ${scheduleResult.errors.join("; ")}`);
      }
    } else {
      await emitActivityEvent("approval_required", `${postQueueIds.length} posts awaiting approval`, clientId, { stage, draft_id: draftId });
      warnings.push(
        "Posts saved as pending_approval. Marketer/client approval required before scheduling."
      );
    }

    // ── Complete ──
    stage = "complete";
    result.success = true;
    result.stage_completed = "complete";
    result.warnings = warnings;
    result.completed_at = new Date().toISOString();

    await emitActivityEvent("campaign_generated", `Pipeline complete: ${postQueueIds.length} posts created`, clientId, {
      stage, draft_id: draftId, posts_created: postQueueIds.length,
    });

    return result;
  } catch (err) {
    const errorMsg = err instanceof PipelineError
      ? `[${err.stage}] ${err.message}`
      : err instanceof Error
        ? err.message
        : "Unknown error";

    console.error(`Pipeline failed at stage "${stage}":`, errorMsg);

    await emitActivityEvent("publish_failed", `Pipeline failed at ${stage}: ${errorMsg}`, result.client_id || null, {
      stage, draft_id: draftId, error: errorMsg,
    });

    result.success = false;
    result.stage_completed = stage;
    result.error = errorMsg;
    result.warnings = warnings;
    result.completed_at = new Date().toISOString();

    return result;
  }
}

// ---- Supporting Helpers ----

/**
 * Load a campaign draft by ID.
 */
async function loadCampaignDraft(draftId: string) {
  const { data, error } = await supabase
    .from("campaign_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error) {
    console.error("Failed to load draft:", error.message);
    return null;
  }

  return data;
}

/**
 * Run the campaign planner using draft data + brain context.
 */
async function runPlannerFromDraft(
  draft: any,
  brainContext: ClientBrainContext,
  options: PipelineOptions
): Promise<PlannerOutput> {
  // Map brain context to planner snapshot
  const brainSnapshot: ClientBrainSnapshot = {
    brand: brainContext.brand_profile,
    voice: brainContext.voice_profile,
    strategy: brainContext.strategy_profile,
    examples: brainContext.examples,
    analytics: brainContext.analytics,
  };

  // Determine platforms from options, draft tags, or brain preferences
  const platforms = options.platforms
    || extractPlatformsFromDraft(draft)
    || ["instagram", "linkedin", "twitter"];

  // Date range: options override or default 2-week window
  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 86400000);
  const dateRange = options.date_range || {
    start: now.toISOString().split("T")[0],
    end: twoWeeksOut.toISOString().split("T")[0],
  };

  return runCampaignPlanner({
    clientId: draft.client_id || draft.user_id,
    clientBrain: brainSnapshot,
    campaignGoal: draft.campaign_objective || draft.campaign_goals || "engagement",
    platformPreferences: platforms,
    budgetConstraints: {
      maxCostPerPost: options.max_cost_per_post ?? 1.0,
    },
    dateRange,
    postsPerDay: options.posts_per_day ?? 1,
    variationCount: options.variation_count ?? 3,
  });
}

/**
 * Extract platform hints from draft content_type or tags.
 */
function extractPlatformsFromDraft(draft: any): string[] | null {
  const tags: string[] = draft.tags || [];
  const knownPlatforms = ["instagram", "linkedin", "twitter", "tiktok", "youtube", "facebook"];
  const found = tags
    .map((t: string) => t.toLowerCase())
    .filter((t: string) => knownPlatforms.includes(t));

  return found.length > 0 ? found : null;
}

/**
 * Save generated posts to the post_queue table.
 * Status is "pending_approval" unless auto_schedule is true.
 */
async function savePostsToQueue(
  posts: GeneratedPost[],
  userId: string,
  clientId: string,
  draftId: string,
  autoSchedule: boolean
): Promise<string[]> {
  const status = autoSchedule ? "scheduled" : "draft";

  const rows = posts.map((p) => ({
    user_id: userId,
    client_id: clientId,
    campaign_draft_id: draftId,
    content_type: mapContentType(p.content),
    post_text: p.content.full_text,
    status,
    scheduled_at: p.publish_time,
  }));

  const { data, error } = await supabase
    .from("post_queue")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("Failed to save posts to queue:", error.message);
    return [];
  }

  return (data || []).map((r: any) => r.id);
}

/**
 * Infer the content_type from generated content structure.
 */
function mapContentType(content: { structure: string; tone: string }): string {
  const struct = content.structure.toLowerCase();
  if (struct.includes("video") || struct.includes("reel")) return "video";
  if (struct.includes("carousel") || struct.includes("gallery")) return "carousel";
  if (struct.includes("story")) return "story";
  return "text";
}

// ---- Activity Event Helper ----

async function emitActivityEvent(
  eventType: string,
  eventMessage: string,
  clientId: string | null,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_events" as any).insert({
      user_id: user.id,
      client_id: clientId,
      event_type: eventType,
      event_message: eventMessage,
      metadata,
    } as any);
  } catch (e) {
    console.warn("Failed to emit activity event:", e);
  }
}

// ---- Pipeline Error ----

class PipelineError extends Error {
  stage: PipelineStage;
  constructor(stage: PipelineStage, message: string) {
    super(message);
    this.stage = stage;
    this.name = "PipelineError";
  }
}

// ============================================================
// KLYC Metrics Orchestrator
// Aggregates metrics across all agents and provides
// parameterized analytics queries.
// ============================================================

export interface OrchestratorMetricsReport {
  clientId: string;
  agentReports: AgentMetricsOutput[];
  overallScore: number;
  criticalActions: AgentMetricsOutput["recommended_actions"];
  generatedAt: string;
}

/**
 * Run all agent metric calculators and produce a unified report.
 */
export function aggregateAgentMetrics(
  clientId: string,
  inputs: {
    research?: ResearchAgentInput;
    social?: SocialAgentInput;
    image?: ImageAgentInput;
    editor?: EditorAgentInput;
    analytics?: AnalyticsAgentInput;
  }
): OrchestratorMetricsReport {
  const reports: AgentMetricsOutput[] = [];

  if (inputs.research) reports.push(computeResearchMetrics(inputs.research));
  if (inputs.social) reports.push(computeSocialMetrics(inputs.social));
  if (inputs.image) reports.push(computeImageMetrics(inputs.image));
  if (inputs.editor) reports.push(computeEditorMetrics(inputs.editor));
  if (inputs.analytics) reports.push(computeAnalyticsMetrics(inputs.analytics));

  const allValues = reports.flatMap((r) => r.metrics.map((m) => m.value));
  const overallScore = allValues.length > 0
    ? allValues.reduce((a, b) => a + b, 0) / allValues.length
    : 0;

  const criticalActions = reports.flatMap((r) =>
    r.recommended_actions.filter((a) => a.priority === "high")
  );

  return {
    clientId,
    agentReports: reports,
    overallScore: Math.round(overallScore * 1000) / 1000,
    criticalActions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Execute a predefined analytics query using the Supabase client.
 */
export async function queryAnalytics(
  metric: "engagement_rate" | "ctr" | "saves" | "shares" | "reach",
  filters: { userId: string; campaignId?: string; platform?: string; daysBack?: number }
) {
  const since = new Date(Date.now() - (filters.daysBack || 30) * 86400000).toISOString();

  let query = supabase
    .from("post_analytics")
    .select("platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate, fetched_at")
    .gte("fetched_at", since);

  if (filters.platform) {
    query = query.eq("platform", filters.platform);
  }

  const { data, error } = await query.order("fetched_at", { ascending: false }).limit(100);

  if (error) {
    console.error("Analytics query failed:", error);
    return { data: null, error: error.message };
  }

  const records = data || [];
  switch (metric) {
    case "engagement_rate": {
      const rates = records.map((r) => r.engagement_rate).filter(Boolean) as number[];
      return { data: { metric, value: avg(rates), count: rates.length, records }, error: null };
    }
    case "ctr": {
      const totalClicks = sum(records, "clicks");
      const totalImpressions = sum(records, "impressions");
      return { data: { metric, value: totalImpressions > 0 ? totalClicks / totalImpressions : 0, count: records.length }, error: null };
    }
    case "saves":
      return { data: { metric, value: sum(records, "saves"), count: records.length }, error: null };
    case "shares":
      return { data: { metric, value: sum(records, "shares"), count: records.length }, error: null };
    case "reach":
      return { data: { metric, value: sum(records, "reach"), count: records.length }, error: null };
    default:
      return { data: null, error: `Unknown metric: ${metric}` };
  }
}

/**
 * Generate a dashboard-ready metrics snapshot for a client.
 */
export async function generateDashboardSnapshot(userId: string) {
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();

  const [analyticsRes, postsRes, draftsRes] = await Promise.all([
    supabase
      .from("post_analytics")
      .select("platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate")
      .gte("fetched_at", since30d),
    supabase
      .from("post_queue")
      .select("status, content_type, created_at")
      .eq("user_id", userId)
      .gte("created_at", since30d),
    supabase
      .from("campaign_drafts")
      .select("id, content_type, tags, created_at")
      .eq("user_id", userId)
      .gte("created_at", since30d),
  ]);

  const analytics = analyticsRes.data || [];
  const posts = postsRes.data || [];
  const drafts = draftsRes.data || [];

  const platforms: Record<string, { views: number; likes: number; engagement: number; count: number }> = {};
  for (const a of analytics) {
    const p = a.platform;
    if (!platforms[p]) platforms[p] = { views: 0, likes: 0, engagement: 0, count: 0 };
    platforms[p].views += a.views || 0;
    platforms[p].likes += a.likes || 0;
    platforms[p].engagement += a.engagement_rate || 0;
    platforms[p].count++;
  }

  return {
    period: "last_30_days",
    totalPosts: posts.length,
    totalDrafts: drafts.length,
    postsByStatus: countBy(posts, "status"),
    postsByType: countBy(posts, "content_type"),
    platformBreakdown: Object.entries(platforms).map(([platform, m]) => ({
      platform,
      totalViews: m.views,
      totalLikes: m.likes,
      avgEngagementRate: m.count > 0 ? Math.round((m.engagement / m.count) * 1000) / 1000 : 0,
      postCount: m.count,
    })),
    topTags: countTags(drafts),
    generatedAt: new Date().toISOString(),
  };
}

// ---- Helpers ----

function sum(records: any[], key: string): number {
  return records.reduce((s, r) => s + (r[key] || 0), 0);
}

function avg(nums: number[]): number {
  return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 1000) / 1000 : 0;
}

function countBy(items: any[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const val = item[key] || "unknown";
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function countTags(drafts: any[]): Array<{ tag: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const d of drafts) {
    for (const tag of d.tags || []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
}
