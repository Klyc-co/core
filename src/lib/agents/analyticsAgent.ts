import type {
  AgentMetricsOutput,
  AgentMetric,
  RecommendedAction,
  AnalyticsAgentInput,
} from "./types";

/**
 * Analytics Agent — computes post-publish performance metrics.
 */
export function computeAnalyticsMetrics(input: AnalyticsAgentInput): AgentMetricsOutput {
  const metrics: AgentMetric[] = [];
  const actions: RecommendedAction[] = [];

  // ── Engagement Rate ──
  const totalEngagements = input.likes + input.comments + input.shares + input.saves;
  const engagementRate = input.impressions > 0 ? totalEngagements / input.impressions : 0;
  metrics.push({
    metric: "engagement_rate",
    value: round(engagementRate),
    unit: "ratio",
    sql_query: `SELECT engagement_rate FROM post_analytics WHERE post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1 AND campaign_draft_id = '${input.campaignId}')`,
  });

  if (engagementRate < 0.02) {
    actions.push({
      priority: "high",
      action: "Engagement rate is below 2% — review content strategy and posting times",
      reason: `Current rate: ${round(engagementRate * 100)}%`,
    });
  }

  // ── Click-Through Rate (CTR) ──
  const ctr = input.impressions > 0 ? input.clicks / input.impressions : 0;
  metrics.push({
    metric: "ctr",
    value: round(ctr),
    unit: "ratio",
    sql_query: `SELECT clicks, impressions FROM post_analytics WHERE post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1)`,
  });

  if (ctr < 0.01) {
    actions.push({
      priority: "medium",
      action: "CTR below 1% — strengthen call-to-action or link placement",
      reason: `Click-through rate is ${round(ctr * 100)}%.`,
    });
  }

  // ── Save Rate ──
  const saveRate = input.impressions > 0 ? input.saves / input.impressions : 0;
  metrics.push({
    metric: "save_rate",
    value: round(saveRate),
    unit: "ratio",
    sql_query: `SELECT saves, impressions FROM post_analytics WHERE post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1)`,
  });

  if (saveRate > 0.03) {
    actions.push({
      priority: "low",
      action: "High save rate detected — this content format resonates for bookmarking. Replicate it.",
      reason: `Save rate of ${round(saveRate * 100)}% exceeds the 3% benchmark.`,
    });
  }

  // ── Share Rate ──
  const shareRate = input.impressions > 0 ? input.shares / input.impressions : 0;
  metrics.push({
    metric: "share_rate",
    value: round(shareRate),
    unit: "ratio",
    sql_query: `SELECT shares, impressions FROM post_analytics WHERE post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1)`,
  });

  if (shareRate < 0.005) {
    actions.push({
      priority: "medium",
      action: "Low share rate — make content more relatable or add a shareable hook",
      reason: `Share rate: ${round(shareRate * 100)}%.`,
    });
  }

  // ── View-to-Engagement Ratio ──
  const viewToEngagement = input.views > 0 ? totalEngagements / input.views : 0;
  metrics.push({
    metric: "view_to_engagement_ratio",
    value: round(viewToEngagement),
    unit: "ratio",
    sql_query: `SELECT views, likes, comments, shares, saves FROM post_analytics WHERE post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1) ORDER BY fetched_at DESC`,
  });

  // ── Reach Efficiency ──
  const reachEfficiency = input.impressions > 0 ? input.reach / input.impressions : 0;
  metrics.push({
    metric: "reach_efficiency",
    value: round(reachEfficiency),
    unit: "ratio",
    sql_query: `SELECT reach, impressions FROM post_analytics WHERE post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1)`,
  });

  return {
    agentRole: "analytics",
    metrics,
    recommended_actions: actions,
    generatedAt: new Date().toISOString(),
  };
}

function round(n: number, decimals = 3): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
