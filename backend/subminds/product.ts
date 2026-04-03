/**
 * KLYC Product Submind
 * Positioning, pain-to-capability mapping, competitive contrast.
 * Powered by Claude API.
 */

import type { Submind, SubmindInput, SubmindOutput } from './submind_interface'
import { claudeClient, SUBMIND_MODELS } from '../services/claude_client'

export class ProductSubmind implements Submind {
  name = 'product'

  async execute(input: SubmindInput): Promise<SubmindOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Create product positioning for "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Business context: ${input.business_context ?? 'No context'}.
Research insights: ${JSON.stringify(previous)}.

Provide:
1. Core positioning statement (1-2 sentences)
2. Pain-to-capability mapping (3-5 pain points → product capabilities)
3. Key differentiators (3-5)
4. Competitive contrast points
5. Recommended messaging angle`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a product strategist for KLYC. Create sharp positioning that connects audience pain to product value. Be specific and avoid generic marketing language.',
        model: SUBMIND_MODELS.product,
      })

      return {
        submind: this.name,
        status: 'success',
        data: {
          positioning: ai.text,
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

export const productSubmind = new ProductSubmind()
export const productAgent = productSubmind
