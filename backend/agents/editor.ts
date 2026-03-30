/**
 * KLYC Editor Agent
 * Final QA — brand consistency, tone check, checklist validation.
 * Reviews all prior agent output before approval.
 */

import type { Agent, AgentInput, AgentOutput } from './agent_interface'
import { claudeClient, AGENT_MODELS } from '../services/claude_client'

export class EditorAgent implements Agent {
  name = 'editor'

  async execute(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Review the following campaign content for "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Business context: ${input.business_context ?? 'No context'}.

Content to review:
${JSON.stringify(previous, null, 2)}

Perform editorial review:
1. Brand consistency check — does the tone match across all outputs?
2. Factual accuracy flags — anything that could be misleading?
3. Platform appropriateness — is each post native to its platform?
4. CTA effectiveness — are the calls to action clear and compelling?
5. Risk flags — anything that could be controversial or off-brand?
6. Overall quality score (0-1)
7. Specific edits recommended (if any)

Return a JSON object with: { qualityScore, brandConsistent, riskFlags, edits, approved, notes }`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a senior editor and brand guardian for KLYC. Review campaign content with a sharp eye for quality, consistency, and risk. Return valid JSON.',
        model: AGENT_MODELS.editor,
      })

      let review: Record<string, unknown> = {}
      try {
        const jsonMatch = ai.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          review = JSON.parse(jsonMatch[0])
        }
      } catch {
        review = { raw: ai.text, parseError: true, qualityScore: 0.5 }
      }

      return {
        agent: this.name,
        status: 'success',
        data: {
          review,
          source: ai.source,
          model: ai.model,
        },
        elapsed_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
        metadata: { usage: ai.usage },
      }
    } catch (error) {
      return {
        agent: this.name,
        status: 'error',
        data: null,
        error: error instanceof Error ? error.message : String(error),
        elapsed_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }
  }
}

export const editorAgent = new EditorAgent()
