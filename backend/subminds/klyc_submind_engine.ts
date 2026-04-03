import { claudeClient } from '../services/claude_client'
import type { Submind, SubmindInput, SubmindOutput, SubmindStatus } from './submind_interface'

/**
 * Submind focus areas representing the 9 distinct personality profiles
 * of the singular KLYC intelligence. One engine, many lenses.
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
 * Submind profile definition — each profile configures the engine's
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
 * KLYCSubmindEngine — the singular intelligence
 *
 * One engine. Nine submind focus areas. The engine itself doesn't change —
 * its focus does. Each submind is a different lens the same intelligence
 * looks through depending on which stage of the pipeline it's executing.
 */
export class KLYCSubmindEngine implements Submind {
  id: string
  name: string
  status: SubmindStatus

  constructor() {
    this.id = 'klyc-submind-engine'
    this.name = 'KLYC Submind Engine'
    this.status = 'success'
  }

  /**
   * Run the engine with a specific submind focus.
   */
  async run(focus: SubmindFocus, input: SubmindInput): Promise<SubmindOutput> {
    const profile = SUBMIND_PROFILES[focus]
    if (!profile) {
      throw new Error(`Unknown submind focus: ${focus}`)
    }

    const startTime = Date.now()

    try {
      let output: SubmindOutput

      if (profile.requiresLLM) {
        output = await this.executeWithClaude(profile, input)
      } else {
        output = this.executeNormalizer(input)
      }

      output.metadata = {
        ...output.metadata,
        executionTimeMs: Date.now() - startTime,
        submindFocus: focus,
      }

      return output
    } catch (error) {
      return {
        submind: focus,
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

  // Required by Submind interface — delegates to run()
  async execute(input: SubmindInput): Promise<SubmindOutput> {
    return this.run('normalizer', input)
  }

  private async executeWithClaude(
    profile: SubmindProfile,
    input: SubmindInput
  ): Promise<SubmindOutput> {
    const userPrompt = this.buildPrompt(profile, input)

    const result = await claudeClient.generateResponse({
      model: profile.model as string,
      system: profile.systemPrompt,
      prompt: userPrompt,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    })

    if (result.source === 'fallback') {
      return {
        submind: profile.focus,
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

    const parsedData = this.parseOutput(profile, result.text)

    return {
      submind: profile.focus,
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

  private executeNormalizer(input: SubmindInput): SubmindOutput {
    const context = input.context || {}
    const classification = this.classifyRequestType(context)
    const coverage = this.calculateCoverage(context)
    const nextActions = this.buildNextActions(context, coverage)

    return {
      submind: 'normalizer',
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

  private buildPrompt(profile: SubmindProfile, input: SubmindInput): string {
    const sections: string[] = []

    if (input.context) {
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

// Backward-compatible aliases
export const KLYCAgent = KLYCSubmindEngine
