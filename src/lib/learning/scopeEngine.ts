import { supabase } from "@/integrations/supabase/client";
import type { DiscoveredPattern } from "./patternDiscovery";

// ============================================================
// KLYC Scope Engine
// Combines learning patterns, trend data, and competitor
// analysis to discover new campaign opportunities.
// ============================================================

export interface ScopeRecommendation {
  type: "new_platform" | "emerging_topic" | "content_gap" | "cta_experiment" | "theme_experiment";
  title: string;
  description: string;
  confidence: number;
  source: string;
}

export interface ScopeResult {
  success: boolean;
  recommendations: ScopeRecommendation[];
  strategy_update_id?: string;
  error?: string;
}

const ALL_PLATFORMS = ["instagram", "linkedin", "twitter", "tiktok", "youtube", "facebook"];

/**
 * Scope new campaign opportunities by combining patterns, trends, and competitor data.
 */
export async function scopeNewOpportunities(
  clientId: string,
  existingPatterns: DiscoveredPattern[]
): Promise<ScopeResult> {
  const recommendations: ScopeRecommendation[] = [];

  try {
    // 1. Platform gap analysis
    const usedPlatforms = existingPatterns
      .filter((p) => p.pattern_type === "best_platform")
      .map((p) => p.pattern_value.toLowerCase());

    const untestedPlatforms = ALL_PLATFORMS.filter(
      (p) => !usedPlatforms.includes(p)
    );

    for (const platform of untestedPlatforms.slice(0, 2)) {
      recommendations.push({
        type: "new_platform",
        title: `Try ${platform}`,
        description: `No performance data on ${platform}. Consider running a small test campaign.`,
        confidence: 0.3,
        source: "pattern_gap_analysis",
      });
    }

    // 2. Trend-based opportunities
    const { data: trends } = await supabase
      .from("social_trends")
      .select("trend_name, platform, trend_category")
      .order("scraped_at", { ascending: false })
      .limit(20);

    if (trends?.length) {
      const topTrends = trends.slice(0, 3);
      for (const trend of topTrends) {
        recommendations.push({
          type: "emerging_topic",
          title: `Trending: ${trend.trend_name}`,
          description: `Trending on ${trend.platform}${trend.trend_category ? ` in ${trend.trend_category}` : ""}. Consider creating related content.`,
          confidence: 0.5,
          source: "trend_monitor",
        });
      }
    }

    // 3. Competitor content gaps
    const { data: competitors } = await supabase
      .from("competitor_analyses")
      .select("competitor_name, marketing_channels, weaknesses, opportunities")
      .order("analyzed_at", { ascending: false })
      .limit(5);

    if (competitors?.length) {
      for (const comp of competitors.slice(0, 2)) {
        if (comp.opportunities) {
          recommendations.push({
            type: "content_gap",
            title: `Gap vs ${comp.competitor_name}`,
            description: comp.opportunities.slice(0, 200),
            confidence: 0.6,
            source: "competitor_analysis",
          });
        }
      }
    }

    // 4. CTA experimentation based on weak patterns
    const ctaPattern = existingPatterns.find((p) => p.pattern_type === "best_cta");
    const ctaTypes = ["direct", "engagement", "conversion", "soft", "educational"];
    const untestedCtas = ctaTypes.filter(
      (c) => c !== ctaPattern?.pattern_value
    );

    if (untestedCtas.length > 0) {
      recommendations.push({
        type: "cta_experiment",
        title: `Test CTA: ${untestedCtas[0]}`,
        description: `Current best CTA is "${ctaPattern?.pattern_value || "unknown"}". Try "${untestedCtas[0]}" style.`,
        confidence: 0.4,
        source: "pattern_gap_analysis",
      });
    }

    // 5. Store as pending strategy update
    if (recommendations.length > 0) {
      const { data: inserted } = await supabase
        .from("strategy_updates" as any)
        .insert({
          client_id: clientId,
          old_strategy: { patterns: existingPatterns },
          new_strategy: { recommendations },
          confidence_score: avgConfidence(recommendations),
          approved: false,
        } as any)
        .select("id")
        .single();

      return {
        success: true,
        recommendations,
        strategy_update_id: (inserted as any)?.id,
      };
    }

    return { success: true, recommendations };
  } catch (err) {
    return {
      success: false,
      recommendations,
      error: err instanceof Error ? err.message : "Scope analysis failed",
    };
  }
}

function avgConfidence(recs: ScopeRecommendation[]): number {
  if (recs.length === 0) return 0;
  return Math.round((recs.reduce((s, r) => s + r.confidence, 0) / recs.length) * 1000) / 1000;
}
