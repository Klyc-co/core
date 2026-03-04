// ============================================================
// KLYC Token Usage Monitor
// Pre-flight cost estimation and budget enforcement for
// the orchestrator before running agents.
// ============================================================

// ---- Model pricing (per 1K tokens) ----

export interface ModelPricing {
  modelId: string;
  inputPer1K: number;
  outputPer1K: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "google/gemini-3-flash-preview": { modelId: "google/gemini-3-flash-preview", inputPer1K: 0.00015, outputPer1K: 0.0006 },
  "google/gemini-2.5-flash": { modelId: "google/gemini-2.5-flash", inputPer1K: 0.00015, outputPer1K: 0.0006 },
  "google/gemini-2.5-flash-lite": { modelId: "google/gemini-2.5-flash-lite", inputPer1K: 0.0001, outputPer1K: 0.0004 },
  "google/gemini-2.5-pro": { modelId: "google/gemini-2.5-pro", inputPer1K: 0.00125, outputPer1K: 0.005 },
  "google/gemini-3-pro-preview": { modelId: "google/gemini-3-pro-preview", inputPer1K: 0.00125, outputPer1K: 0.005 },
  "openai/gpt-5": { modelId: "openai/gpt-5", inputPer1K: 0.005, outputPer1K: 0.015 },
  "openai/gpt-5-mini": { modelId: "openai/gpt-5-mini", inputPer1K: 0.0004, outputPer1K: 0.0016 },
  "openai/gpt-5-nano": { modelId: "openai/gpt-5-nano", inputPer1K: 0.0001, outputPer1K: 0.0004 },
  "openai/gpt-5.2": { modelId: "openai/gpt-5.2", inputPer1K: 0.005, outputPer1K: 0.015 },
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

// ---- Average token estimates per agent task ----

export interface AgentTokenProfile {
  agentRole: string;
  avgInputTokens: number;
  avgOutputTokens: number;
}

const AGENT_TOKEN_PROFILES: Record<string, AgentTokenProfile> = {
  research:  { agentRole: "research",  avgInputTokens: 2000, avgOutputTokens: 1500 },
  social:    { agentRole: "social",    avgInputTokens: 1500, avgOutputTokens: 800 },
  image:     { agentRole: "image",     avgInputTokens: 500,  avgOutputTokens: 300 },
  editor:    { agentRole: "editor",    avgInputTokens: 800,  avgOutputTokens: 400 },
  analytics: { agentRole: "analytics", avgInputTokens: 1200, avgOutputTokens: 600 },
};

// Average tokens per post (input + output combined)
const AVG_TOKENS_PER_POST = 2500;

// ---- Budget config ----

export interface BudgetConfig {
  maxCostPerPost: number;       // default $1.00
  maxTotalBudget: number | null; // null = unlimited (use per-post limit only)
  model: string;
}

const DEFAULT_BUDGET: BudgetConfig = {
  maxCostPerPost: 1.0,
  maxTotalBudget: null,
  model: DEFAULT_MODEL,
};

// ---- Estimation result ----

export interface TokenEstimate {
  postCount: number;
  variationCount: number;
  avgTokensPerPost: number;
  totalEstimatedTokens: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  costPerPost: number;
  withinBudget: boolean;
  model: string;
}

export interface BudgetEnforcementResult {
  original: TokenEstimate;
  adjusted: TokenEstimate | null;
  wasAdjusted: boolean;
  adjustments: BudgetAdjustment[];
  warnings: string[];
}

export interface BudgetAdjustment {
  type: "reduce_variations" | "limit_research" | "downgrade_model";
  from: string | number;
  to: string | number;
  savingsUsd: number;
}

// ============================================================
// Core functions
// ============================================================

/**
 * Estimate token usage and cost before running agents.
 */
export function estimateTokenCost(
  postCount: number,
  variationCount: number,
  agentRoles: string[] = ["research", "social", "image", "editor", "analytics"],
  budget: Partial<BudgetConfig> = {}
): TokenEstimate {
  const config = { ...DEFAULT_BUDGET, ...budget };
  const pricing = MODEL_PRICING[config.model] || MODEL_PRICING[DEFAULT_MODEL];

  // Per-post tokens from agent profiles
  const perPostInput = agentRoles.reduce((sum, role) => {
    const profile = AGENT_TOKEN_PROFILES[role];
    return sum + (profile?.avgInputTokens || 1000);
  }, 0);

  const perPostOutput = agentRoles.reduce((sum, role) => {
    const profile = AGENT_TOKEN_PROFILES[role];
    return sum + (profile?.avgOutputTokens || 500);
  }, 0);

  // Formula: post_count × average_tokens_per_post × variation_count
  const avgTokensPerPost = perPostInput + perPostOutput;
  const totalEstimatedTokens = postCount * avgTokensPerPost * variationCount;
  const estimatedInputTokens = postCount * perPostInput * variationCount;
  const estimatedOutputTokens = postCount * perPostOutput * variationCount;

  const estimatedCostUsd =
    (estimatedInputTokens / 1000) * pricing.inputPer1K +
    (estimatedOutputTokens / 1000) * pricing.outputPer1K;

  const costPerPost = postCount > 0 ? estimatedCostUsd / postCount : 0;

  return {
    postCount,
    variationCount,
    avgTokensPerPost,
    totalEstimatedTokens,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd: round(estimatedCostUsd),
    costPerPost: round(costPerPost),
    withinBudget: costPerPost <= config.maxCostPerPost,
    model: config.model,
  };
}

/**
 * Enforce budget by reducing parameters until cost is acceptable.
 * Returns adjusted parameters and a list of changes made.
 */
export function enforceBudget(
  postCount: number,
  variationCount: number,
  agentRoles: string[] = ["research", "social", "image", "editor", "analytics"],
  budget: Partial<BudgetConfig> = {}
): BudgetEnforcementResult {
  const config = { ...DEFAULT_BUDGET, ...budget };
  const original = estimateTokenCost(postCount, variationCount, agentRoles, config);

  if (original.withinBudget) {
    return {
      original,
      adjusted: null,
      wasAdjusted: false,
      adjustments: [],
      warnings: [],
    };
  }

  const adjustments: BudgetAdjustment[] = [];
  const warnings: string[] = [];
  let currentVariations = variationCount;
  let currentRoles = [...agentRoles];
  let currentModel = config.model;

  // Step 1: Reduce variation_count (min 1)
  while (currentVariations > 1) {
    const prev = estimateTokenCost(postCount, currentVariations, currentRoles, { ...config, model: currentModel });
    currentVariations--;
    const next = estimateTokenCost(postCount, currentVariations, currentRoles, { ...config, model: currentModel });

    adjustments.push({
      type: "reduce_variations",
      from: currentVariations + 1,
      to: currentVariations,
      savingsUsd: round(prev.estimatedCostUsd - next.estimatedCostUsd),
    });

    if (next.costPerPost <= config.maxCostPerPost) break;
  }

  let estimate = estimateTokenCost(postCount, currentVariations, currentRoles, { ...config, model: currentModel });

  // Step 2: Limit research context (remove research agent)
  if (!estimate.withinBudget && currentRoles.includes("research")) {
    const prev = estimate;
    currentRoles = currentRoles.filter((r) => r !== "research");
    estimate = estimateTokenCost(postCount, currentVariations, currentRoles, { ...config, model: currentModel });

    adjustments.push({
      type: "limit_research",
      from: "full_research",
      to: "research_disabled",
      savingsUsd: round(prev.estimatedCostUsd - estimate.estimatedCostUsd),
    });

    warnings.push("Research agent disabled to stay within budget. Trend and competitor data will not be refreshed.");
  }

  // Step 3: Downgrade model as last resort
  if (!estimate.withinBudget) {
    const cheaperModels = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "openai/gpt-5-nano"];
    for (const model of cheaperModels) {
      if (model === currentModel) continue;
      const prev = estimate;
      currentModel = model;
      estimate = estimateTokenCost(postCount, currentVariations, currentRoles, { ...config, model: currentModel });

      adjustments.push({
        type: "downgrade_model",
        from: prev.model,
        to: currentModel,
        savingsUsd: round(prev.estimatedCostUsd - estimate.estimatedCostUsd),
      });

      if (estimate.withinBudget) break;
    }
  }

