// ============================================================
// KLYC Campaign Learning Engine (Barrel)
// Re-exports from specialized modules for backward compatibility.
// ============================================================

export { analyzeCampaignPerformance } from "./performanceAnalyzer";
export type { PerformanceAnalysisResult } from "./performanceAnalyzer";

export { discoverPerformancePatterns } from "./patternDiscovery";
export type { DiscoveredPattern, PatternDiscoveryResult } from "./patternDiscovery";

export { scopeNewOpportunities } from "./scopeEngine";
export type { ScopeRecommendation, ScopeResult } from "./scopeEngine";

export { generatePrototypeCampaigns } from "./prototypeEngine";
export type { PrototypeResult } from "./prototypeEngine";

export { scaleWinningStrategies } from "./massProductionEngine";
export type { ScaleResult, ScaleAdjustment } from "./massProductionEngine";

export { detectSelfPromotionOpportunity } from "./selfPromotion";
export type { SelfPromoResult } from "./selfPromotion";

export { getLearningInsights } from "./learningDashboard";
export type { LearningInsights } from "./learningDashboard";

// Legacy re-exports for existing imports
export { updateClientStrategyFromPerformance, getCampaignLearningInsights } from "./strategyLearning";

export type {
  PerformanceInsights,
  StrategyAdjustment,
  CampaignPerformanceRow,
} from "./strategyLearning";
