/**
 * KLYC Claude API Client
 * Replaces core/services/openai_client.ts
 *
 * Uses Anthropic Messages API directly via fetch (no SDK dependency).
 * Supports multi-model architecture: each agent can specify its preferred model.
 */

export interface ClaudeGenerateOptions {
  prompt: string
  system?: string
  model?: string
  maxTokens?: number
  temperature?: number
  metadata?: Record<string, unknown>
}

export interface ClaudeResult {
  text: string
  model: string
  source: 'claude' | 'fallback'
  usage?: { input_tokens: number; output_tokens: number }
  elapsed_ms: number
}

export class ClaudeClient {
  private readonly apiKey?: string
  private readonly defaultModel: string
  private readonly timeoutMs: number
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages'
  private readonly apiVersion = '2023-06-01'

  constructor(options?: { apiKey?: string; model?: string; timeoutMs?: number }) {
    const env = (globalThis as any).process?.env
    this.apiKey = options?.apiKey ?? env?.ANTHROPIC_API_KEY ?? env?.CLAUDE_API_KEY
    this.defaultModel = options?.model ?? 'claude-sonnet-4-20250514'
    this.timeoutMs = options?.timeoutMs ?? 30000
  }

  async generateResponse(options: ClaudeGenerateOptions): Promise<ClaudeResult> {
    const start = Date.now()
    const model = options.model ?? this.defaultModel

    if (!this.apiKey) {
      return this.fallbackResponse(options, start)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const body: Record<string, unknown> = {
        model,
        max_tokens: options.maxTokens ?? 4096,
        messages: [{ role: 'user', content: options.prompt }],
      }

      if (options.system) {
        body.system = options.system
      }

      if (options.temperature !== undefined) {
        body.temperature = options.temperature
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error')
        throw new Error(`Claude API error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      const text = data.content
        ?.filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('') ?? ''

      return {
        text,
        model: data.model ?? model,
        source: 'claude',
        usage: data.usage,
        elapsed_ms: Date.now() - start,
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Claude API timeout after ${this.timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private fallbackResponse(options: ClaudeGenerateOptions, start: number): ClaudeResult {
    return {
      text: `[Fallback] Claude API key not configured. Prompt received: "${options.prompt.slice(0, 100)}..."`,
      model: 'fallback',
      source: 'fallback',
      elapsed_ms: Date.now() - start,
    }
  }
}

/**
 * Model presets for different agent roles.
 * Adjust per agent based on cost/quality/speed tradeoffs.
 *
 * - haiku: fast, cheap — good for structured extraction and simple tasks
 * - sonnet: balanced — default for most creative and analytical work
 * - opus: heavy — reserved for complex multi-step reasoning if needed
 */
export const AGENT_MODELS = {
  normalizer: 'claude-haiku-3-5-20241022',
  research: 'claude-sonnet-4-20250514',
  product: 'claude-sonnet-4-20250514',
  narrative: 'claude-sonnet-4-20250514',
  social: 'claude-sonnet-4-20250514',
  image: 'claude-haiku-3-5-20241022',
  editor: 'claude-sonnet-4-20250514',
  approval: 'claude-haiku-3-5-20241022',
  analytics: 'claude-sonnet-4-20250514',
} as const

export type AgentModelKey = keyof typeof AGENT_MODELS

/** Singleton instance — all agents import this */
export const claudeClient = new ClaudeClient()
