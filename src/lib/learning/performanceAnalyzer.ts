import { supabase } from "@/integrations/supabase/client";
import { comparePredictedVsActualPerformance } from "@/lib/analytics/eventCollector";

// ============================================================
// KLYC Performance Analyzer
// Pulls post analytics, compares predictions vs actuals,
// computes accuracy metrics, and stores in campaign_performance.
// ============================================================

const ACCURACY_THRESHOLD = 0.15; // 15% variance = "accurate"

export interface PerformanceAnalysisResult {
  success: boolean;
  rows_inserted: number;
  avg_score: number;
  error?: string;
}

/**
 * Analyze campaign performance: pull posts, compare predictions vs actuals,
 * compute scores, and insert into campaign_performance.
 */
export async function analyzeCampaignPerformance(
  campaignId: string
): Promise<PerformanceAnalysisResult> {
  // 1. Pull all posts for this campaign
  const { data: posts, error: postsErr } = await supabase
    .from("post_queue")
    .select("id, user_id, client_id, content_type, scheduled_at, post_text")
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

  // 3. Build predictions array
  const predictions = analytics.map((a) => ({
    postQueueId: a.post_queue_id,
    platform: a.platform,
    predicted_engagement: 0,
  }));

  const comparisons = await comparePredictedVsActualPerformance(predictions);

  // 4. Build rows with enriched metadata
  const rows: any[] = [];

  for (const a of analytics) {
    const comparison = comparisons.find(
      (c) => c.post_id === a.post_queue_id && c.platform === a.platform
    );
    const post = posts.find((p) => p.id === a.post_queue_id);

    const actualEngagement = a.engagement_rate ?? 0;
    const predictedEngagement = comparison?.predicted_engagement ?? 0;
    const actualCtr = (a.impressions ?? 0) > 0 ? (a.clicks ?? 0) / (a.impressions ?? 1) : 0;

    // Accuracy calculations
    const engAccuracy = predictedEngagement > 0
      ? Math.max(0, 1 - Math.abs(actualEngagement - predictedEngagement) / Math.max(predictedEngagement, 1))
      : 0.5;
    const ctrAccuracy = 0.5;
    const convAccuracy = 0.5;

    const score = clamp(
      0.4 * engAccuracy + 0.3 * ctrAccuracy + 0.3 * convAccuracy,
      0, 1
    );

    // Derive metadata from post content
    const postText = post?.post_text || "";
    const postLength = postText.length;
    const postTheme = inferTheme(postText);
    const ctaType = inferCtaType(postText);

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
      engagement_accuracy: round(engAccuracy),
      ctr_accuracy: round(ctrAccuracy),
      conversion_accuracy: round(convAccuracy),
      performance_score: round(score),
      post_length: postLength,
      post_theme: postTheme,
      cta_type: ctaType,
      publish_time: post?.scheduled_at || null,
      experiment: false,
    });
  }

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

// ---- Content Analysis Helpers ----

function inferTheme(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("learn") || lower.includes("how to") || lower.includes("guide")) return "educational";
  if (lower.includes("sale") || lower.includes("discount") || lower.includes("offer")) return "promotional";
  if (lower.includes("story") || lower.includes("journey") || lower.includes("behind")) return "storytelling";
  if (lower.includes("tip") || lower.includes("hack") || lower.includes("trick")) return "tips";
  if (lower.includes("announce") || lower.includes("launch") || lower.includes("new")) return "announcement";
  return "general";
}

function inferCtaType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("click") || lower.includes("tap") || lower.includes("visit")) return "direct";
  if (lower.includes("comment") || lower.includes("share") || lower.includes("tag")) return "engagement";
  if (lower.includes("sign up") || lower.includes("subscribe") || lower.includes("join")) return "conversion";
  if (lower.includes("learn more") || lower.includes("read more") || lower.includes("discover")) return "soft";
  return "none";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
