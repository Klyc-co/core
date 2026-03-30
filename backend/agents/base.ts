/**
 * KLYC Base Agent
 * Shared infrastructure for backend agents (normalizer, strategy, etc.).
 * Provides status tracking, error counting, and lifecycle hooks.
 */

import type { OrchestrationContext } from '../models/types'

export type AgentProcessStatus = 'idle' | 'processing' | 'completed' | 'error'

export abstract class BaseAgent {
  protected status: AgentProcessStatus = 'idle'
  protected statusMessage = ''
  protected completedCount = 0
  protected errorCount = 0

  abstract process(context: OrchestrationContext): Promise<unknown>

  protected setStatus(status: AgentProcessStatus, message: string) {
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
