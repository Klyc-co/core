/**
 * KLYC Submind Interface Contracts
 * Defines the universal submind communication protocol.
 * All subminds implement Submind and use SubmindInput/SubmindOutput.
 */

export type SubmindStatus = 'success' | 'error'

export interface SubmindInput {
  campaign_topic: string
  business_context?: string
  audience?: string
  previous_output?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface SubmindOutput {
  submind: string
  status: SubmindStatus
  data: Record<string, unknown> | null
  error?: string
  elapsed_ms?: number
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Submind {
  name: string
  execute(input: SubmindInput): Promise<SubmindOutput>
}

// ---- Backward-compatible aliases ----
export type AgentStatus = SubmindStatus
export type AgentInput = SubmindInput
export type AgentOutput = SubmindOutput
export type Agent = Submind
