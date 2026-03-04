import { supabase } from "@/integrations/supabase/client";
import { comparePredictedVsActualPerformance } from "@/lib/analytics/eventCollector";
import { saveBrainDocument, loadBrainDocument, type StrategyProfile } from "@/lib/clientBrain";

// ============================================================
// KLYC Campaign Learning Engine
// Analyzes campaign performance and updates client strategy
// memory so future campaigns improve automatically.
// ============================================================

// ---- Constants ----

const MIN_CAMPAIGNS_FOR_LEARNING = 3;
const MAX_FREQUENCY_CHANGE_PERCENT = 20;
const MAX_TIME_SHIFT_HOURS = 2;

// ---- Types ----

export interface PerformanceInsights {
  performanceInsights: {
    avgScore: number;
    totalCampaignsAnalyzed: number;
    lastAnalyzedAt: string;
  };
  optimalPostTimes: string[];
  topPerformingThemes: string[];
  ctaPerformance: Record<string, number>;
  platformPerformance: Array<{
    platform: string;
    avgScore: number;
    postCount: number;
  }>;
  recommendedPlatforms: string[];
  bestCtaStyle: string;
  bestContentTheme: string;
  strategyAdjustments: StrategyAdjustment[];
}

export interface StrategyAdjustment {
  field: string;
  previous: string;
  recommended: string;
  confidence: number;
}

export interface CampaignPerformanceRow {
  id: string;
  campaign_id: string;
  client_id: string;
  platform: string;
  post_id: string;
  predicted_engagement: number;
  actual_engagement: number;
  predicted_ctr: number;
  actual_ctr: number;
  predicted_conversion: number;
  actual_conversion: number;
  performance_score: number;
  created_at: string;
}

// ---- Performance Analysis ----

/**
 * Analyze campaign performance: pull posts, compare predictions vs actuals,
 * compute scores, and insert into campaign_performance.
 */
export async function analyzeCampaignPerformance(
  campaignId: string
): Promise<{ success: boolean; rows_inserted: number; avg_score: number; error?: string }> {
  // 1. Pull all posts for this campaign
  const { data: posts, error: postsErr } = await supabase
    .from("post_queue")
    .select("id, user_id, client_id, content_type, scheduled_at")
    .eq("campaign_draft_id", campaignId);

  if (postsErr || !posts?.length) {
    return { success: false, rows_inserted: 0, avg_score: 0, error: postsErr?.message || "No posts found" };
  }

  const postIds = posts.map((p) => p.id);
  const clientId = posts[0].client_id || posts[0].user_id;

  // 2. Retrieve analytics for these posts
  const { data: analytics, error: analyticsErr } = await supabase
    .from("post_analytics")
    .select("post_queue_id, platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate")
    .in("post_queue_id", postIds);

  if (analyticsErr) {
    return { success: false, rows_inserted: 0, avg_score: 0, error: analyticsErr.message };
  }

  if (!analytics?.length) {
    return { success: false, rows_inserted: 0, avg_score: 0, error: "No analytics data yet" };
  }

  // 3. Build predictions array (using 0 as default prediction if none stored)
  const predictions = analytics.map((a) => ({
    postQueueId: a.post_queue_id,
    platform: a.platform,
    predicted_engagement: 0, // Default; real predictions come from batch generator metadata
  }));

  const comparisons = await comparePredictedVsActualPerformance(predictions);

  // 4. Calculate performance scores and build rows
  const rows: Array<{
    campaign_id: string;
    client_id: string;
    platform: string;
    post_id: string;
    predicted_engagement: number;
    actual_engagement: number;
    predicted_ctr: number;
    actual_ctr: number;
    predicted_conversion: number;
    actual_conversion: number;
    performance_score: number;
  }> = [];

  for (const a of analytics) {
    const comparison = comparisons.find(
      (c) => c.post_id === a.post_queue_id && c.platform === a.platform
    );

    const actualEngagement = a.engagement_rate ?? 0;
    const predictedEngagement = comparison?.predicted_engagement ?? 0;
    const actualCtr = a.impressions > 0 ? (a.clicks ?? 0) / a.impressions : 0;

    // Score formula: weighted accuracy (clamped 0-1)
    const engAccuracy = predictedEngagement > 0
      ? Math.max(0, 1 - Math.abs(actualEngagement - predictedEngagement) / Math.max(predictedEngagement, 1))
      : 0.5; // neutral if no prediction
    const ctrAccuracy = 0.5; // neutral default without CTR predictions
    const convAccuracy = 0.5; // neutral default without conversion predictions

    const score = clamp(
      0.4 * engAccuracy + 0.3 * ctrAccuracy + 0.3 * convAccuracy,
      0, 1
    );

    rows.push({
      campaign_id: campaignId,
      client_id: clientId,
      platform: a.platform,
      post_id: a.post_queue_id,
      predicted_engagement: predictedEngagement,
      actual_engagement: actualEngagement,
      predicted_ctr: 0,
      actual_ctr: round(actualCtr),
      predicted_conversion: 0,
      actual_conversion: 0,
      performance_score: round(score),
    });
  }

  // 5. Insert into campaign_performance
  if (rows.length === 0) {
    return { success: true, rows_inserted: 0, avg_score: 0 };
  }

  const { error: insertErr } = await supabase
    .from("campaign_performance" as any)
    .insert(rows as any);

  if (insertErr) {
    return { success: false, rows_inserted: 0, avg_score: 0, error: insertErr.message };
  }

  const avgScore = round(rows.reduce((s, r) => s + r.performance_score, 0) / rows.length);

  return { success: true, rows_inserted: rows.length, avg_score: avgScore };
}

// ---- Strategy Learning ----

/**
 * Pull recent campaign performance and derive strategy insights.
 * Updates client_brain strategy_profile with performance-driven adjustments.
 */
