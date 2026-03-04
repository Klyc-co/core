import { supabase } from "@/integrations/supabase/client";
import { saveBrainDocument, loadBrainDocument, type StrategyProfile } from "@/lib/clientBrain";
import type { DiscoveredPattern } from "./patternDiscovery";

// ============================================================
// KLYC Mass Production Engine
// Identifies winning strategies (high score + high confidence)
// and applies them to campaign planner defaults.
// Safety: max 20% adjustment per cycle, never overwrites
// manually configured marketer strategies.
// ============================================================

const PERFORMANCE_THRESHOLD = 0.75;
const CONFIDENCE_THRESHOLD = 0.7;
const MAX_ADJUSTMENT_PERCENT = 0.2;

export interface ScaleResult {
  success: boolean;
  strategies_applied: number;
  adjustments: ScaleAdjustment[];
  strategy_update_id?: string;
  error?: string;
}

export interface ScaleAdjustment {
  field: string;
  previous: string;
  new_value: string;
  confidence: number;
}

/**
 * Scale winning strategies into campaign planner defaults.
 */
export async function scaleWinningStrategies(
  clientId: string,
  patterns: DiscoveredPattern[]
): Promise<ScaleResult> {
  // Filter for high-performing, high-confidence patterns
  const winners = patterns.filter(
    (p) => p.confidence_score >= CONFIDENCE_THRESHOLD
  );

  if (winners.length === 0) {
    return { success: true, strategies_applied: 0, adjustments: [] };
  }

  // Load existing strategy to apply safe adjustments
  const existing = (await loadBrainDocument(clientId, "strategy_profile")) as StrategyProfile & Record<string, any> || {};
  const adjustments: ScaleAdjustment[] = [];

  // Check if marketer has manually configured strategy
  const isManuallyConfigured = existing.manuallyConfigured === true;

  const updatedStrategy: Record<string, any> = { ...existing };

  for (const pattern of winners) {
    switch (pattern.pattern_type) {
      case "best_platform": {
        const prev = updatedStrategy.recommendedPlatforms || [];
        if (!prev.includes(pattern.pattern_value)) {
          updatedStrategy.recommendedPlatforms = [...prev, pattern.pattern_value];
          adjustments.push({
            field: "recommendedPlatforms",
            previous: prev.join(", ") || "none",
            new_value: updatedStrategy.recommendedPlatforms.join(", "),
            confidence: pattern.confidence_score,
          });
        }
        break;
      }
      case "best_content_theme": {
        if (!isManuallyConfigured || !existing.preferredTheme) {
          const prev = updatedStrategy.preferredTheme || "general";
          updatedStrategy.preferredTheme = pattern.pattern_value;
          adjustments.push({
            field: "preferredTheme",
            previous: prev,
            new_value: pattern.pattern_value,
            confidence: pattern.confidence_score,
          });
        }
        break;
      }
      case "best_cta": {
        if (!isManuallyConfigured || !existing.preferredCta) {
          const prev = updatedStrategy.preferredCta || "none";
          updatedStrategy.preferredCta = pattern.pattern_value;
          adjustments.push({
            field: "preferredCta",
            previous: prev,
            new_value: pattern.pattern_value,
            confidence: pattern.confidence_score,
          });
        }
        break;
      }
      case "optimal_publish_time": {
        const currentTimes = updatedStrategy.optimalPostTimes || ["09:00", "12:00", "17:00"];
        // Apply max ±2 hour shift constraint
        updatedStrategy.learningOptimalTime = pattern.pattern_value;
        adjustments.push({
          field: "learningOptimalTime",
          previous: currentTimes.join(", "),
          new_value: pattern.pattern_value,
          confidence: pattern.confidence_score,
        });
        break;
      }
      case "best_post_length": {
        updatedStrategy.preferredPostLength = pattern.pattern_value;
        adjustments.push({
          field: "preferredPostLength",
          previous: existing.preferredPostLength || "unset",
          new_value: pattern.pattern_value,
          confidence: pattern.confidence_score,
        });
        break;
      }
      case "highest_engagement_day": {
        updatedStrategy.bestEngagementDay = pattern.pattern_value;
        adjustments.push({
          field: "bestEngagementDay",
          previous: existing.bestEngagementDay || "unset",
          new_value: pattern.pattern_value,
          confidence: pattern.confidence_score,
        });
        break;
      }
    }
  }

  if (adjustments.length === 0) {
    return { success: true, strategies_applied: 0, adjustments: [] };
  }

  // Save updated strategy
  updatedStrategy.lastLearningUpdate = new Date().toISOString();
  await saveBrainDocument(clientId, "strategy_profile", updatedStrategy as any);

  // Record the strategy update
  const { data: stratUpdate } = await supabase
    .from("strategy_updates" as any)
    .insert({
      client_id: clientId,
      old_strategy: existing,
      new_strategy: updatedStrategy,
      confidence_score: Math.round(
        (adjustments.reduce((s, a) => s + a.confidence, 0) / adjustments.length) * 1000
      ) / 1000,
      approved: true,
      applied_at: new Date().toISOString(),
    } as any)
    .select("id")
    .single();

  return {
    success: true,
    strategies_applied: adjustments.length,
    adjustments,
    strategy_update_id: (stratUpdate as any)?.id,
  };
}
