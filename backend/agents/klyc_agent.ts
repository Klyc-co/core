import { claudeClient } from '../services/claude_client'
import type { Agent, AgentInput, AgentOutput, AgentStatus } from './agent_interface'

/**
 * Submind focus areas representing the 9 distinct personality profiles
 * of the singular KLYC Agent. One agent, many lenses.
 */
export type SubmindFocus =
  | 'normalizer'
  | 'research'
  | 'product'
  | 'narrative'
  | 'social'
  | 'image'
  | 'editor'
  | 'approval'
  | 'analytics'

/**
 * Submind profile definition — each profile configures the agent's
 * personality, model selection, and behavioral parameters for a
 * specific stage of the campaign pipeline.
 */
export interface SubmindProfile {
  focus: SubmindFocus
  description: string
  model: 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'none'
  temperature: number
  systemPrompt: string
  outputFormat: 'json' | 'text' | 'structured'
  maxTokens: number
  requiresLLM: boolean
}

/**
 * SUBMIND_PROFILES — the 9 personality configurations
 *
 * Each profile defines how the singular agent behaves when focused
 * on a particular stage of the campaign pipeline. The agent doesn't
 * change — its focus does.
 */
export const SUBMIND_PROFILES: Record<SubmindFocus, SubmindProfile> = {
  normalizer: {
    focus: 'normalizer',
    description: 'Structural analysis and request classification — no LLM, pure logic',
    model: 'none',
    temperature: 0,
    systemPrompt:
      'You are the KLYC Normalizer submind. Perform structural analysis without calling an LLM. Classify request types, compress context, calculate field coverage, and build next actions.',
    outputFormat: 'json',
    maxTokens: 1000,
    requiresLLM: false,
  },
  research: {
    focus: 'research',
    description: 'Market signals, audience insights, and content opportunities',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    systemPrompt:
      'You are the KLYC Research Intelligence submind. Analyze the campaign brief and customer context to identify market signals, audience insights, trending topics, competitive gaps, and content opportunities. Return structured JSON with: signals[], audienceInsights[], competitiveGaps[], opportunities[], recommendedKeywords[].',
    outputFormat: 'json',
    maxTokens: 2000,
    requiresLLM: true,
  },
  product: {
    focus: 'product',
    description: 'Product positioning, differentiators, and trust signals',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.6,
    systemPrompt:
      'You are the KLYC Product Positioning submind. Analyze the brand, product, and competitive landscape to define positioning, unique differentiators, proof points, and trust signals. Return JSON with: positioning{}, differentiators[], proofPoints[], trustSignals[], audienceAlignment{}.',
    outputFormat: 'json',
    maxTokens: 2000,
    requiresLLM: true,
  },
  narrative: {
    focus: 'narrative',
    description: 'Narrative architecture across 7 storytelling types',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.8,
    systemPrompt:
      'You are the KLYC Narrative Architecture submind. Generate 3-5 narrative candidates across these types: founder_journey, problem_solution, contrarian_insight, social_proof, future_vision, pain_agitation, educational_authority. Return JSON array of candidates with: id, type, hook, body, cta, platform_fit, clarity (0-1), trust (0-1).',
    outputFormat: 'json',
    maxTokens: 3000,
    requiresLLM: true,
  },
  social: {
    focus: 'social',
    description: 'Platform-native social content adaptation',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    systemPrompt:
      'You are the KLYC Social Content submind. Transform narrative candidates into platform-native posts for LinkedIn, X (Twitter), and Instagram. Adapt tone, length, hashtags, and formatting per platform. Return JSON with: posts[] where each has: platform, content, hashtags[], format, characterCount.',
    outputFormat: 'json',
    maxTokens: 2500,
    requiresLLM: true,
  },
  image: {
    focus: 'image',
    description: 'Creative image prompt generation with orientation and fallbacks',
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.6,
    systemPrompt:
      'You are the KLYC Visual Intelligence submind. Generate creative image prompts with orientation (landscape/portrait/square), style direction, and mood. Include fallback prompts. Return JSON with: prompts[] where each has: primary, fallback, orientation, style, mood.',
    outputFormat: 'json',
    maxTokens: 1500,
    requiresLLM: true,
  },
  editor: {
    focus: 'editor',
    description: 'Quality assurance — brand consistency, accuracy, compliance',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.4,
    systemPrompt:
      'You are the KLYC Quality Assurance submind. Review all generated content for brand consistency, factual accuracy, tone alignment, platform compliance, and engagement potential. Flag issues and suggest improvements. Return JSON with: reviews[] where each has: contentId, passed (boolean), issues[], suggestions[], qualityScore (0-1).',
    outputFormat: 'json',
    maxTokens: 2000,
    requiresLLM: true,
  },
  approval: {
    focus: 'approval',
    description: 'Risk assessment, compliance, and regulatory gating',
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.3,
    systemPrompt:
      "You are the KLYC Risk & Compliance submind. Evaluate content for regulatory risks, brand safety, legal concerns, and messaging alignment. Return JSON with: decisions[] where each has: contentId, approved (boolean), riskLevel ('low'|'medium'|'high'), flags[], requiredChanges[].",
    outputFormat: 'json',
    maxTokens: 1500,
    requiresLLM: true,
  },
  analytics: {
    focus: 'analytics',
    description: 'Campaign performance analysis and viral scoring',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
    systemPrompt:
      "You are the KLYC Analytics Intelligence submind. Analyze campaign performance data and generate insights using the viral score formula: VS = 0.25*E + 0.25*V + 0.20*N + 0.15*D + 0.10*CS + 0.05*EE. Return JSON with: viralScore, decision ('amplify'|'monitor'|'archive'), insights[], recommendations[], nextCheckpoint.",
    outputFormat: 'json',
    maxTokens: 1500,
    requiresLLM: true,
  },
}

