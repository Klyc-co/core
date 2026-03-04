import {
  loadFullBrain,
  loadBrainDocument,
  type BrandProfile,
  type VoiceProfile,
  type StrategyProfile,
  type ExamplesCache,
  type AnalyticsHistory,
  type CampaignHistory,
  type ProductCatalog,
} from "@/lib/clientBrain";

// ============================================================
// KLYC Client Brain Loader
// Loads the full client marketing context before campaign
// generation so agents operate with complete knowledge.
// Token budget enforcement ensures AI calls stay efficient.
// ============================================================

/** Default max tokens for the compressed brain context */
const DEFAULT_TOKEN_BUDGET = 400;

/** Rough token estimator: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ClientBrainContext {
  brand_profile: BrandProfile;
  voice_profile: VoiceProfile;
  strategy_profile: StrategyProfile;
  examples: ExamplesCache;
  analytics: AnalyticsHistory;
  campaign_history: CampaignHistory;
  product_catalog: ProductCatalog;
  loaded_at: string;
  is_complete: boolean;
}

export interface BudgetedBrainContext {
  /** Compressed context string guaranteed <= token budget */
  brain_context_min: string;
  /** Full document type IDs present for on-demand retrieval */
  brain_context_full_ref: string[];
  /** The full typed context for local logic (not sent to AI) */
  full: ClientBrainContext;
}

/**
 * Load the complete client brain and produce a budget-enforced context.
 */
export async function loadClientBrain(
  clientId: string,
  tokenBudget: number = DEFAULT_TOKEN_BUDGET
): Promise<BudgetedBrainContext> {
  const raw = await loadFullBrain(clientId);

  const ctx: ClientBrainContext = {
    brand_profile: (raw.brand_profile as BrandProfile) || {},
    voice_profile: (raw.voice_profile as VoiceProfile) || {},
    strategy_profile: (raw.strategy_profile as StrategyProfile) || {},
    examples: (raw.examples_cache as ExamplesCache) || {},
    analytics: (raw.analytics_history as AnalyticsHistory) || {},
    campaign_history: (raw.campaign_history as CampaignHistory) || {},
    product_catalog: (raw.product_catalog as ProductCatalog) || {},
    loaded_at: new Date().toISOString(),
    is_complete: false,
  };

  ctx.is_complete = assessCompleteness(ctx);

  // Build the full_ref list of document types that have data
  const brain_context_full_ref = Object.entries(raw)
    .filter(([, v]) => hasData(v as any))
    .map(([k]) => k);

  // Build the budget-constrained context string
  const brain_context_min = buildBudgetedContext(ctx, tokenBudget);

  return { brain_context_min, brain_context_full_ref, full: ctx };
}

// ---- Priority-ordered context builder ----

/**
 * Build a compact context string within the token budget.
 * Priority order (highest → lowest):
 *   1. Voice rules (tone, banned phrases, CTA style)
 *   2. Compliance constraints
 *   3. Brand positioning & description
 *   4. Product positioning (compact)
 *   5. Strategy (target audience, messaging pillars)
 *   6. Examples (most recent 2 approved, 1 rejected)
 *   7. Analytics summary (aggregated, not raw)
 *   8. Campaign history summary
 */
