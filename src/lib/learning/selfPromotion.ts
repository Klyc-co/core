import { supabase } from "@/integrations/supabase/client";

// ============================================================
// KLYC Self-Promotion System
// Detects when AI/automation content performs well system-wide
// and creates internal promotional campaigns for KLYC.
// ============================================================

const SELF_PROMO_THEMES = [
  "AI marketing",
  "social automation",
  "campaign scaling",
  "marketing intelligence",
];

const PERFORMANCE_THRESHOLD = 0.7;
const MIN_DATA_POINTS = 10;

export interface SelfPromoResult {
  should_promote: boolean;
  best_themes: string[];
  avg_score: number;
  data_points: number;
}

/**
 * Analyze system-wide performance for KLYC-relevant themes.
 * Returns whether self-promotion campaigns should be created.
 */
export async function detectSelfPromotionOpportunity(): Promise<SelfPromoResult> {
  const { data, error } = await supabase
    .from("campaign_performance" as any)
    .select("post_theme, performance_score")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) {
    return { should_promote: false, best_themes: [], avg_score: 0, data_points: 0 };
  }

  const rows = data as any[];

  // Filter for AI/automation related themes
  const relevantRows = rows.filter((r) => {
    const theme = (r.post_theme || "").toLowerCase();
    return SELF_PROMO_THEMES.some((t) => theme.includes(t.toLowerCase())) ||
      theme.includes("ai") ||
      theme.includes("automation") ||
      theme.includes("marketing");
  });

  if (relevantRows.length < MIN_DATA_POINTS) {
    return {
      should_promote: false,
      best_themes: [],
      avg_score: 0,
      data_points: relevantRows.length,
    };
  }

  const avgScore = relevantRows.reduce((s, r) => s + (r.performance_score || 0), 0) / relevantRows.length;

  // Find which themes perform best
  const themeScores: Record<string, { total: number; count: number }> = {};
  for (const r of relevantRows) {
    const theme = r.post_theme || "general";
    if (!themeScores[theme]) themeScores[theme] = { total: 0, count: 0 };
    themeScores[theme].total += r.performance_score || 0;
    themeScores[theme].count++;
  }

  const bestThemes = Object.entries(themeScores)
    .map(([theme, s]) => ({ theme, avg: s.total / s.count }))
    .filter((t) => t.avg >= PERFORMANCE_THRESHOLD)
    .sort((a, b) => b.avg - a.avg)
    .map((t) => t.theme);

  return {
    should_promote: avgScore >= PERFORMANCE_THRESHOLD && bestThemes.length > 0,
    best_themes: bestThemes,
    avg_score: Math.round(avgScore * 1000) / 1000,
    data_points: relevantRows.length,
  };
}
