export type { 
  AgentRole, 
  AgentMetric, 
  AgentMetricsOutput, 
  RecommendedAction,
  ResearchAgentInput,
  SocialAgentInput,
  ImageAgentInput,
  EditorAgentInput,
  AnalyticsAgentInput,
} from "./types";
export { PLATFORM_LIMITS } from "./types";
export { computeResearchMetrics } from "./researchAgent";
export { computeSocialMetrics } from "./socialAgent";
export { computeImageMetrics } from "./imageAgent";
export { computeEditorMetrics } from "./editorAgent";
export { computeAnalyticsMetrics } from "./analyticsAgent";
export { aggregateAgentMetrics, queryAnalytics, generateDashboardSnapshot } from "./orchestrator";
export type { OrchestratorMetricsReport } from "./orchestrator";
export {
  getTemplatesForPlatform,
  getTemplate,
  listAllTemplates,
  generateStructureVariations,
} from "./platformTemplates";
export type {
  ContentStructureTemplate,
  SocialPlatform,
  HookType,
  CtaPattern,
  HashtagPattern,
  CharacterLimits,
  StructureVariation,
  VariationSection,
} from "./platformTemplates";
