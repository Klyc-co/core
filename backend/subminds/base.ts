/**
 * KLYC Base Submind
 * Shared infrastructure for backend subminds (normalizer, strategy, etc.).
 * Provides status tracking, error counting, and lifecycle hooks.
 */

import type { OrchestrationContext } from '../models/types'

export type SubmindProcessStatus = 'idle' | 'processing' | 'completed' | 'error'

export abstract class BaseSubmind {
  protected status: SubmindProcessStatus = 'idle'
  protected statusMessage = ''
  protected completedCount = 0
  protected errorCount = 0

  abstract process(context: OrchestrationContext): Promise<unknown>

  protected setStatus(status: SubmindProcessStatus, message: string) {
    this.status = status
    this.statusMessage = message
  }

  protected incrementCompleted() {
    this.completedCount++
    this.status = 'completed'
  }

  protected incrementErrors() {
    this.errorCount++
    this.status = 'error'
  }

  getStatus() {
    return {
      status: this.status,
      message: this.statusMessage,
      completed: this.completedCount,
      errors: this.errorCount,
    }
  }
}

// Backward-compatible alias
export type AgentProcessStatus = SubmindProcessStatus
export const BaseAgent = BaseSubmind
