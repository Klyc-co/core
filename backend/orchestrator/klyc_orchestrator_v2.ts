import { KLYCSubmindEngine, type SubmindFocus } from '../subminds/klyc_submind_engine'
import type { SubmindInput, SubmindOutput } from '../subminds/submind_interface'
import { formatCampaignResponse, generateCampaignId } from '../utils/response_formatter'

/**
 * Result from a single submind execution within the pipeline
 */
export interface SubmindExecutionResult {
  focus: SubmindFocus
  output: SubmindOutput
  executionTimeMs: number
  timestamp: string
}

/**
 * Full orchestrator result with complete pipeline trace
 */
export interface OrchestratorResult {
  campaignId: string
  status: 'success' | 'partial' | 'failed'
  version: string
  startedAt: string
  completedAt: string
  totalExecutionTimeMs: number
  executionHistory: SubmindExecutionResult[]
  finalOutput: Record<string, unknown>
  errors: Array<{
    focus: SubmindFocus
    error: string
    timestamp: string
  }>
}

/**
 * The sequential pipeline order — one engine, nine focus areas
 */
const PIPELINE_ORDER: SubmindFocus[] = [
  'normalizer',
  'research',
  'product',
  'narrative',
  'social',
  'image',
  'editor',
  'approval',
  'analytics',
]

/**
 * KLYCOrchestratorV2 — unified pipeline orchestrator
 *
 * Drives the singular KLYCSubmindEngine through the complete campaign pipeline.
 * Each submind's output feeds into the next submind's input — one
 * continuous stream of intelligence flowing through nine lenses.
 *
 * Version: v3-singular-submind-engine
 */
export class KLYCOrchestratorV2 {
  private engine: KLYCSubmindEngine
  private version = 'v3-singular-submind-engine'

  constructor() {
    this.engine = new KLYCSubmindEngine()
  }

  /**
   * Run the complete pipeline: normalizer → research → product → narrative
   * → social → image → editor → approval → analytics
   */
  async runPipeline(initialInput: SubmindInput): Promise<OrchestratorResult> {
    return this.executePipeline(PIPELINE_ORDER, initialInput)
  }

  /**
   * Run a single submind outside the pipeline (for testing or re-runs)
   */
  async runSingleSubmind(
    focus: SubmindFocus,
    input: SubmindInput
  ): Promise<SubmindOutput> {
    console.log(`[KLYC] Running single submind: ${focus}`)
    return this.engine.run(focus, input)
  }

  /**
   * Resume the pipeline from a specific submind forward
   */
  async runPipelineFrom(
    startingFocus: SubmindFocus,
    input: SubmindInput
  ): Promise<OrchestratorResult> {
    const startIndex = PIPELINE_ORDER.indexOf(startingFocus)
    if (startIndex === -1) {
      throw new Error(`Unknown submind focus: ${startingFocus}`)
    }
    const remaining = PIPELINE_ORDER.slice(startIndex)
    console.log(`[KLYC] Resuming pipeline from ${startingFocus}: ${remaining.join(' → ')}`)
    return this.executePipeline(remaining, input)
  }

  /**
   * Core execution engine — runs a sequence of submind focuses
   */
  private async executePipeline(
    sequence: SubmindFocus[],
    initialInput: SubmindInput
  ): Promise<OrchestratorResult> {
    const campaignId = generateCampaignId()
    const startTime = Date.now()
    const startedAt = new Date().toISOString()

    console.log(`[KLYC] Pipeline ${campaignId} — ${sequence.join(' → ')}`)

    const executionHistory: SubmindExecutionResult[] = []
    const errors: OrchestratorResult['errors'] = []
    let currentInput = { ...initialInput }
    const accumulatedOutput: Record<string, unknown> = {}

    for (let i = 0; i < sequence.length; i++) {
      const focus = sequence[i]
      const stepStart = Date.now()
      const stepLabel = focus === 'normalizer'
        ? `${focus} — Normalizing incoming data`
        : `${focus} — Step ${i}/${sequence.length - 1}`

      console.log(`[KLYC] ${stepLabel}`)

      try {
        const enrichedInput: SubmindInput = {
          ...currentInput,
          context: {
            ...currentInput.context,
            previousOutputs: accumulatedOutput,
            pipelinePosition: { step: i, total: sequence.length, focus },
          },
        }

        const result = await this.engine.run(focus, enrichedInput)
        const executionTimeMs = Date.now() - stepStart

        console.log(`[KLYC] ${focus} completed in ${executionTimeMs}ms`)

        executionHistory.push({
          focus,
          output: result,
          executionTimeMs,
          timestamp: new Date().toISOString(),
        })

        accumulatedOutput[focus] = result.data
        currentInput = {
          ...currentInput,
          previousOutput: result.data,
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`[KLYC] ${focus} FAILED: ${msg}`)

        errors.push({
          focus,
          error: msg,
          timestamp: new Date().toISOString(),
        })

        accumulatedOutput[focus] = { error: msg, status: 'failed' }
      }
    }

    const totalExecutionTimeMs = Date.now() - startTime
    const completedAt = new Date().toISOString()
    const status = errors.length === 0
      ? 'success'
      : errors.length < sequence.length
        ? 'partial'
        : 'failed'

    console.log(`[KLYC] Pipeline ${campaignId} ${status} in ${totalExecutionTimeMs}ms (${errors.length} errors)`)

    return {
      campaignId,
      status,
      version: this.version,
      startedAt,
      completedAt,
      totalExecutionTimeMs,
      executionHistory,
      finalOutput: accumulatedOutput,
      errors,
    }
  }

  /**
   * Get performance metrics from a pipeline result
   */
  getMetrics(result: OrchestratorResult) {
    const times = result.executionHistory.map(e => ({
      focus: e.focus,
      ms: e.executionTimeMs,
    }))

    const sorted = [...times].sort((a, b) => b.ms - a.ms)

    return {
      totalTimeMs: result.totalExecutionTimeMs,
      avgSubmindTimeMs: times.length
        ? Math.round(times.reduce((s, t) => s + t.ms, 0) / times.length)
        : 0,
      slowest: sorted[0] || null,
      fastest: sorted[sorted.length - 1] || null,
      perSubmind: Object.fromEntries(times.map(t => [t.focus, t.ms])),
      successCount: result.executionHistory.length,
      errorCount: result.errors.length,
    }
  }

  /** Pipeline order accessor */
  getPipelineOrder(): SubmindFocus[] {
    return [...PIPELINE_ORDER]
  }
}

/** Default orchestrator instance */
export const orchestratorV2 = new KLYCOrchestratorV2()