function buildBudgetedContext(ctx: ClientBrainContext, budget: number): string {
  const sections: string[] = [];
  let currentTokens = 0;

  const tryAdd = (label: string, content: string): boolean => {
    const line = `${label}: ${content}`;
    const tokens = estimateTokens(line);
    if (currentTokens + tokens <= budget) {
      sections.push(line);
      currentTokens += tokens;
      return true;
    }
    return false;
  };

  // 1. Voice rules (highest priority)
  const v = ctx.voice_profile;
  if (v.tone) tryAdd("Tone", v.tone);
  if (v.bannedPhrases?.length) tryAdd("Banned phrases", v.bannedPhrases.join(", "));
  if (v.ctaStyle) tryAdd("CTA style", v.ctaStyle);
  if (v.writingStyle) tryAdd("Writing style", v.writingStyle);
  if (v.emojiUsage) tryAdd("Emoji usage", v.emojiUsage);

  // 2. Compliance constraints
  const s = ctx.strategy_profile;
  if (s.complianceConstraints?.length) {
    tryAdd("Compliance", s.complianceConstraints.join("; "));
  }

  // 3. Brand positioning
  const b = ctx.brand_profile;
  if (b.positioning) tryAdd("Positioning", b.positioning);
  if (b.companyDescription) {
    // Trim to first 200 chars if long
    tryAdd("Company", b.companyDescription.slice(0, 200));
  }
  if (b.productCategories?.length) tryAdd("Categories", b.productCategories.join(", "));

  // 4. Product positioning (compact)
  const pc = ctx.product_catalog;
  if (pc.products?.length) {
    const productSummary = pc.products
      .slice(0, 5)
      .map((p) => `${p.name}${p.category ? ` (${p.category})` : ""}`)
      .join("; ");
    tryAdd("Products", productSummary);
  }

  // 5. Strategy
  if (s.targetAudience) tryAdd("Audience", s.targetAudience);
  if (s.messagingPillars?.length) tryAdd("Pillars", s.messagingPillars.join(", "));
  if (s.funnelGoals?.length) tryAdd("Funnel goals", s.funnelGoals.join(", "));

  // 6. Examples (compact - only counts)
  const ex = ctx.examples;
  if (ex.approvedExamples?.length || ex.rejectedExamples?.length) {
    tryAdd("Examples", `${ex.approvedExamples?.length || 0} approved, ${ex.rejectedExamples?.length || 0} rejected`);
  }

  // 7. Analytics summary (aggregated)
  const a = ctx.analytics;
  if (a.snapshots?.length) {
    const avgEng = a.snapshots.reduce((sum, s) => sum + (s.engagementRate || 0), 0) / a.snapshots.length;
    tryAdd("Avg engagement", `${avgEng.toFixed(1)}% across ${a.snapshots.length} data points`);
  }

  // 8. Campaign history (just count)
  const ch = ctx.campaign_history;
  if (ch.campaigns?.length) {
    tryAdd("Campaign history", `${ch.campaigns.length} past campaigns`);
  }

  // 9. Performance learning insights (from strategy_profile)
  const strat = ctx.strategy_profile as any;
  const perf = strat?.performanceInsights;
  if (perf?.avgScore != null) {
    tryAdd("Perf score", `${perf.avgScore} avg across ${perf.totalCampaignsAnalyzed} campaigns`);
  }
  const optTimes = strat?.optimalPostTimes;
  if (optTimes?.length) {
    tryAdd("Best times", optTimes.join(", "));
  }
  const platPerf = strat?.platformPerformance;
  if (platPerf?.length) {
    const top3 = platPerf.slice(0, 3).map((p: any) => `${p.platform}:${p.avgScore}`).join(", ");
    tryAdd("Top platforms", top3);
  }

  // 10. Learning engine insights
  if (strat?.preferredTheme) tryAdd("Best theme", strat.preferredTheme);
  if (strat?.preferredCta) tryAdd("Best CTA", strat.preferredCta);
  if (strat?.bestEngagementDay) tryAdd("Best day", strat.bestEngagementDay);
  if (strat?.preferredPostLength) tryAdd("Best length", strat.preferredPostLength);
  if (strat?.learningOptimalTime) tryAdd("Optimal time", strat.learningOptimalTime);

  return sections.join("\n");
}

/**
 * Load a single brain slice when only partial context is needed.
 */
export async function loadBrainSlice<K extends keyof SliceMap>(
  clientId: string,
  slice: K
): Promise<SliceMap[K]> {
  const docTypeMap: Record<string, string> = {
    brand_profile: "brand_profile",
    voice_profile: "voice_profile",
    strategy_profile: "strategy_profile",
    examples: "examples_cache",
    analytics: "analytics_history",
    campaign_history: "campaign_history",
    product_catalog: "product_catalog",
  };

  const result = await loadBrainDocument(clientId, docTypeMap[slice] as any);
  return (result || {}) as SliceMap[K];
}

/**
 * Check which brain documents have meaningful data.
 */
export function getCompletionReport(ctx: ClientBrainContext): BrainCompletionReport {
  return {
    brand_profile: hasData(ctx.brand_profile),
    voice_profile: hasData(ctx.voice_profile),
    strategy_profile: hasData(ctx.strategy_profile),
    examples: hasData(ctx.examples),
    analytics: hasData(ctx.analytics),
    campaign_history: hasData(ctx.campaign_history),
    product_catalog: hasData(ctx.product_catalog),
    overall_complete: ctx.is_complete,
  };
}

// ---- Types ----

type SliceMap = {
  brand_profile: BrandProfile;
  voice_profile: VoiceProfile;
  strategy_profile: StrategyProfile;
  examples: ExamplesCache;
  analytics: AnalyticsHistory;
  campaign_history: CampaignHistory;
  product_catalog: ProductCatalog;
};

export interface BrainCompletionReport {
  brand_profile: boolean;
  voice_profile: boolean;
  strategy_profile: boolean;
  examples: boolean;
  analytics: boolean;
  campaign_history: boolean;
  product_catalog: boolean;
  overall_complete: boolean;
}

// ---- Helpers ----

function hasData(obj: Record<string, any> | undefined | null): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""
  );
}

function assessCompleteness(ctx: ClientBrainContext): boolean {
  // Require brand + voice + strategy. Product catalog is optional.
  return hasData(ctx.brand_profile) && hasData(ctx.voice_profile) && hasData(ctx.strategy_profile);
}