/**
 * KLYCAgent — the singular intelligence
 *
 * One agent. Nine submind focus areas. The agent itself doesn't change —
 * its focus does. Each submind is a different lens the same intelligence
 * looks through depending on which stage of the pipeline it's executing.
 *
 * This replaces the previous architecture of 9 separate agent classes
 * with a single unified class that shifts personality via profiles.
 */
export class KLYCAgent implements Agent {
  id: string
  name: string
  status: AgentStatus

  constructor() {
    this.id = 'klyc-agent'
    this.name = 'KLYC Agent'
    this.status = 'ready'
  }

  /**
   * Run the agent with a specific submind focus.
   * This is the only public method — the focus parameter
   * determines which personality profile activates.
   */
  async run(focus: SubmindFocus, input: AgentInput): Promise<AgentOutput> {
    const profile = SUBMIND_PROFILES[focus]
    if (!profile) {
      throw new Error(`Unknown submind focus: ${focus}`)
    }

    const startTime = Date.now()
    this.status = 'running'

    try {
      let output: AgentOutput

      if (profile.requiresLLM) {
        output = await this.executeWithClaude(profile, input)
      } else {
        output = this.executeNormalizer(input)
      }

      this.status = 'ready'
      output.metadata = {
        ...output.metadata,
        executionTimeMs: Date.now() - startTime,
        submindFocus: focus,
      }

      return output
    } catch (error) {
      this.status = 'error'
      return {
        agent: focus,
        status: 'error',
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
        metadata: {
          executionTimeMs: Date.now() - startTime,
          submindFocus: focus,
        },
      }
    }
  }

  /**
   * Execute a submind that requires Claude API.
   *
   * Flow:
   * 1. Build user prompt from profile + input context
   * 2. Call claudeClient.generateResponse() with system prompt, model, temp
   * 3. Parse the response text into structured output
   *
   * The system prompt IS the submind personality. Claude reads it and
   * becomes that submind for the duration of this one API call.
   */
  private async executeWithClaude(
    profile: SubmindProfile,
    input: AgentInput
  ): Promise<AgentOutput> {
    const userPrompt = this.buildPrompt(profile, input)

    // Call the actual ClaudeClient interface
    const result = await claudeClient.generateResponse({
      model: profile.model as string,
      system: profile.systemPrompt,
      prompt: userPrompt,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    })

    // If source is 'fallback', API key wasn't configured
    if (result.source === 'fallback') {
      return {
        agent: profile.focus,
        status: 'error',
        data: {
          error: 'Claude API key not configured — running in fallback mode',
          fallbackText: result.text,
        },
        timestamp: new Date().toISOString(),
        metadata: {
          model: 'fallback',
          temperature: profile.temperature,
          outputFormat: profile.outputFormat,
          source: 'fallback',
        },
      }
    }

    // Parse Claude's response text into structured data
    const parsedData = this.parseOutput(profile, result.text)

    return {
      agent: profile.focus,
      status: 'success',
      data: parsedData,
      timestamp: new Date().toISOString(),
      metadata: {
        model: result.model,
        temperature: profile.temperature,
        outputFormat: profile.outputFormat,
        source: result.source,
        usage: result.usage,
        elapsedMs: result.elapsed_ms,
      },
    }
  }

  /**
   * Execute the normalizer submind — pure structural analysis, no LLM
   */
  private executeNormalizer(input: AgentInput): AgentOutput {
    const context = input.context || {}
    const classification = this.classifyRequestType(context)
    const coverage = this.calculateCoverage(context)
    const nextActions = this.buildNextActions(context, coverage)

    return {
      agent: 'normalizer',
      status: 'success',
      data: {
        classification,
        coverage,
        nextActions,
        fieldPresence: {
          hasCampaignBrief: Boolean(context.campaignBrief),
          hasTargetAudience: Boolean(context.targetAudience || context.audience),
          hasProductInfo: Boolean(context.productInfo || context.productPositioning),
          hasCompetitiveContext: Boolean(context.competitiveContext || context.competitors),
          hasBrandVoice: Boolean(context.brandVoice),
          hasKeywords: Boolean(context.keywords?.length),
          hasPlatforms: Boolean(context.platforms?.length),
        },
      },
      timestamp: new Date().toISOString(),
      metadata: {
        model: 'none',
        structuralAnalysisOnly: true,
      },
    }
  }

