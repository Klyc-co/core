import { supabase } from "@/integrations/supabase/client";

// ============================================================
// KLYC Pattern Discovery Engine
// Analyzes campaign_performance data to identify statistically
// significant patterns in platform, theme, CTA, timing, etc.
// ============================================================

export interface DiscoveredPattern {
  pattern_type: string;
  pattern_value: string;
  confidence_score: number;
  supporting_campaigns: number;
}

export interface PatternDiscoveryResult {
  success: boolean;
  patterns_discovered: number;
  patterns: DiscoveredPattern[];
  error?: string;
}

const MIN_CAMPAIGNS_FOR_PATTERNS = 3;
const MIN_CONFIDENCE = 0.4;

/**
 * Discover performance patterns from the last 20 campaigns.
 */
export async function discoverPerformancePatterns(
  clientId: string
): Promise<PatternDiscoveryResult> {
  const { data, error } = await supabase
    .from("campaign_performance" as any)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { success: false, patterns_discovered: 0, patterns: [], error: error.message };
  }

  const rows = (data || []) as any[];
  const uniqueCampaigns = new Set(rows.map((r) => r.campaign_id));

  if (uniqueCampaigns.size < MIN_CAMPAIGNS_FOR_PATTERNS) {
    return {
      success: false, patterns_discovered: 0, patterns: [],
      error: `Need ${MIN_CAMPAIGNS_FOR_PATTERNS} campaigns, have ${uniqueCampaigns.size}`,
    };
  }

  const patterns: DiscoveredPattern[] = [];
  const totalRows = rows.length;

  // ---- Platform patterns ----
  const platformStats = aggregateBy(rows, "platform", "performance_score");
  const bestPlatform = findBest(platformStats);
  if (bestPlatform) {
    patterns.push({
      pattern_type: "best_platform",
      pattern_value: bestPlatform.key,
      confidence_score: bestPlatform.confidence,
      supporting_campaigns: bestPlatform.count,
    });
  }

  // ---- Theme patterns ----
  const themeStats = aggregateBy(rows.filter((r) => r.post_theme), "post_theme", "performance_score");
  const bestTheme = findBest(themeStats);
  if (bestTheme) {
    patterns.push({
      pattern_type: "best_content_theme",
      pattern_value: bestTheme.key,
      confidence_score: bestTheme.confidence,
      supporting_campaigns: bestTheme.count,
    });
  }

  // ---- CTA patterns ----
  const ctaStats = aggregateBy(rows.filter((r) => r.cta_type), "cta_type", "performance_score");
  const bestCta = findBest(ctaStats);
  if (bestCta) {
    patterns.push({
      pattern_type: "best_cta",
      pattern_value: bestCta.key,
      confidence_score: bestCta.confidence,
      supporting_campaigns: bestCta.count,
    });
  }

  // ---- Post length patterns ----
  const lengthBuckets = rows
    .filter((r) => r.post_length > 0)
    .map((r) => ({
      ...r,
      length_bucket: r.post_length < 80 ? "short (<80)" :
        r.post_length < 150 ? "medium (80-150)" :
        r.post_length < 300 ? "long (150-300)" : "very_long (300+)",
    }));
  const lengthStats = aggregateBy(lengthBuckets, "length_bucket", "performance_score");
  const bestLength = findBest(lengthStats);
  if (bestLength) {
    patterns.push({
      pattern_type: "best_post_length",
      pattern_value: bestLength.key,
      confidence_score: bestLength.confidence,
      supporting_campaigns: bestLength.count,
    });
  }

  // ---- Time of day patterns ----
  const timeRows = rows
    .filter((r) => r.publish_time)
    .map((r) => {
      const hour = new Date(r.publish_time).getHours();
      return {
        ...r,
        time_bucket: hour < 9 ? "early_morning" :
          hour < 12 ? "morning" :
          hour < 15 ? "afternoon" :
          hour < 18 ? "late_afternoon" : "evening",
      };
    });
  const timeStats = aggregateBy(timeRows, "time_bucket", "performance_score");
  const bestTime = findBest(timeStats);
  if (bestTime) {
    patterns.push({
      pattern_type: "optimal_publish_time",
      pattern_value: bestTime.key,
      confidence_score: bestTime.confidence,
      supporting_campaigns: bestTime.count,
    });
  }

  // ---- Day of week patterns ----
  const dayRows = rows
    .filter((r) => r.publish_time)
    .map((r) => ({
      ...r,
      day_of_week: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(r.publish_time).getDay()],
    }));
  const dayStats = aggregateBy(dayRows, "day_of_week", "performance_score");
  const bestDay = findBest(dayStats);
  if (bestDay) {
    patterns.push({
      pattern_type: "highest_engagement_day",
      pattern_value: bestDay.key,
      confidence_score: bestDay.confidence,
      supporting_campaigns: bestDay.count,
    });
  }

  // ---- Insert high-confidence patterns ----
  const highConfidence = patterns.filter((p) => p.confidence_score >= MIN_CONFIDENCE);

  if (highConfidence.length > 0) {
    // Delete old patterns for this client first
    await supabase
      .from("learning_patterns" as any)
      .delete()
      .eq("client_id", clientId);

    await supabase
      .from("learning_patterns" as any)
      .insert(highConfidence.map((p) => ({
        client_id: clientId,
        pattern_type: p.pattern_type,
        pattern_value: p.pattern_value,
        confidence_score: p.confidence_score,
        supporting_campaigns: p.supporting_campaigns,
      })) as any);
  }

  return {
    success: true,
    patterns_discovered: highConfidence.length,
    patterns: highConfidence,
  };
}

// ---- Aggregation Helpers ----

interface AggStat {
  key: string;
  avgScore: number;
  count: number;
  confidence: number;
}

function aggregateBy(
  rows: any[],
  groupKey: string,
  scoreKey: string
): AggStat[] {
  const groups: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    const k = r[groupKey];
    if (!k) continue;
    if (!groups[k]) groups[k] = { total: 0, count: 0 };
    groups[k].total += r[scoreKey] ?? 0;
    groups[k].count++;
  }

  const totalRows = rows.length || 1;
  return Object.entries(groups).map(([key, s]) => ({
    key,
    avgScore: s.count > 0 ? s.total / s.count : 0,
    count: s.count,
    confidence: Math.min(1, (s.count / totalRows) * (s.count > 0 ? s.total / s.count : 0)),
  }));
}

function findBest(stats: AggStat[]): AggStat | null {
  if (stats.length === 0) return null;
  return stats.sort((a, b) => b.avgScore - a.avgScore)[0];
}