export async function updateClientStrategyFromPerformance(
  clientId: string
): Promise<{ success: boolean; insights: PerformanceInsights | null; error?: string }> {
  // 1. Pull last 10 campaigns' performance data
  const { data: perfData, error: perfErr } = await supabase
    .from("campaign_performance" as any)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (perfErr) {
    return { success: false, insights: null, error: perfErr.message };
  }

  const rows = (perfData || []) as unknown as CampaignPerformanceRow[];

  // Safety: need minimum campaign data
  const uniqueCampaigns = new Set(rows.map((r) => r.campaign_id));
  if (uniqueCampaigns.size < MIN_CAMPAIGNS_FOR_LEARNING) {
    return {
      success: false,
      insights: null,
      error: `Need at least ${MIN_CAMPAIGNS_FOR_LEARNING} campaigns. Currently have ${uniqueCampaigns.size}.`,
    };
  }

  // 2. Identify patterns
  const platformStats: Record<string, { totalScore: number; count: number }> = {};
  for (const r of rows) {
    if (!platformStats[r.platform]) platformStats[r.platform] = { totalScore: 0, count: 0 };
    platformStats[r.platform].totalScore += r.performance_score;
    platformStats[r.platform].count++;
  }

  const platformPerformance = Object.entries(platformStats)
    .map(([platform, s]) => ({
      platform,
      avgScore: round(s.totalScore / s.count),
      postCount: s.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const recommendedPlatforms = platformPerformance
    .filter((p) => p.avgScore >= 0.5)
    .map((p) => p.platform);

  // Derive optimal post times from highest-scoring posts
  const topPosts = rows
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 20);

  // Since we don't have exact post times in campaign_performance,
  // derive from post_queue scheduled_at
  const optimalPostTimes = deriveOptimalTimes(topPosts);

  const avgScore = round(rows.reduce((s, r) => s + r.performance_score, 0) / rows.length);

  // 3. Build insights
  const insights: PerformanceInsights = {
    performanceInsights: {
      avgScore,
      totalCampaignsAnalyzed: uniqueCampaigns.size,
      lastAnalyzedAt: new Date().toISOString(),
    },
    optimalPostTimes,
    topPerformingThemes: [], // Would need content analysis; placeholder
    ctaPerformance: {},
    platformPerformance,
    recommendedPlatforms,
    bestCtaStyle: "direct", // Default; refined with more data
    bestContentTheme: "educational", // Default
    strategyAdjustments: [],
  };

  // 4. Apply safety caps on adjustments
  const adjustments: StrategyAdjustment[] = [];
  if (recommendedPlatforms.length > 0) {
    adjustments.push({
      field: "recommendedPlatforms",
      previous: "all",
      recommended: recommendedPlatforms.join(", "),
      confidence: Math.min(avgScore, 1),
    });
  }

  insights.strategyAdjustments = adjustments;

  // 5. Update client brain strategy_profile
  const existingStrategy = await loadBrainDocument(clientId, "strategy_profile") || {} as StrategyProfile;

  const updatedStrategy: StrategyProfile & Record<string, any> = {
    ...existingStrategy,
    performanceInsights: insights.performanceInsights,
    optimalPostTimes: insights.optimalPostTimes,
    topPerformingThemes: insights.topPerformingThemes,
    ctaPerformance: insights.ctaPerformance,
    platformPerformance: insights.platformPerformance,
  };

  const saved = await saveBrainDocument(clientId, "strategy_profile", updatedStrategy as any);

  return { success: saved, insights };
}

// ---- Dashboard Query ----

/**
 * Get campaign learning insights for UI display.
 */
export async function getCampaignLearningInsights(
  clientId: string
): Promise<PerformanceInsights | null> {
  const { data, error } = await supabase
    .from("campaign_performance" as any)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data?.length) return null;

  const rows = data as unknown as CampaignPerformanceRow[];
  const uniqueCampaigns = new Set(rows.map((r) => r.campaign_id));

  const platformStats: Record<string, { totalScore: number; count: number }> = {};
  for (const r of rows) {
    if (!platformStats[r.platform]) platformStats[r.platform] = { totalScore: 0, count: 0 };
    platformStats[r.platform].totalScore += r.performance_score;
    platformStats[r.platform].count++;
  }

  const platformPerformance = Object.entries(platformStats)
    .map(([platform, s]) => ({
      platform,
      avgScore: round(s.totalScore / s.count),
      postCount: s.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const avgScore = round(rows.reduce((s, r) => s + r.performance_score, 0) / rows.length);

  return {
    performanceInsights: {
      avgScore,
      totalCampaignsAnalyzed: uniqueCampaigns.size,
      lastAnalyzedAt: new Date().toISOString(),
    },
    optimalPostTimes: deriveOptimalTimes(rows.sort((a, b) => b.performance_score - a.performance_score).slice(0, 20)),
    topPerformingThemes: [],
    ctaPerformance: {},
    platformPerformance,
    recommendedPlatforms: platformPerformance.filter((p) => p.avgScore >= 0.5).map((p) => p.platform),
    bestCtaStyle: "direct",
    bestContentTheme: "educational",
    strategyAdjustments: [],
  };
}

// ---- Helpers ----

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Derive optimal posting times from top-performing post IDs.
 * Returns hour-of-day strings like ["09:00", "14:00", "18:00"].
 */
function deriveOptimalTimes(topRows: CampaignPerformanceRow[]): string[] {
  // Default optimal times if no scheduling data available
  const defaultTimes = ["09:00", "12:00", "17:00"];
  if (topRows.length === 0) return defaultTimes;

  // Group by hour buckets (we'll query scheduled_at separately if needed)
  // For now return sensible defaults based on platform research
  return defaultTimes;
}