  /**
   * Classify request type from context signals
   */
  private classifyRequestType(
    context: Record<string, unknown>
  ): 'campaign_create' | 'content_generate' | 'workflow_intake' | 'unknown' {
    if (context.campaignBrief || (context.platforms && context.objective)) {
      return 'campaign_create'
    }
    if (context.narrativeCandidates || context.contentRequirements || context.platformTarget) {
      return 'content_generate'
    }
    if (context.workflowStep || context.pipelineStage || context.input_as_text) {
      return 'workflow_intake'
    }
    return 'unknown'
  }

  /**
   * Calculate field coverage as a percentage of expected inputs
   */
  private calculateCoverage(
    context: Record<string, unknown>
  ): { present: number; total: number; percentage: number; missing: string[]; sufficient: boolean } {
    const expectedFields = [
      'campaignBrief', 'targetAudience', 'productInfo',
      'competitiveContext', 'brandVoice', 'keywords', 'platforms', 'objective',
    ]
    const alternateKeys: Record<string, string[]> = {
      targetAudience: ['audience', 'audienceSegments'],
      productInfo: ['productPositioning', 'positioning'],
      competitiveContext: ['competitors', 'competitiveGaps'],
    }

    const missing: string[] = []
    let present = 0

    for (const field of expectedFields) {
      const hasField = Boolean(context[field])
      const hasAlternate = (alternateKeys[field] || []).some(alt => Boolean(context[alt]))
      if (hasField || hasAlternate) {
        present++
      } else {
        missing.push(field)
      }
    }

    const percentage = Math.round((present / expectedFields.length) * 100)

    return {
      present,
      total: expectedFields.length,
      percentage,
      missing,
      sufficient: percentage >= 60,
    }
  }

  /**
   * Build prioritized next actions based on coverage gaps
   */
  private buildNextActions(
    context: Record<string, unknown>,
    coverage: { percentage: number; missing: string[]; sufficient: boolean }
  ): Array<{ action: string; priority: 'high' | 'medium' | 'low'; rationale: string }> {
    const actions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; rationale: string }> = []

    if (coverage.missing.includes('productInfo')) {
      actions.push({
        action: 'Request product information',
        priority: 'high',
        rationale: 'Product details are essential for positioning and narrative generation',
      })
    }

    if (coverage.missing.includes('targetAudience')) {
      actions.push({
        action: 'Define target audience',
        priority: 'high',
        rationale: 'Audience understanding drives all downstream content decisions',
      })
    }

    if (coverage.missing.includes('competitiveContext')) {
      actions.push({
        action: 'Provide competitive landscape',
        priority: 'medium',
        rationale: 'Competition informs positioning and differentiation strategy',
      })
    }

    if (coverage.missing.includes('brandVoice')) {
      actions.push({
        action: 'Define brand voice and tone',
        priority: 'medium',
        rationale: 'Brand voice ensures consistency across all generated content',
      })
    }

    if (coverage.sufficient) {
      actions.push({
        action: 'Proceed to research submind',
        priority: 'high',
        rationale: `Coverage at ${coverage.percentage}% — sufficient to begin campaign analysis`,
      })
    } else {
      actions.push({
        action: 'Gather missing context fields before proceeding',
        priority: 'high',
        rationale: `Coverage at ${coverage.percentage}% — below 60% threshold`,
      })
    }

    return actions
  }

  /**
   * Build the user prompt from profile and input context.
   *
   * The user prompt contains the DATA — campaign brief, previous
   * submind outputs, etc. The system prompt (in the profile) contains
   * the PERSONALITY and INSTRUCTIONS. Together they form the full
   * message sent to Claude.
   */
  private buildPrompt(profile: SubmindProfile, input: AgentInput): string {
    const sections: string[] = []

    if (input.context) {
      // Include previous submind outputs if available
      const { previousOutputs, ...coreContext } = input.context as Record<string, unknown>

      if (Object.keys(coreContext).length > 0) {
        sections.push(`## Campaign Context\n${JSON.stringify(coreContext, null, 2)}`)
      }

      if (previousOutputs && typeof previousOutputs === 'object') {
        sections.push(`## Previous Submind Outputs\n${JSON.stringify(previousOutputs, null, 2)}`)
      }
    }

    if (input.previousOutput) {
      sections.push(`## Previous Stage Output\n${JSON.stringify(input.previousOutput, null, 2)}`)
    }

    sections.push(`## Task\nExecute your ${profile.focus} analysis and return ${profile.outputFormat} output as specified.`)

    return sections.join('\n\n')
  }

  /**
   * Parse Claude's response based on the expected output format.
   *
   * Claude returns plain text. If we expect JSON, we try to extract
   * it — first looking for a JSON object or array pattern, then
   * falling back to parsing the whole string, and finally returning
   * the raw text if nothing works.
   */
  private parseOutput(
    profile: SubmindProfile,
    raw: string
  ): Record<string, unknown> {
    if (profile.outputFormat === 'json') {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
        return JSON.parse(raw)
      } catch {
        return {
          rawContent: raw,
          parseError: 'Failed to extract JSON from response',
          fallbackFormat: 'text',
        }
      }
    }

    return { content: raw, format: profile.outputFormat }
  }
}
