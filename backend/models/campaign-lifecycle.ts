/**
 * KLYC Campaign Lifecycle — Zod Schemas
 * Runtime validation for all lifecycle stage models.
 * Migrated from ai-controller/backend/models/campaign-lifecycle.ts
 */

import { z } from 'zod'

// ── Constants ───────────────────────────────────────────────────────

export const LIFECYCLE_STATES = [
  'draft', 'normalized', 'researched', 'positioned', 'simulated',
  'approved', 'publish_ready', 'live',
  'checkpoint_1m', 'checkpoint_5m', 'checkpoint_15m',
  'checkpoint_30m', 'checkpoint_1h', 'checkpoint_2h',
  'archived', 'learned',
] as const

export const CHECKPOINT_WINDOWS = ['1m', '5m', '15m', '30m', '1h', '2h'] as const

export const NARRATIVE_TYPES = [
  'hidden_truth', 'threat_warning', 'framework_revelation',
  'status_upgrade', 'contrarian_insight', 'future_prediction', 'tool_discovery',
] as const

export const PLATFORMS = [
  'linkedin', 'x', 'instagram', 'facebook', 'tiktok', 'youtube', 'email', 'blog',
] as const

// ── Schemas ─────────────────────────────────────────────────────────

export const normalizedBriefSchema = z.object({
  type: z.string(),
  campaign: z.any(),
  platforms: z.array(z.string()),
  contentTypes: z.array(z.string()),
  keywords: z.array(z.string()),
  includesMedia: z.boolean(),
  context: z.string(),
  timestamp: z.number(),
})

export const customerDNASchema = z.object({
  brandVoice: z.string(),
  offerMap: z.array(z.string()),
  audienceSegments: z.array(z.string()),
  painPoints: z.array(z.string()),
  proofPoints: z.array(z.string()),
  competitors: z.array(z.string()),
  regulations: z.array(z.string()),
  semanticThemes: z.array(z.string()),
  trustSignals: z.array(z.string()),
  objections: z.array(z.string()),
  sourceReferences: z.array(z.object({
    id: z.string(),
    type: z.enum(['upload', 'url', 'manual', 'api']),
    label: z.string(),
    hash: z.string().optional(),
  })),
  compressedSummaryHash: z.string().optional(),
})

export const researchStageSchema = z.object({
  marketOpportunity: z.string(),
  competitiveLandscape: z.string(),
  audienceInsights: z.string(),
  trendSignals: z.array(z.string()),
  sbsScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
})

export const positioningStageSchema = z.object({
  requestedStrategy: z.string(),
  recommendedStrategy: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  decision: z.enum(['stay', 'adjust', 'override']),
  differentiators: z.array(z.string()),
  painToCapability: z.record(z.string()),
})

export const narrativeCandidateSchema = z.object({
  type: z.enum(NARRATIVE_TYPES),
  coreClaim: z.string(),
  problem: z.string(),
  mechanism: z.string(),
  outcome: z.string(),
  score: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  trust: z.number().min(0).max(1),
  narrativeRank: z.number(),
})

export const simulationStageSchema = z.object({
  candidates: z.array(narrativeCandidateSchema).min(1),
  topNarrative: narrativeCandidateSchema,
  totalGenerated: z.number(),
  filteredCount: z.number(),
})

export const platformScoreSchema = z.object({
  platform: z.enum(PLATFORMS),
  audienceDensity: z.number().min(0).max(1),
  engagementRate: z.number().min(0).max(1),
  topicRelevance: z.number().min(0).max(1),
  buyerPresence: z.number().min(0).max(1),
  compositeScore: z.number(),
})

export const postPackageSchema = z.object({
  platform: z.enum(PLATFORMS),
  copy: z.string(),
  creativePrompt: z.string(),
  cta: z.string(),
  qrLink: z.string().optional(),
  trackingLink: z.string().optional(),
  campaignId: z.string(),
})

export const packagingStageSchema = z.object({
  posts: z.array(postPackageSchema).min(1),
  platformScores: z.array(platformScoreSchema),
})

export const approvalStageSchema = z.object({
  approved: z.boolean(),
  approvedBy: z.string().optional(),
  approvedAt: z.number().optional(),
  riskFlags: z.array(z.string()),
  notes: z.string().optional(),
})

export const analyticsSnapshotSchema = z.object({
  campaignId: z.string(),
  window: z.enum(CHECKPOINT_WINDOWS),
  impressions: z.number(),
  engagements: z.number(),
  clicks: z.number(),
  shares: z.number(),
  engagementRate: z.number(),
  viralVelocity: z.number(),
  timestamp: z.number(),
})

export const checkpointEvaluationSchema = z.object({
  campaignId: z.string(),
  window: z.enum(CHECKPOINT_WINDOWS),
  engagementRate: z.number(),
  viralVelocity: z.number(),
  decision: z.enum(['boost', 'continue', 'pause', 'archive']),
  reasoning: z.string(),
})

export const learningUpdateSchema = z.object({
  campaignId: z.string(),
  narrativePerformance: z.record(z.number()),
  platformPreferences: z.record(z.number()),
  ctaPatterns: z.array(z.string()),
  themeEffectiveness: z.record(z.number()),
  bestWindow: z.enum(CHECKPOINT_WINDOWS),
  recommendation: z.enum(['scale', 'iterate', 'retire']),
  timestamp: z.number(),
})

export const lifecycleTransitionSchema = z.object({
  from: z.enum(LIFECYCLE_STATES),
  to: z.enum(LIFECYCLE_STATES),
  actor: z.string(),
  timestamp: z.number(),
  notes: z.string().optional(),
})
