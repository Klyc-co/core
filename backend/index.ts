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

// ── Campaign Runner ──
export { executeCampaignRun, campaignRunStore } from './services/campaign-runner'
export type { CampaignRunResult, CampaignRunOrchestrator } from './services/campaign-runner'

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
