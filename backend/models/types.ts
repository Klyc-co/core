/**
 * KLYC Type Definitions
 * Comprehensive TypeScript types for the entire platform.
 * Migrated from ai-controller/backend/models/types.ts
 */

// ── Platform & Content ──────────────────────────────────────────────

export type Platform = 'linkedin' | 'x' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'email' | 'blog'

export type ContentType = 'post' | 'thread' | 'carousel' | 'image' | 'video' | 'story' | 'reel' | 'article' | 'email'

export type CampaignObjective =
  | 'brand_awareness'
  | 'lead_generation'
  | 'engagement'
  | 'conversion'
  | 'thought_leadership'
  | 'product_launch'
  | 'community_building'
  | 'crisis_response'

export type CampaignStatus =
  | 'draft'
  | 'normalized'
  | 'researched'
  | 'positioned'
  | 'simulated'
  | 'approved'
  | 'publish_ready'
  | 'live'
  | 'checkpoint_1m'
  | 'checkpoint_5m'
  | 'checkpoint_15m'
  | 'checkpoint_30m'
  | 'checkpoint_1h'
  | 'checkpoint_2h'
  | 'archived'
  | 'learned'

export type RequestType =
  | 'campaign_create'
  | 'content_generate'
  | 'research_request'
  | 'analytics_request'
  | 'agent_run'

export type NarrativeType =
  | 'hidden_truth'
  | 'threat_warning'
  | 'framework_revelation'
  | 'status_upgrade'
  | 'contrarian_insight'
  | 'future_prediction'
  | 'tool_discovery'

// ── Campaign Brief ──────────────────────────────────────────────────

export interface CampaignBrief {
  name: string
  objective: CampaignObjective
  platforms: Platform[]
  contentTypes: ContentType[]
  keywords: string[]
  audience?: string
  audienceTargeting?: string
  geo?: string
  industry?: string
  customerSize?: string
  competitors?: string[]
  regulatoryFilters?: string[]
  productInfo?: string
  companyInfo?: string
  brandVoice?: string
  mode?: 'reactive' | 'proactive' | 'hybrid'
  goal?: string
}

export interface NormalizedCampaignBrief {
  type: RequestType
  campaign: any
  platforms: string[]
  contentTypes: string[]
  keywords: string[]
  includesMedia: boolean
  context: string
  timestamp: number
  title?: string
}

// ── Customer DNA ────────────────────────────────────────────────────

export interface CustomerDNA {
  brandVoice: string
  offerMap: string[]
  audienceSegments: string[]
  painPoints: string[]
  proofPoints: string[]
  competitors: string[]
  regulations: string[]
  semanticThemes: string[]
  trustSignals: string[]
  objections: string[]
  sourceReferences: SourceReference[]
  compressedSummaryHash?: string
}

// ── Strategy ────────────────────────────────────────────────────────

export interface StrategyProfile {
  requestedStrategy: string
  recommendedStrategy: string
  confidence: number
  reasoning: string
  decision: 'stay' | 'adjust' | 'override'
}

// ── Narrative ───────────────────────────────────────────────────────

export interface NarrativeCandidate {
  type: NarrativeType
  coreClaim: string
  problem: string
  mechanism: string
  outcome: string
  score: number
  clarity: number
  trust: number
  narrativeRank: number
}

// ── Platform Score ──────────────────────────────────────────────────

export interface PlatformScore {
  platform: Platform
  audienceDensity: number
  engagementRate: number
  topicRelevance: number
  buyerPresence: number
  compositeScore: number
}

// ── Post Package ────────────────────────────────────────────────────

export interface PostPackage {
  platform: Platform
  copy: string
  creativePrompt: string
  cta: string
  qrLink?: string
  trackingLink?: string
  campaignId: string
}

// ── Performance ─────────────────────────────────────────────────────

export type CheckpointWindow = '1m' | '5m' | '15m' | '30m' | '1h' | '2h'

export interface PerformanceSnapshot {
  campaignId: string
  window: CheckpointWindow
  impressions: number
  engagements: number
  clicks: number
  shares: number
  engagementRate: number
  viralVelocity: number
  timestamp: number
}

export interface LearningUpdate {
  campaignId: string
  narrativePerformance: Record<string, number>
  platformPreferences: Record<string, number>
  ctaPatterns: string[]
  themeEffectiveness: Record<string, number>
  bestWindow: CheckpointWindow
  recommendation: 'scale' | 'iterate' | 'retire'
  timestamp: number
}

// ── Compression ─────────────────────────────────────────────────────

export interface SourceReference {
  id: string
  type: 'upload' | 'url' | 'manual' | 'api'
  label: string
  hash?: string
}

export interface CompressedSummary {
  raw: string
  extracted: string
  strategic: string
  hash: string
  preview: string
}

export interface CompressionMetadata {
  sourceCount: number
  compressionRatio: number
  hashAlgorithm: 'sha256'
  createdAt: number
}

// ── Orchestration ───────────────────────────────────────────────────

export interface OrchestrationContext {
  requestId: string
  originalRequest: any
  normalizedData: any
  steps: OrchestrationStep[]
  workingData: Record<string, unknown>
  createdAt: number
}

export interface OrchestrationStep {
  agent: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: number
  completedAt?: number
  result?: unknown
  error?: string
}

export interface AgentTask {
  agentName: string
  priority: number
  dependencies: string[]
  config?: Record<string, unknown>
}

// ── Workflow ────────────────────────────────────────────────────────

export interface WorkflowCallMetadata {
  requestId: string
  receivedAt: number
  source?: string
  clientId?: string
}

export interface WorkflowIntakeRequest {
  input_as_text: string
  client_id: string
  client_name: string
  goal?: string
  platforms?: string[]
  keywords?: string[]
  contentTypes?: string[]
  compressed_customer_dna?: string
  prior_strategy_summary?: string
  prior_campaign_summary?: string
  website_summary?: string
  product_summary?: string
  regulatory_summary?: string
  competitor_summary?: string
  compressed_context?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface NormalizationReportEnvelope {
  runMetadata: {
    clientId: string
    clientName?: string
    runTimestamp: string
    workflowVersion: string
    status: string
  }
  normalizationChecksum: {
    contextCoverage: number
    confidenceScore: number
    missingInputsCount: number
    warningsCount: number
    sourceCount: number
    compressionNotesCount: number
  }
  nextActions: {
    requiresResearch: boolean
    requiresProductPositioning: boolean
    requiresNarrativeSimulation: boolean
    requiresPlatformEvaluation: boolean
    recommendedNextUpdate: string
  }
  passFailState: {
    readyForOrchestration: boolean
    blockedByMissingCriticalInputs: boolean
    lowConfidenceNormalization: boolean
    needsClientContextRefresh: boolean
  }
  rawNormalizedObjects?: {
    campaignBrief: NormalizedCampaignBrief
    customerContext: any
    orchestratorHints: any
    learningHooks: any[]
  }
}

export interface ValidationErrorPayload {
  code: string
  message: string
  issues: { field: string; message: string }[]
  missing?: string[]
}
