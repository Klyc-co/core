import { supabase } from "@/integrations/supabase/client";
import type { ScopeRecommendation } from "./scopeEngine";

// ============================================================
// KLYC Prototype Engine
// Generates small experimental campaign batches to test
// hypotheses from the scope engine. Limited to 20 posts max.
// ============================================================

const MAX_EXPERIMENT_POSTS = 20;
const MAX_MONTHLY_EXPERIMENT_RATIO = 0.2; // 20% of total posts

export interface PrototypeResult {
  success: boolean;
  experiment_id?: string;
  posts_planned: number;
  hypothesis: string;
  error?: string;
}

/**
 * Generate prototype campaigns to test scope recommendations.
 */
export async function generatePrototypeCampaigns(
  clientId: string,
  recommendations: ScopeRecommendation[]
): Promise<PrototypeResult[]> {
  const results: PrototypeResult[] = [];

  // Safety: check monthly post count to enforce 20% experiment cap
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: totalMonthlyPosts } = await supabase
    .from("post_queue")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", monthAgo);

  const { count: experimentPosts } = await supabase
    .from("campaign_performance" as any)
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("experiment", true)
    .gte("created_at", monthAgo);

  const monthlyTotal = totalMonthlyPosts || 0;
  const existingExperiments = experimentPosts || 0;
  const maxAllowed = Math.max(5, Math.floor(monthlyTotal * MAX_MONTHLY_EXPERIMENT_RATIO));
  const remainingBudget = Math.max(0, maxAllowed - existingExperiments);

  if (remainingBudget <= 0) {
    return [{
      success: false,
      posts_planned: 0,
      hypothesis: "Experiment budget exhausted for this month",
      error: `Already have ${existingExperiments} experiment posts (max ${maxAllowed})`,
    }];
  }

  // Prioritize recommendations by confidence
  const sorted = [...recommendations].sort((a, b) => b.confidence - a.confidence);
  let budgetUsed = 0;

  for (const rec of sorted.slice(0, 3)) {
    if (budgetUsed >= remainingBudget) break;

    const postsForExperiment = Math.min(
      MAX_EXPERIMENT_POSTS,
      remainingBudget - budgetUsed,
      rec.type === "new_platform" ? 5 : 10
    );

    const hypothesis = `Test ${rec.type}: ${rec.title}`;

    // Create experiment record
    const { data: experiment, error } = await supabase
      .from("learning_experiments" as any)
      .insert({
        client_id: clientId,
        experiment_type: rec.type,
        hypothesis,
        posts_tested: postsForExperiment,
        status: "planned",
        results: {
          recommendation: rec,
          planned_posts: postsForExperiment,
        },
      } as any)
      .select("id")
      .single();

    if (error) {
      results.push({
        success: false,
        posts_planned: 0,
        hypothesis,
        error: error.message,
      });
      continue;
    }

    budgetUsed += postsForExperiment;

    results.push({
      success: true,
      experiment_id: (experiment as any)?.id,
      posts_planned: postsForExperiment,
      hypothesis,
    });
  }

  return results;
}
