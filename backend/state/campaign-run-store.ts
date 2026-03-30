import type { AgentOutput } from '../agents/agent_interface'
import type { LearningUpdate } from '../models/types'

type SerializableRecord = Record<string, unknown>

export interface TimelineMetric {
  timestamp: string
  label?: string
  metrics?: Record<string, number | undefined>
  data?: SerializableRecord
  source?: string
}

export interface CampaignRunRecord {
  run_id: string
  client_id: string
  client_name: string
  workflow_version: string
  run_timestamp: string
  normalized_campaign_package?: Record<string, unknown>
  orchestration_package?: SerializableRecord
  agent_outputs: AgentOutput[]
  timeline_metrics: TimelineMetric[]
  learning_updates: LearningUpdate[]
  final_status?: string
}

export type CampaignRunInput = Omit<
  CampaignRunRecord,
  'agent_outputs' | 'timeline_metrics' | 'learning_updates'
> & {
  agent_outputs?: AgentOutput[]
  timeline_metrics?: TimelineMetric[]
  learning_updates?: LearningUpdate[]
  run_timestamp?: string
}

export type CampaignRunUpdate = Partial<Omit<CampaignRunRecord, 'run_id'>> & {
  agent_outputs?: AgentOutput[]
  timeline_metrics?: TimelineMetric[]
  learning_updates?: LearningUpdate[]
}

export interface CampaignRunStoreInterface {
  createRun(input: CampaignRunInput): Promise<CampaignRunRecord>
  updateRun(runId: string, updates: CampaignRunUpdate): Promise<CampaignRunRecord | undefined>
  appendAgentOutput(runId: string, output: AgentOutput): Promise<CampaignRunRecord | undefined>
  appendTimelineMetric(runId: string, metric: TimelineMetric): Promise<CampaignRunRecord | undefined>
  appendLearningUpdate(runId: string, update: LearningUpdate): Promise<CampaignRunRecord | undefined>
  getRunById(runId: string): Promise<CampaignRunRecord | undefined>
}

const cloneValue = <T>(value: T): T => {
  if (value === undefined) return value

  if (globalThis.structuredClone) {
    try {
      return globalThis.structuredClone(value)
    } catch {
      // Fallback to JSON serialization
    }
  }

  return JSON.parse(JSON.stringify(value))
}

const cloneArray = <T>(items: T[] = []): T[] => items.map(item => cloneValue(item))

const ensureTimestamp = (value?: string): string => {
  const normalized = value?.trim()
  return normalized ? normalized : new Date().toISOString()
}

class InMemoryCampaignRunStore implements CampaignRunStoreInterface {
  private runs = new Map<string, CampaignRunRecord>()

  async createRun(input: CampaignRunInput): Promise<CampaignRunRecord> {
    this.validateRequired(input)

    if (this.runs.has(input.run_id)) {
      throw new Error(`run_id ${input.run_id} already exists`)
    }

    const record = this.buildRecord(input)
    this.runs.set(record.run_id, this.cloneRecord(record))
    return this.cloneRecord(record)
  }

  async updateRun(
    runId: string,
    updates: CampaignRunUpdate
  ): Promise<CampaignRunRecord | undefined> {
    return this.mutate(runId, record => {
      if (updates.client_id !== undefined) {
        record.client_id = updates.client_id
      }
      if (updates.client_name !== undefined) {
        record.client_name = updates.client_name
      }
      if (updates.workflow_version !== undefined) {
        record.workflow_version = updates.workflow_version
      }
      if (updates.run_timestamp !== undefined) {
        record.run_timestamp = ensureTimestamp(updates.run_timestamp)
      }
      if (updates.normalized_campaign_package !== undefined) {
        record.normalized_campaign_package = cloneValue(updates.normalized_campaign_package)
      }
      if (updates.orchestration_package !== undefined) {
        record.orchestration_package = cloneValue(updates.orchestration_package)
      }
      if (updates.agent_outputs) {
        record.agent_outputs = cloneArray(updates.agent_outputs)
      }
      if (updates.timeline_metrics) {
        record.timeline_metrics = cloneArray(updates.timeline_metrics)
      }
      if (updates.learning_updates) {
        record.learning_updates = cloneArray(updates.learning_updates)
      }
      if (updates.final_status !== undefined) {
        record.final_status = updates.final_status
      }
    })
  }

  async appendAgentOutput(
    runId: string,
    output: AgentOutput
  ): Promise<CampaignRunRecord | undefined> {
    return this.mutate(runId, record => {
      record.agent_outputs.push(cloneValue(output))
    })
  }

  async appendTimelineMetric(
    runId: string,
    metric: TimelineMetric
  ): Promise<CampaignRunRecord | undefined> {
    return this.mutate(runId, record => {
      record.timeline_metrics.push(cloneValue(metric))
    })
  }

  async appendLearningUpdate(
    runId: string,
    update: LearningUpdate
  ): Promise<CampaignRunRecord | undefined> {
    return this.mutate(runId, record => {
      record.learning_updates.push(cloneValue(update))
    })
  }

  async getRunById(runId: string): Promise<CampaignRunRecord | undefined> {
    const record = this.runs.get(runId)
    return record ? this.cloneRecord(record) : undefined
  }

  private validateRequired(input: CampaignRunInput) {
    if (!input.run_id?.trim()) {
      throw new Error('run_id is required')
    }
    if (!input.client_id?.trim()) {
      throw new Error('client_id is required')
    }
    if (!input.client_name?.trim()) {
      throw new Error('client_name is required')
    }
    if (!input.workflow_version?.trim()) {
      throw new Error('workflow_version is required')
    }
  }

  private buildRecord(input: CampaignRunInput): CampaignRunRecord {
    const record: CampaignRunRecord = {
      run_id: input.run_id.trim(),
      client_id: input.client_id.trim(),
      client_name: input.client_name.trim(),
      workflow_version: input.workflow_version.trim(),
      run_timestamp: ensureTimestamp(input.run_timestamp),
      agent_outputs: cloneArray(input.agent_outputs ?? []),
      timeline_metrics: cloneArray(input.timeline_metrics ?? []),
      learning_updates: cloneArray(input.learning_updates ?? [])
    }

    if (input.normalized_campaign_package !== undefined) {
      record.normalized_campaign_package = cloneValue(input.normalized_campaign_package)
    }
    if (input.orchestration_package !== undefined) {
      record.orchestration_package = cloneValue(input.orchestration_package)
    }
    if (input.final_status !== undefined) {
      record.final_status = input.final_status
    }

    return record
  }

  private mutate(
    runId: string,
    mutator: (record: CampaignRunRecord) => void
  ): Promise<CampaignRunRecord | undefined> {
    const existing = this.runs.get(runId)
    if (!existing) return Promise.resolve(undefined)

    const working = this.cloneRecord(existing)
    mutator(working)
    this.runs.set(runId, this.cloneRecord(working))
    return Promise.resolve(this.cloneRecord(working))
  }

  private cloneRecord(record: CampaignRunRecord): CampaignRunRecord {
    return cloneValue(record)
  }
}

export { InMemoryCampaignRunStore }
export const campaignRunStore: CampaignRunStoreInterface = new InMemoryCampaignRunStore()
