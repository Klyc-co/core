/**
 * KLYC Backend — Main Entry Point
 * Exports all public modules for consumption by the frontend and edge functions.
 */

// ── Core Client ──
export { claudeClient, ClaudeClient, AGENT_MODELS } from './services/claude_client'
export type { ClaudeGenerateOptions, ClaudeResult, AgentModelKey } from './services/claude_client'

// ── Agent Interface ──
export type { Agent, AgentInput, AgentOutput, AgentStatus } from './agents/agent_interface'

// ── Agents ──
export { NormalizerAgent } from './agents/normalizer'
export { researchAgent } from './agents/research'
export { productAgent } from './agents/product'
export { narrativeAgent } from './agents/narrative'
export { socialAgent } from './agents/social'
export { imageAgent } from './agents/image'
export { editorAgent } from './agents/editor'
export { approvalAgent } from './agents/approval'
export { analyticsAgent } from './agents/analytics'

// ── Orchestrator ──
export { KLYCOrchestrator, orchestrator } from './orchestrator/klyc_orchestrator'
export type { OrchestratorInput, OrchestratorResult } from './orchestrator/klyc_orchestrator'
export { CampaignLifecycleProcessor } from './orchestrator/campaign_lifecycle'
export type { CampaignLifecycleResult, CheckpointEvaluation, LifecycleTransition } from './orchestrator/campaign_lifecycle'
export { buildOrchestrationPackage } from './orchestrator/router'
export type { RoutingInput, RoutingSignals, OrchestrationPackage, RoutingSignalKey } from './orchestrator/router'
export { adaptNormalizerResponse } from './orchestrator/normalizer-adapter'
export type { NormalizerAdapterOptions } from './orchestrator/normalizer-adapter'

// ── Campaign Runner ──
export { executeCampaignRun, campaignRunStore } from './services/campaign-runner'
export type { CampaignRunResult, CampaignRunOrchestrator } from './services/campaign-runner'

// ── State Store ──
export { InMemoryCampaignRunStore, campaignRunStore as runStore } from './state/campaign-run-store'
export type {
  CampaignRunRecord, CampaignRunInput, CampaignRunUpdate,
  CampaignRunStoreInterface, TimelineMetric
} from './state/campaign-run-store'

// ── Strategy Engine ─���
export {
  buildOpportunityProfile, compareRequestedVsRecommendedStrategy,
  rankPlatforms, computePreLaunchScore, computeNarrativeRank,
  scoreNarrativeCandidates, computeViralityCheckpoint, generateLearningDelta
} from './services/strategy-engine'
export type {
  OpportunitySignal, OpportunityProfile, RequestedStrategy, RecommendedStrategy,
  StrategyComparison, PlatformPerformanceInput, RankedPlatform,
  PreLaunchComponents, PreLaunchWeights, NarrativeCandidateInput,
  NarrativeCandidateScore, ViralityCheckpointInput, ViralityCheckpointResult,
  LearningDeltaInput, LearningDelta
} from './services/strategy-engine'

// ── Context Compression ──
export {
  compressSummaryLayers, compressCampaignContext, compressContentContext
} from './services/context-compression'

// ── Data Models ──
export type { Campaign, Content, ResearchSignal, AnalyticsMetric } from './services/data-models'

// ── API ──
export { handleCampaignRun } from './api/run_campaign'

// ── Utilities ──
export { formatCampaignResponse, generateCampaignId } from './utils/response_formatter'
export type { CampaignResponse } from './utils/response_formatter'
export { executeAgent, DEFAULT_GUARDRAILS } from './utils/execution_guardrails'
export type { GuardrailConfig } from './utils/execution_guardrails'
export { Security } from './services/security'

// ── Types ──
export type {
  Platform, ContentType, CampaignObjective, CampaignStatus, RequestType, NarrativeType,
  CampaignBrief, NormalizedCampaignBrief, CustomerDNA, StrategyProfile,
  NarrativeCandidate, PlatformScore, PostPackage, CheckpointWindow,
  PerformanceSnapshot, LearningUpdate, SourceReference, CompressedSummary,
  CompressionMetadata, OrchestrationContext, OrchestrationStep, AgentTask,
  WorkflowCallMetadata, WorkflowIntakeRequest, NormalizationReportEnvelope,
  ValidationErrorPayload,
} from './models/types'

// ── Schemas ──
export {
  LIFECYCLE_STATES, CHECKPOINT_WINDOWS, NARRATIVE_TYPES, PLATFORMS,
  normalizedBriefSchema, customerDNASchema, researchStageSchema,
  positioningStageSchema, narrativeCandidateSchema, simulationStageSchema,
  platformScoreSchema, postPackageSchema, packagingStageSchema,
  approvalStageSchema, analyticsSnapshotSchema, checkpointEvaluationSchema,
  learningUpdateSchema, lifecycleTransitionSchema,
} from './models/campaign-lifecycle'
