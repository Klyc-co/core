import { supabase } from "@/integrations/supabase/client";
import { saveBrainDocument, loadBrainDocument, type StrategyProfile } from "@/lib/clientBrain";

// ============================================================
// KLYC Strategy Learning (Legacy)
// Retained for backward compatibility.
// New code should use the specialized modules.
// ============================================================

const MIN_CAMPAIGNS_FOR_LEARNING = 3;

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

export async function updateClientStrategyFromPerformance(
  clientId: string
): Promise<{ success: boolean; insights: PerformanceInsights | null; error?: string }> {
  const { data: perfData, error: perfErr } = await supabase
    .from("campaign_performance" as any)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (perfErr) return { success: false, insights: null, error: perfErr.message };

  const rows = (perfData || []) as unknown as CampaignPerformanceRow[];
  const uniqueCampaigns = new Set(rows.map((r) => r.campaign_id));

  if (uniqueCampaigns.size < MIN_CAMPAIGNS_FOR_LEARNING) {
    return { success: false, insights: null, error: `Need ${MIN_CAMPAIGNS_FOR_LEARNING} campaigns. Have ${uniqueCampaigns.size}.` };
  }

  const platformStats: Record<string, { totalScore: number; count: number }> = {};
  for (const r of rows) {
    if (!platformStats[r.platform]) platformStats[r.platform] = { totalScore: 0, count: 0 };
    platformStats[r.platform].totalScore += r.performance_score;
    platformStats[r.platform].count++;
  }

  const platformPerformance = Object.entries(platformStats)
    .map(([platform, s]) => ({ platform, avgScore: round(s.totalScore / s.count), postCount: s.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const recommendedPlatforms = platformPerformance.filter((p) => p.avgScore >= 0.5).map((p) => p.platform);
  const avgScore = round(rows.reduce((s, r) => s + r.performance_score, 0) / rows.length);

  const insights: PerformanceInsights = {
    performanceInsights: { avgScore, totalCampaignsAnalyzed: uniqueCampaigns.size, lastAnalyzedAt: new Date().toISOString() },
    optimalPostTimes: ["09:00", "12:00", "17:00"],
    topPerformingThemes: [],
    ctaPerformance: {},
    platformPerformance,
    recommendedPlatforms,
    bestCtaStyle: "direct",
    bestContentTheme: "educational",
    strategyAdjustments: [],
  };

  const existingStrategy = await loadBrainDocument(clientId, "strategy_profile") || {} as StrategyProfile;
  const updatedStrategy: StrategyProfile & Record<string, any> = {
    ...existingStrategy,
    performanceInsights: insights.performanceInsights,
    optimalPostTimes: insights.optimalPostTimes,
    platformPerformance: insights.platformPerformance,
  };

  const saved = await saveBrainDocument(clientId, "strategy_profile", updatedStrategy as any);
  return { success: saved, insights };
}

export async function getCampaignLearningInsights(clientId: string): Promise<PerformanceInsights | null> {
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
    .map(([platform, s]) => ({ platform, avgScore: round(s.totalScore / s.count), postCount: s.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const avgScore = round(rows.reduce((s, r) => s + r.performance_score, 0) / rows.length);

  return {
    performanceInsights: { avgScore, totalCampaignsAnalyzed: uniqueCampaigns.size, lastAnalyzedAt: new Date().toISOString() },
    optimalPostTimes: ["09:00", "12:00", "17:00"],
    topPerformingThemes: [],
    ctaPerformance: {},
    platformPerformance,
    recommendedPlatforms: platformPerformance.filter((p) => p.avgScore >= 0.5).map((p) => p.platform),
    bestCtaStyle: "direct",
    bestContentTheme: "educational",
    strategyAdjustments: [],
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
