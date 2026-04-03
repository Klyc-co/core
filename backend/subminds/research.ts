/**
 * KLYC Research Submind
 * CampaignBrief + CustomerDNA → market opportunity profile.
 * Powered by Claude API.
 */

import type { Submind, SubmindInput, SubmindOutput } from './submind_interface'
import { claudeClient, SUBMIND_MODELS } from '../services/claude_client'

export class ResearchSubmind implements Submind {
  name = 'research'

  async execute(input: SubmindInput): Promise<SubmindOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Research the market landscape for "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Business context: ${input.business_context ?? 'No additional context'}.
Prior data: ${JSON.stringify(previous)}.

Provide:
1. Market opportunity summary (2-3 sentences)
2. Competitive landscape overview
3. Key audience insights
4. 3-5 trend signals
5. Confidence score (0-1) for this analysis`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are an AI marketing research specialist for KLYC. Provide concise, actionable market intelligence. Return structured analysis. Keep responses under 800 words.',
        model: SUBMIND_MODELS.research,
      })

      return {
        submind: this.name,
        status: 'success',
        data: {
          analysis: ai.text,
          topic: input.campaign_topic,
          source: ai.source,
          model: ai.model,
        },
        elapsed_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
        metadata: { usage: ai.usage },
      }
    } catch (error) {
      return {
        submind: this.name,
        status: 'error',
        data: null,
        error: error instanceof Error ? error.message : String(error),
        elapsed_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }
  }
}

export const researchSubmind = new ResearchSubmind()
// Backward-compatible alias
export const researchAgent = researchSubmind
