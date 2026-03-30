/**
 * KLYC Normalizer Agent
 * Raw input → structured CampaignBrief with confidence scoring.
 * Does NOT use LLM — pure structural analysis and classification.
 * Migrated from ai-controller/backend/agents/normalizer.ts
 */

import { BaseAgent } from './base'
import type {
  NormalizationReportEnvelope,
  NormalizedCampaignBrief,
  OrchestrationContext,
  RequestType,
} from '../models/types'

export class NormalizerAgent extends BaseAgent {
  private static readonly WORKFLOW_VERSION = 'normalization-v2-claude'

  async process(context: OrchestrationContext): Promise<NormalizationReportEnvelope> {
    this.setStatus('processing', 'Normalizing input data')

    try {
      const request = context.originalRequest
      const compressed = this.compressContext(request)

      const normalized: NormalizedCampaignBrief = {
        type: this.classifyRequestType(request),
        campaign: request.campaign,
        platforms: request.platforms || [],
        contentTypes: request.contentTypes || [],
        keywords: request.keywords || [],
        includesMedia: this.checkMediaRequirement(request),
        context: compressed.context,
        timestamp: Date.now(),
      }

      const { contextCoverage, missingInputsCount, warningsCount } =
        this.calculateCoverage(request)

      const confidenceScore = Number(
        Math.min(
          1,
          (contextCoverage || 0) + (normalized.keywords.length ? 0.1 : 0)
        ).toFixed(2)
      )

      const envelope: NormalizationReportEnvelope = {
        runMetadata: {
          clientId: request.clientId ?? request.client_id ?? 'anonymous',
          clientName:
            request.clientName ??
            request.campaign?.name ??
            request.campaign?.campaignName,
          runTimestamp: new Date().toISOString(),
          workflowVersion: NormalizerAgent.WORKFLOW_VERSION,
          status: 'normalized',
        },
        normalizationChecksum: {
          contextCoverage,
          confidenceScore,
          missingInputsCount,
          warningsCount,
          sourceCount: this.countSources(request),
          compressionNotesCount: compressed.notesCount,
        },
        nextActions: this.buildNextActions(normalized, missingInputsCount),
        passFailState: this.buildPassFailState(
          confidenceScore,
          missingInputsCount,
          contextCoverage
        ),
        rawNormalizedObjects: {
          campaignBrief: normalized,
          customerContext: this.extractCustomerContext(request),
          orchestratorHints: {
            requestType: normalized.type,
            includesMedia: normalized.includesMedia,
            platformFocus: normalized.platforms.slice(0, 2),
            keywordFocus: normalized.keywords.slice(0, 5),
          },
          learningHooks: normalized.keywords.slice(0, 3).map(keyword => ({
            hook: keyword,
            note: `Lean into ${keyword} in early narratives`,
          })),
        },
      }

      this.incrementCompleted()
      return envelope
    } catch (error) {
      this.incrementErrors()
      throw error
    }
  }

  private classifyRequestType(request: any): RequestType {
    if (request.type) return request.type
    if (request.campaign && !request.campaignId) return 'campaign_create'
    if (request.campaignId || request.generateContent) return 'content_generate'
    if (request.research || request.trends) return 'research_request'
    if (request.analytics || request.metrics) return 'analytics_request'
    if (request.agentType) return 'agent_run'
    return 'campaign_create'
  }

  private checkMediaRequirement(request: any): boolean {
    const contentTypes = request.contentTypes || []
    return contentTypes.some((type: string) =>
      ['image', 'video', 'carousel'].includes(type)
    )
  }

  private compressContext(request: any): { context: string; notesCount: number } {
    const relevantFields = [
      'name', 'objective', 'audienceTargeting', 'keywords',
      'productInfo', 'companyInfo',
    ]
    const compressed: string[] = []
    relevantFields.forEach(field => {
      if (request[field]) {
        compressed.push(`${field}: ${request[field]}`)
      }
    })
    return { context: compressed.join(' | '), notesCount: compressed.length }
  }

  private calculateCoverage(request: any) {
    const relevantFields = [
      'name', 'objective', 'audienceTargeting', 'keywords',
      'productInfo', 'companyInfo',
    ]
    const provided = relevantFields.filter(field => {
      const value = request[field]
      if (value === undefined || value === null) return false
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim().length > 0
      return true
    })
    const contextCoverage = Number((provided.length / relevantFields.length).toFixed(2))
    return {
      contextCoverage,
      missingInputsCount: relevantFields.length - provided.length,
      warningsCount: relevantFields.length - provided.length,
    }
  }

  private countSources(request: any): number {
    const sources = request.sources || request.campaign?.sources
    if (Array.isArray(sources)) return sources.length
    return 0
  }

  private buildNextActions(normalized: NormalizedCampaignBrief, missingInputsCount: number) {
    const requiresResearch = normalized.keywords.length === 0
    const requiresProductPositioning = missingInputsCount > 2
    const requiresNarrativeSimulation =
      normalized.contentTypes.some(type =>
        ['thread', 'carousel', 'video'].includes(type)
      ) || normalized.platforms.length > 2
    const requiresPlatformEvaluation = normalized.platforms.length > 1

    return {
      requiresResearch,
      requiresProductPositioning,
      requiresNarrativeSimulation,
      requiresPlatformEvaluation,
      recommendedNextUpdate: requiresResearch
        ? 'Add keywords or research signals'
        : requiresProductPositioning
          ? 'Provide product positioning and audience notes'
          : 'Ready for orchestration handoff',
    }
  }

  private buildPassFailState(
    confidenceScore: number,
    missingInputsCount: number,
    contextCoverage: number
  ) {
    const blockedByMissingCriticalInputs = missingInputsCount > 3
    const lowConfidenceNormalization = confidenceScore < 0.45
    const needsClientContextRefresh = contextCoverage < 0.5

    return {
      readyForOrchestration:
        !blockedByMissingCriticalInputs && !lowConfidenceNormalization,
      blockedByMissingCriticalInputs,
      lowConfidenceNormalization,
      needsClientContextRefresh,
    }
  }

  private extractCustomerContext(request: any) {
    return {
      audience: request.audienceTargeting ?? request.audience ?? request.campaign?.audienceTargeting,
      brandVoice: request.brandVoice ?? request.campaign?.brandVoice,
      productInfo: request.productInfo ?? request.campaign?.productInfo,
      companyInfo: request.companyInfo ?? request.campaign?.companyInfo,
    }
  }
}
