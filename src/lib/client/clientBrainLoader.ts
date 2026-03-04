import {
  loadFullBrain,
  loadBrainDocument,
  type BrandProfile,
  type VoiceProfile,
  type StrategyProfile,
  type ExamplesCache,
  type AnalyticsHistory,
  type CampaignHistory,
} from "@/lib/clientBrain";

// ============================================================
// KLYC Client Brain Loader
// Loads the full client marketing context before campaign
// generation so agents operate with complete knowledge.
// ============================================================

export interface ClientBrainContext {
  brand_profile: BrandProfile;
  voice_profile: VoiceProfile;
  strategy_profile: StrategyProfile;
  examples: ExamplesCache;
  analytics: AnalyticsHistory;
  campaign_history: CampaignHistory;
  loaded_at: string;
  is_complete: boolean;
}

/**
 * Load the complete client brain for use by the orchestrator.
 * Returns a typed context with all six document categories.
 * Missing documents default to empty objects.
 */
export async function loadClientBrain(clientId: string): Promise<ClientBrainContext> {
  const raw = await loadFullBrain(clientId);

  const ctx: ClientBrainContext = {
    brand_profile: (raw.brand_profile as BrandProfile) || {},
    voice_profile: (raw.voice_profile as VoiceProfile) || {},
    strategy_profile: (raw.strategy_profile as StrategyProfile) || {},
    examples: (raw.examples_cache as ExamplesCache) || {},
    analytics: (raw.analytics_history as AnalyticsHistory) || {},
    campaign_history: (raw.campaign_history as CampaignHistory) || {},
    loaded_at: new Date().toISOString(),
    is_complete: false,
  };

  ctx.is_complete = assessCompleteness(ctx);
  return ctx;
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
};

export interface BrainCompletionReport {
  brand_profile: boolean;
  voice_profile: boolean;
  strategy_profile: boolean;
  examples: boolean;
  analytics: boolean;
  campaign_history: boolean;
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
  // Require at least brand + voice + strategy to be considered complete
  return hasData(ctx.brand_profile) && hasData(ctx.voice_profile) && hasData(ctx.strategy_profile);
}
