import { generateCampaignManifest, type CampaignManifest, type ManifestInput } from "@/lib/campaigns/campaignManifest";
import { estimateTokenCost, enforceBudget, type TokenEstimate, type BudgetEnforcementResult } from "./tokenMonitor";
import { loadApprovalPatterns } from "@/lib/approvalMemory";
import { getTemplatesForPlatform, type SocialPlatform } from "./platformTemplates";
import type {
  BrandProfile,
  VoiceProfile,
  StrategyProfile,
  ExamplesCache,
  AnalyticsHistory,
  ProductCatalog,
} from "@/lib/clientBrain";

// ============================================================
// KLYC Campaign Planner Agent
// Analyzes goals, selects platforms & structures, generates
// manifest, and enforces token budget before batch generation.
// ============================================================

export interface ClientBrainSnapshot {
  brand?: BrandProfile;
  voice?: VoiceProfile;
  strategy?: StrategyProfile;
  examples?: ExamplesCache;
  analytics?: AnalyticsHistory;
  product_catalog?: ProductCatalog;
}

export interface PlannerInput {
  clientId: string;
  clientBrain: ClientBrainSnapshot;
  campaignGoal: string;
  platformPreferences: string[];
  budgetConstraints?: {
    maxCostPerPost?: number;
    maxTotalBudget?: number | null;
    model?: string;
  };
  dateRange: { start: string; end: string };
  postsPerDay?: number;
  daysOfWeek?: string[];
  blackoutDates?: string[];
  variationCount?: number;
}

export interface PlannerOutput {
  manifest: CampaignManifest;
  tokenEstimate: TokenEstimate;
  budgetEnforcement: BudgetEnforcementResult;
  platformRationale: Record<string, string>;
  structureSelections: Record<string, string[]>;
  warnings: string[];
}

// ---- Platform scoring heuristics ----

const GOAL_PLATFORM_AFFINITY: Record<string, Record<string, number>> = {
  awareness:   { tiktok: 0.9, instagram: 0.85, youtube: 0.8, twitter: 0.7, linkedin: 0.5, facebook: 0.6 },
  engagement:  { instagram: 0.9, tiktok: 0.85, twitter: 0.8, linkedin: 0.7, facebook: 0.65, youtube: 0.6 },
  leads:       { linkedin: 0.95, facebook: 0.8, instagram: 0.7, twitter: 0.6, youtube: 0.55, tiktok: 0.4 },
  sales:       { instagram: 0.85, facebook: 0.8, tiktok: 0.75, youtube: 0.7, linkedin: 0.6, twitter: 0.5 },
  authority:   { linkedin: 0.95, youtube: 0.9, twitter: 0.75, instagram: 0.5, facebook: 0.5, tiktok: 0.3 },
  community:   { facebook: 0.9, instagram: 0.8, tiktok: 0.75, twitter: 0.7, linkedin: 0.6, youtube: 0.5 },
};

const SUPPORTED_PLATFORMS = ["linkedin", "twitter", "instagram", "tiktok", "youtube", "facebook"];

/**
 * Analyze the campaign goal and return a normalised goal category.
 */
function analyzeGoal(goal: string): string {
  const lower = goal.toLowerCase();
  if (/awareness|reach|visibility|brand awareness/i.test(lower)) return "awareness";
  if (/engag|interact|comment|like/i.test(lower)) return "engagement";
  if (/lead|sign.?up|subscribe|newsletter/i.test(lower)) return "leads";
  if (/sale|revenue|convert|purchase|buy/i.test(lower)) return "sales";
  if (/authority|thought.?leader|expert|credib/i.test(lower)) return "authority";
  if (/community|loyal|fan|advocate/i.test(lower)) return "community";
  return "engagement"; // safe default
}

/**
 * Rank platforms by affinity to the campaign goal, filtered by user prefs.
 */
function determineBestPlatforms(
  goalCategory: string,
  preferences: string[],
  approvalPatterns?: Awaited<ReturnType<typeof loadApprovalPatterns>>
): { platforms: string[]; rationale: Record<string, string> } {
  const affinities = GOAL_PLATFORM_AFFINITY[goalCategory] || GOAL_PLATFORM_AFFINITY["engagement"];

  // Boost platforms the client historically approves content on
  const preferredBoost = new Set(approvalPatterns?.preferredPlatforms || []);

  const candidates = (preferences.length > 0 ? preferences : SUPPORTED_PLATFORMS)
    .filter((p) => SUPPORTED_PLATFORMS.includes(p.toLowerCase()))
    .map((p) => p.toLowerCase());

  const scored = candidates.map((platform) => {
    let score = affinities[platform] || 0.5;
    if (preferredBoost.has(platform)) score += 0.1;
    return { platform, score: Math.min(score, 1) };
  });

  scored.sort((a, b) => b.score - a.score);

  const rationale: Record<string, string> = {};
  for (const { platform, score } of scored) {
    rationale[platform] = `Score ${(score * 100).toFixed(0)}% for "${goalCategory}" goal`;
  }

  return { platforms: scored.map((s) => s.platform), rationale };
}

