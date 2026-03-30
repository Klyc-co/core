/**
 * KLYC Response Formatter
 * Compresses agent results into a unified campaign response.
 * Migrated from ai-controller/core/utils/response_formatter.ts
 */

import type { AgentOutput, AgentStatus } from '../agents/agent_interface'

type CompressedPayload = {
  research: Record<string, unknown>
  narrative: Record<string, unknown>
  social: Record<string, unknown>
  images: Record<string, unknown>
  product: Record<string, unknown>
  editor: Record<string, unknown>
  analytics: Record<string, unknown>
}

export type CampaignResponse = {
  campaign_id: string
  timestamp: number
  agents_executed: string[]
  compressed_payload: CompressedPayload
  metadata: CampaignMetadata
  lifecycle?: any
}

type CampaignMetadata = {
  agent_count: number
  successful_agents: number
  failed_agents: number
  agent_statuses: Record<string, AgentStatus>
  agent_errors: Record<string, string>
  [key: string]: unknown
}

const AGENT_KEY_MAP: Record<string, keyof CompressedPayload> = {
  research: 'research',
  narrative: 'narrative',
  social: 'social',
  image: 'images',
  product: 'product',
  editor: 'editor',
  analytics: 'analytics',
}

const normalizeData = (data: AgentOutput['data']): Record<string, unknown> => {
  if (!data || typeof data !== 'object') return {}
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>
  } catch {
    return {}
  }
}

const normalizePayload = (agentResults: AgentOutput[]): CompressedPayload => {
  const base: CompressedPayload = {
    research: {},
    narrative: {},
    social: {},
    images: {},
    product: {},
    editor: {},
    analytics: {},
  }

  for (const result of agentResults) {
    const key = AGENT_KEY_MAP[result.agent]
    if (!key) continue
    base[key] = normalizeData(result.data)
  }

  return base
}

export const generateCampaignId = (): string => {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID()
  }
  return `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const buildMetadata = (
  agentResults: AgentOutput[],
  extras: Record<string, unknown> = {}
): CampaignMetadata => {
  const agent_statuses = agentResults.reduce<Record<string, AgentStatus>>((acc, result) => {
    acc[result.agent] = result.status
    return acc
  }, {})

  const agent_errors = agentResults.reduce<Record<string, string>>((acc, result) => {
    if (result.status === 'error' && result.error) {
      acc[result.agent] = result.error
    }
    return acc
  }, {})

  const successful_agents = agentResults.filter(r => r.status === 'success').length
  const failed_agents = agentResults.length - successful_agents

  return {
    agent_count: agentResults.length,
    successful_agents,
    failed_agents,
    agent_statuses,
    agent_errors,
    ...extras,
  }
}

export function formatCampaignResponse(
  agentResults: AgentOutput[],
  options: {
    campaignId?: string
    metadata?: Record<string, unknown>
    lifecycle?: any
  } = {}
): CampaignResponse {
  const agents_executed = [...new Set(agentResults.map(r => r.agent))]
  const compressed_payload = normalizePayload(agentResults)

  return {
    campaign_id: options.campaignId ?? generateCampaignId(),
    timestamp: Date.now(),
    agents_executed,
    compressed_payload,
    metadata: buildMetadata(agentResults, options.metadata),
    lifecycle: options.lifecycle,
  }
}
