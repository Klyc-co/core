import { supabase } from "@/integrations/supabase/client";

// ============================================================
// KLYC Learning Dashboard API
// Exposes learning insights for analytics dashboards.
// ============================================================

export interface LearningInsights {
  performance: {
    avgScore: number;
    totalCampaigns: number;
    totalPosts: number;
  };
  topPlatforms: Array<{ platform: string; avgScore: number; postCount: number }>;
  bestThemes: Array<{ theme: string; avgScore: number; count: number }>;
  bestCtas: Array<{ cta: string; avgScore: number; count: number }>;
  optimalTimes: Array<{ timeBucket: string; avgScore: number; count: number }>;
  activeExperiments: Array<{ id: string; type: string; hypothesis: string; status: string; postsPlanned: number }>;
  winningStrategies: Array<{ type: string; value: string; confidence: number }>;
  pendingStrategyUpdates: number;
}

/**
 * Get comprehensive learning insights for a client.
 */
export async function getLearningInsights(
  clientId: string
): Promise<LearningInsights | null> {
  // Fetch performance data, patterns, experiments, and strategy updates in parallel
  const [perfResult, patternsResult, experimentsResult, updatesResult] = await Promise.all([
    supabase
      .from("campaign_performance" as any)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("learning_patterns" as any)
      .select("*")
      .eq("client_id", clientId),
    supabase
      .from("learning_experiments" as any)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("strategy_updates" as any)
      .select("id, approved")
      .eq("client_id", clientId)
      .eq("approved", false),
  ]);

  const rows = (perfResult.data || []) as any[];
  const patterns = (patternsResult.data || []) as any[];
  const experiments = (experimentsResult.data || []) as any[];
  const pendingUpdates = (updatesResult.data || []) as any[];

  if (rows.length === 0) return null;

  const uniqueCampaigns = new Set(rows.map((r) => r.campaign_id));
  const avgScore = rows.reduce((s, r) => s + (r.performance_score || 0), 0) / rows.length;

  // Platform breakdown
  const platformMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    if (!platformMap[r.platform]) platformMap[r.platform] = { total: 0, count: 0 };
    platformMap[r.platform].total += r.performance_score || 0;
    platformMap[r.platform].count++;
  }
  const topPlatforms = Object.entries(platformMap)
    .map(([platform, s]) => ({ platform, avgScore: round(s.total / s.count), postCount: s.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Theme breakdown
  const themeMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows.filter((r) => r.post_theme)) {
    if (!themeMap[r.post_theme]) themeMap[r.post_theme] = { total: 0, count: 0 };
    themeMap[r.post_theme].total += r.performance_score || 0;
    themeMap[r.post_theme].count++;
  }
  const bestThemes = Object.entries(themeMap)
    .map(([theme, s]) => ({ theme, avgScore: round(s.total / s.count), count: s.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // CTA breakdown
  const ctaMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows.filter((r) => r.cta_type)) {
    if (!ctaMap[r.cta_type]) ctaMap[r.cta_type] = { total: 0, count: 0 };
    ctaMap[r.cta_type].total += r.performance_score || 0;
    ctaMap[r.cta_type].count++;
  }
  const bestCtas = Object.entries(ctaMap)
    .map(([cta, s]) => ({ cta, avgScore: round(s.total / s.count), count: s.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Time breakdown
  const timeMap: Record<string, { total: number; count: number }> = {};
  for (const r of rows.filter((r) => r.publish_time)) {
    const hour = new Date(r.publish_time).getHours();
    const bucket = hour < 9 ? "early_morning" : hour < 12 ? "morning" : hour < 15 ? "afternoon" : hour < 18 ? "late_afternoon" : "evening";
    if (!timeMap[bucket]) timeMap[bucket] = { total: 0, count: 0 };
    timeMap[bucket].total += r.performance_score || 0;
    timeMap[bucket].count++;
  }
  const optimalTimes = Object.entries(timeMap)
    .map(([timeBucket, s]) => ({ timeBucket, avgScore: round(s.total / s.count), count: s.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Active experiments
  const activeExperiments = experiments
    .filter((e) => e.status !== "completed" && e.status !== "cancelled")
    .map((e) => ({
      id: e.id,
      type: e.experiment_type,
      hypothesis: e.hypothesis || "",
      status: e.status,
      postsPlanned: e.posts_tested || 0,
    }));

  // Winning strategies from patterns
  const winningStrategies = patterns
    .filter((p) => p.confidence_score >= 0.7)
    .map((p) => ({
      type: p.pattern_type,
      value: p.pattern_value,
      confidence: p.confidence_score,
    }));

  return {
    performance: {
      avgScore: round(avgScore),
      totalCampaigns: uniqueCampaigns.size,
      totalPosts: rows.length,
    },
    topPlatforms,
    bestThemes,
    bestCtas,
    optimalTimes,
    activeExperiments,
    winningStrategies,
    pendingStrategyUpdates: pendingUpdates.length,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
