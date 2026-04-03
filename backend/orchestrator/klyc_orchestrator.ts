/**
 * KLYC Orchestrator
 * Main orchestrator that runs all subminds in sequence.
 * Powered by Claude.
 */

import type { SubmindInput, SubmindOutput } from '../subminds/submind_interface'
import { researchSubmind } from '../subminds/research'
import { productSubmind } from '../subminds/product'
import { narrativeSubmind } from '../subminds/narrative'
import { socialSubmind } from '../subminds/social'
import { imageSubmind } from '../subminds/image'
import { editorSubmind } from '../subminds/editor'
import { approvalSubmind } from '../subminds/approval'
import { analyticsSubmind } from '../subminds/analytics'
import { executeSubmind } from './submind_runner'
import { formatCampaignResponse, generateCampaignId } from '../utils/response_formatter'
import { CampaignLifecycleProcessor } from './campaign_lifecycle'
import type { CampaignResponse } from '../utils/response_formatter'

const SUBMIND_CHAIN = [
  researchSubmind,
  productSubmind,
  narrativeSubmind,
  socialSubmind,
  imageSubmind,
  editorSubmind,
  approvalSubmind,
  analyticsSubmind,
]

export interface OrchestratorInput {
  campaign_topic: string
  business_context?: string
  audience?: string
}

export interface OrchestratorResult {
  success: boolean
  data?: CampaignResponse
  error?: string
}

export class KLYCOrchestrator {
  private lifecycle = new CampaignLifecycleProcessor()

  async runCampaign(request: OrchestratorInput): Promise<OrchestratorResult> {
    const campaignId = generateCampaignId()

    try {
      if (!request.campaign_topic?.trim()) {
        return { success: false, error: 'campaign_topic is required' }
      }

      const submindResults = await this.runSubmindChain(request)
      const lifecycleResult = this.lifecycle.processResults(campaignId, submindResults)

      const response = formatCampaignResponse(submindResults, {
        campaignId,
        metadata: {
          topic: request.campaign_topic,
          audience: request.audience,
          orchestrator_version: 'v2-claude',
        },
        lifecycle: lifecycleResult,
      })

      return { success: true, data: response }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async runSubmindChain(request: OrchestratorInput): Promise<SubmindOutput[]> {
    const results: SubmindOutput[] = []
    let previousOutput: Record<string, unknown> = {}

    for (const submind of SUBMIND_CHAIN) {
      const input: SubmindInput = {
        campaign_topic: request.campaign_topic,
        business_context: request.business_context,
        audience: request.audience,
        previous_output: previousOutput,
      }

      const result = await executeSubmind(submind, input, { timeoutMs: 30000 })
      results.push(result)

      if (result.status === 'success' && result.data) {
        previousOutput = {
          ...previousOutput,
          [result.submind]: result.data,
        }
      }
    }

    return results
  }
}

export const orchestrator = new KLYCOrchestrator()