  if (!estimate.withinBudget) {
    warnings.push(
      `Unable to reduce cost below $${config.maxCostPerPost}/post. Current estimate: $${estimate.costPerPost}/post. Consider increasing budget or reducing post count.`
    );
  }

  warnings.push(
    `Budget adjusted: ${variationCount} → ${currentVariations} variations, model: ${currentModel}. Estimated cost: $${estimate.estimatedCostUsd}.`
  );

  return {
    original,
    adjusted: estimate,
    wasAdjusted: true,
    adjustments,
    warnings,
  };
}

/**
 * Get the pricing for a specific model.
 */
export function getModelPricing(modelId?: string): ModelPricing {
  return MODEL_PRICING[modelId || DEFAULT_MODEL] || MODEL_PRICING[DEFAULT_MODEL];
}

/**
 * List all available models with pricing.
 */
export function listModelPricing(): ModelPricing[] {
  return Object.values(MODEL_PRICING);
}

/**
 * Track actual token usage after a run (for future accuracy improvement).
 */
export interface TokenUsageRecord {
  runId: string;
  postCount: number;
  variationCount: number;
  model: string;
  estimatedTokens: number;
  actualTokens: number | null;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  agentRoles: string[];
  timestamp: string;
}

const usageHistory: TokenUsageRecord[] = [];

export function recordTokenUsage(record: TokenUsageRecord): void {
  usageHistory.push(record);
  // Keep last 100 records in memory
  if (usageHistory.length > 100) usageHistory.shift();
}

export function getUsageHistory(): TokenUsageRecord[] {
  return [...usageHistory];
}

/**
 * Get calibrated average tokens per post based on actual usage history.
 * Falls back to default if no history.
 */
export function getCalibratedAvgTokens(): number {
  if (usageHistory.length === 0) return AVG_TOKENS_PER_POST;

  const withActual = usageHistory.filter((r) => r.actualTokens != null);
  if (withActual.length === 0) return AVG_TOKENS_PER_POST;

  const avgActual =
    withActual.reduce((sum, r) => sum + (r.actualTokens! / (r.postCount * r.variationCount)), 0) /
    withActual.length;

  // Blend: 70% actual, 30% default (smoothing)
  return Math.round(avgActual * 0.7 + AVG_TOKENS_PER_POST * 0.3);
}

// ---- Helpers ----

function round(n: number, decimals = 4): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