/**
 * Select top-performing structures per platform using approval history.
 */
function selectStructures(
  platforms: string[],
  approvalPatterns?: Awaited<ReturnType<typeof loadApprovalPatterns>>
): Record<string, string[]> {
  const preferred = new Set(approvalPatterns?.preferredStructures || []);
  const selections: Record<string, string[]> = {};

  for (const platform of platforms) {
    const templates = getTemplatesForPlatform(platform as SocialPlatform);
    if (templates.length === 0) {
      selections[platform] = ["default"];
      continue;
    }

    // Sort: preferred structures first, then by template order
    const sorted = [...templates].sort((a, b) => {
      const aPref = preferred.has(a.structure) ? 1 : 0;
      const bPref = preferred.has(b.structure) ? 1 : 0;
      return bPref - aPref;
    });

    // Take top 3 (or all if fewer)
    selections[platform] = sorted.slice(0, 3).map((t) => t.structure);
  }

  return selections;
}

/**
 * Run the Campaign Planner agent.
 *
 * 1. Analyze campaign goal
 * 2. Determine best platforms
 * 3. Select top-performing structures
 * 4. Estimate token budget & enforce limits
 * 5. Generate campaign manifest
 */
export async function runCampaignPlanner(input: PlannerInput): Promise<PlannerOutput> {
  const warnings: string[] = [];

  // 1. Analyze goal
  const goalCategory = analyzeGoal(input.campaignGoal);

  // 2. Load approval patterns for smarter selection
  let approvalPatterns: Awaited<ReturnType<typeof loadApprovalPatterns>> | undefined;
  try {
    approvalPatterns = await loadApprovalPatterns(input.clientId);
  } catch {
    warnings.push("Could not load approval history; using defaults.");
  }

  // 3. Determine best platforms
  const { platforms, rationale } = determineBestPlatforms(
    goalCategory,
    input.platformPreferences,
    approvalPatterns
  );

  // 4. Select structures
  const structureSelections = selectStructures(platforms, approvalPatterns);

  // 5. Estimate token usage
  let variationCount = input.variationCount ?? 3;
  const agentRoles = ["research", "social", "image", "editor", "analytics"];

  // Pre-calculate post count for estimation
  const postsPerDay = input.postsPerDay ?? 1;
  const daysOfWeek = input.daysOfWeek ?? ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const blackoutDates = input.blackoutDates ?? [];

  // Rough post count for token estimation
  const dayCount = Math.max(
    1,
    Math.ceil(
      (new Date(input.dateRange.end).getTime() - new Date(input.dateRange.start).getTime()) /
        86400000
    )
  );
  const estimatedActiveDays = Math.ceil(dayCount * (daysOfWeek.length / 7));
  const roughPostCount = estimatedActiveDays * postsPerDay * platforms.length;

  const budgetResult = enforceBudget(
    roughPostCount,
    variationCount,
    agentRoles,
    input.budgetConstraints
  );

  if (budgetResult.wasAdjusted && budgetResult.adjusted) {
    variationCount = budgetResult.adjusted.variationCount;
    warnings.push(...budgetResult.warnings);
  }

  // 6. Generate manifest
  const manifestInput: ManifestInput = {
    clientId: input.clientId,
    campaignGoal: input.campaignGoal,
    platforms,
    startDate: input.dateRange.start,
    endDate: input.dateRange.end,
    timezone: "UTC",
    postsPerDay,
    daysOfWeek,
    blackoutDates,
    variationCount,
  };

  const manifest = generateCampaignManifest(manifestInput);

  // Final token estimate with actual post count
  const finalEstimate = estimateTokenCost(
    manifest.total_posts,
    variationCount,
    agentRoles,
    input.budgetConstraints
  );

  return {
    manifest,
    tokenEstimate: finalEstimate,
    budgetEnforcement: budgetResult,
    platformRationale: rationale,
    structureSelections,
    warnings,
  };
}
