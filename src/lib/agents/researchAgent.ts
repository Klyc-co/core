import type {
  SubmindMetricsOutput,
  SubmindMetric,
  RecommendedAction,
  ResearchSubmindInput,
} from "./types";

/**
 * Research Agent — evaluates trend relevance and competitor intelligence coverage.
 */
export function computeResearchMetrics(input: ResearchAgentInput): AgentMetricsOutput {
  const metrics: AgentMetric[] = [];
  const actions: RecommendedAction[] = [];

  // ── Topic Trend Score ──
  // Weighted average: higher rank = higher score, volume adds bonus
  const trendScores = input.trendScores.map((t) => {
    const rankScore = t.rank ? Math.max(0, 1 - (t.rank - 1) / 20) : 0.3;
    const volumeBonus = parseVolumeBonus(t.volume);
    return Math.min(1, rankScore + volumeBonus);
  });
  const avgTrendScore = trendScores.length > 0
    ? trendScores.reduce((a, b) => a + b, 0) / trendScores.length
    : 0;

  metrics.push({
    metric: "topic_trend_score",
    value: round(avgTrendScore),
    unit: "0-1 scale",
    sql_query: `SELECT trend_name, trend_rank, trend_volume FROM social_trends WHERE user_id = $1 ORDER BY scraped_at DESC LIMIT 20`,
  });

  if (avgTrendScore < 0.3) {
    actions.push({
      priority: "high",
      action: "Refresh trend data — current topics have low relevance scores",
      reason: `Average trend score is ${round(avgTrendScore)}, indicating stale or low-impact topics.`,
    });
  }

  // ── Competitor Coverage Score ──
  const analyzedCount = input.competitors.filter((c) => c.hasSwot).length;
  const coverageScore = input.totalCompetitorCount > 0
    ? analyzedCount / input.totalCompetitorCount
    : 0;

  metrics.push({
    metric: "competitor_coverage_score",
    value: round(coverageScore),
    unit: "0-1 scale",
    sql_query: `SELECT competitor_name, analyzed_at FROM competitor_analyses WHERE user_id = $1 ORDER BY analyzed_at DESC`,
  });

  if (coverageScore < 0.5) {
    actions.push({
      priority: "medium",
      action: `Analyze ${input.totalCompetitorCount - analyzedCount} more competitors to reach 80% coverage`,
      reason: `Only ${Math.round(coverageScore * 100)}% of known competitors have SWOT analyses.`,
    });
  }

  // ── Freshness Score ──
  const now = Date.now();
  const staleDays = input.competitors
    .filter((c) => c.analyzedAt)
    .map((c) => (now - new Date(c.analyzedAt).getTime()) / 86400000);
  const avgStaleDays = staleDays.length > 0 ? staleDays.reduce((a, b) => a + b, 0) / staleDays.length : 999;
  const freshnessScore = Math.max(0, Math.min(1, 1 - avgStaleDays / 90));

  metrics.push({
    metric: "intelligence_freshness_score",
    value: round(freshnessScore),
    unit: "0-1 scale",
    sql_query: `SELECT competitor_name, analyzed_at, NOW() - analyzed_at AS age FROM competitor_analyses WHERE user_id = $1`,
  });

  if (freshnessScore < 0.4) {
    actions.push({
      priority: "high",
      action: "Re-analyze competitors — intelligence data is over 60 days old",
      reason: `Average analysis age is ${Math.round(avgStaleDays)} days.`,
    });
  }

  return {
    agentRole: "research",
    metrics,
    recommended_actions: actions,
    generatedAt: new Date().toISOString(),
  };
}

function parseVolumeBonus(volume: string | null): number {
  if (!volume) return 0;
  const num = parseFloat(volume.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  const isMillions = volume.toLowerCase().includes("m");
  const isThousands = volume.toLowerCase().includes("k");
  const absolute = isMillions ? num * 1_000_000 : isThousands ? num * 1_000 : num;
  return Math.min(0.3, absolute / 10_000_000);
}

function round(n: number, decimals = 3): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
