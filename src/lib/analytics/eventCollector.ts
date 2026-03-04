import { supabase } from "@/integrations/supabase/client";

// ============================================================
// KLYC Analytics Event Collector
// Tracks post performance and compares predicted vs actual.
// ============================================================

export interface AnalyticsEvent {
  post_id: string;
  platform: string;
  impressions: number;
  clicks: number;
  engagement_rate: number;
  timestamp: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
}

export interface CampaignMetricsSummary {
  campaign_id: string;
  total_posts: number;
  total_impressions: number;
  total_clicks: number;
  avg_engagement_rate: number;
  platform_breakdown: Record<string, PlatformMetrics>;
  updated_at: string;
}

export interface PlatformMetrics {
  impressions: number;
  clicks: number;
  avg_engagement_rate: number;
  post_count: number;
}

export interface PredictionComparison {
  post_id: string;
  platform: string;
  predicted_engagement: number;
  actual_engagement: number;
  delta: number;
  delta_percent: number;
  accuracy_label: "accurate" | "over" | "under";
}

/**
 * Record a single analytics event for a published post.
 * Writes to post_analytics via edge function (service-role only table).
 */
export async function recordAnalyticsEvent(
  event: AnalyticsEvent,
  postQueueId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke("record-post-analytics", {
    body: {
      post_queue_id: postQueueId,
      platform: event.platform,
      views: event.views ?? 0,
      likes: event.likes ?? 0,
      comments: event.comments ?? 0,
      shares: event.shares ?? 0,
      saves: event.saves ?? 0,
      clicks: event.clicks,
      impressions: event.impressions,
      reach: event.reach ?? 0,
      engagement_rate: event.engagement_rate,
    },
  });

  if (error) {
    console.error("Failed to record analytics event:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Aggregate campaign-level metrics from individual post analytics.
 */
export async function updateCampaignMetrics(
  campaignPostIds: string[],
  campaignId: string
): Promise<CampaignMetricsSummary> {
  const platformBreakdown: Record<string, PlatformMetrics> = {};
  let totalImpressions = 0;
  let totalClicks = 0;
  let engagementSum = 0;
  let totalPosts = 0;

  // Fetch analytics for all posts in the campaign (batched to avoid 1000 row limit)
  const batchSize = 50;
  for (let i = 0; i < campaignPostIds.length; i += batchSize) {
    const batch = campaignPostIds.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("post_analytics")
      .select("platform, impressions, clicks, engagement_rate, views, likes, comments, shares, saves, reach")
      .in("post_queue_id", batch);

    if (error) {
      console.error("Failed to fetch analytics batch:", error.message);
      continue;
    }

    for (const row of data || []) {
      const p = row.platform;
      if (!platformBreakdown[p]) {
        platformBreakdown[p] = { impressions: 0, clicks: 0, avg_engagement_rate: 0, post_count: 0 };
      }

      const imp = row.impressions ?? 0;
      const clk = row.clicks ?? 0;
      const eng = row.engagement_rate ?? 0;

      platformBreakdown[p].impressions += imp;
      platformBreakdown[p].clicks += clk;
      platformBreakdown[p].avg_engagement_rate += eng;
      platformBreakdown[p].post_count++;

      totalImpressions += imp;
      totalClicks += clk;
      engagementSum += eng;
      totalPosts++;
    }
  }

  // Compute averages
  for (const metrics of Object.values(platformBreakdown)) {
    if (metrics.post_count > 0) {
      metrics.avg_engagement_rate = round(metrics.avg_engagement_rate / metrics.post_count);
    }
  }

  return {
    campaign_id: campaignId,
    total_posts: totalPosts,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    avg_engagement_rate: totalPosts > 0 ? round(engagementSum / totalPosts) : 0,
    platform_breakdown: platformBreakdown,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Compare predicted engagement (from Social Agent) against actual performance.
 */
export async function comparePredictedVsActualPerformance(
  predictions: Array<{ postQueueId: string; platform: string; predicted_engagement: number }>
): Promise<PredictionComparison[]> {
  if (predictions.length === 0) return [];

  const ids = predictions.map((p) => p.postQueueId);

  const { data, error } = await supabase
    .from("post_analytics")
    .select("post_queue_id, platform, engagement_rate")
    .in("post_queue_id", ids);

  if (error) {
    console.error("Failed to fetch actuals for comparison:", error.message);
    return [];
  }

  const actualMap = new Map<string, number>();
  for (const row of data || []) {
    actualMap.set(`${row.post_queue_id}_${row.platform}`, row.engagement_rate ?? 0);
  }

  return predictions.map((pred) => {
    const key = `${pred.postQueueId}_${pred.platform}`;
    const actual = actualMap.get(key) ?? 0;
    const delta = actual - pred.predicted_engagement;
    const deltaPercent = pred.predicted_engagement > 0
      ? round((delta / pred.predicted_engagement) * 100)
      : 0;

    let accuracy_label: PredictionComparison["accuracy_label"] = "accurate";
    if (deltaPercent > 15) accuracy_label = "under";
    else if (deltaPercent < -15) accuracy_label = "over";

    return {
      post_id: pred.postQueueId,
      platform: pred.platform,
      predicted_engagement: pred.predicted_engagement,
      actual_engagement: actual,
      delta: round(delta),
      delta_percent: deltaPercent,
      accuracy_label,
    };
  });
}

// ---- Helpers ----

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
