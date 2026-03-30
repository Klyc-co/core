/**
 * KLYC Orchestrator
 * Main orchestrator that runs all agents in sequence.
 * Migrated from ai-controller, now powered by Claude.
 */

import type { AgentInput, AgentOutput } from '../agents/agent_interface'
import { researchAgent } from '../agents/research'
import { productAgent } from '../agents/product'
import { narrativeAgent } from '../agents/narrative'
import { socialAgent } from '../agents/social'
import { imageAgent } from '../agents/image'
import { editorAgent } from '../agents/editor'
import { approvalAgent } from '../agents/approval'
import { analyticsAgent } from '../agents/analytics'
import { executeAgent } from './agent_runner'
import { formatCampaignResponse, generateCampaignId } from '../utils/response_formatter'
import { CampaignLifecycleProcessor } from './campaign_lifecycle'
import type { CampaignResponse } from '../utils/response_formatter'

const AGENT_CHAIN = [
  researchAgent,
  productAgent,
  narrativeAgent,
  socialAgent,
  imageAgent,
  editorAgent,
  approvalAgent,
  analyticsAgent,
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
      // Validate input
      if (!request.campaign_topic?.trim()) {
        return { success: false, error: 'campaign_topic is required' }
      }

      // Run the agent chain
      const agentResults = await this.runAgentChain(request)

      // Process lifecycle
      const lifecycleResult = this.lifecycle.processResults(campaignId, agentResults)

      // Format response
      const response = formatCampaignResponse(agentResults, {
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

  private async runAgentChain(request: OrchestratorInput): Promise<AgentOutput[]> {
    const results: AgentOutput[] = []
    let previousOutput: Record<string, unknown> = {}

    for (const agent of AGENT_CHAIN) {
      const input: AgentInput = {
        campaign_topic: request.campaign_topic,
        business_context: request.business_context,
        audience: request.audience,
        previous_output: previousOutput,
      }

      const result = await executeAgent(agent, input, { timeoutMs: 30000 })
      results.push(result)

      // Accumulate successful results for next agent
      if (result.status === 'success' && result.data) {
        previousOutput = {
          ...previousOutput,
          [result.agent]: result.data,
        }
      }
    }

    return results
  }
}

export const orchestrator = new KLYCOrchestrator()
