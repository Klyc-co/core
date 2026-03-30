/**
 * KLYC Agent Interface Contracts
 * Defines the universal agent communication protocol.
 * All agents implement Agent and use AgentInput/AgentOutput.
 */

export type AgentStatus = 'success' | 'error'

export interface AgentInput {
  campaign_topic: string
  business_context?: string
  audience?: string
  previous_output?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface AgentOutput {
  agent: string
  status: AgentStatus
  data: Record<string, unknown> | null
  error?: string
  elapsed_ms?: number
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Agent {
  name: string
  execute(input: AgentInput): Promise<AgentOutput>
}
