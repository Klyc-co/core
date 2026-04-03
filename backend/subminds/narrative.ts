/**
 * KLYC Narrative Submind
 * Generates scored narrative candidates across 7 types.
 * Core creative engine — uses Claude Sonnet for quality.
 */

import type { Submind, SubmindInput, SubmindOutput } from './submind_interface'
import { claudeClient, SUBMIND_MODELS } from '../services/claude_client'

export class NarrativeSubmind implements Submind {
  name = 'narrative'

  async execute(input: SubmindInput): Promise<SubmindOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Generate narrative candidates for a marketing campaign about "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Business context: ${input.business_context ?? 'No context'}.
Product positioning & research: ${JSON.stringify(previous)}.

Generate 3-5 narrative candidates. Each must be one of these 7 types:
- hidden_truth: Reveals something the audience doesn't know
- threat_warning: Highlights a risk of inaction
- framework_revelation: Provides a new mental model
- status_upgrade: Positions the audience as elite/ahead
- contrarian_insight: Challenges conventional wisdom
- future_prediction: Forecasts what's coming
- tool_discovery: Reveals a powerful capability

For each narrative provide:
- type (from the 7 above)
- coreClaim (1 sentence)
- problem (what pain it addresses)
- mechanism (how it works)
- outcome (what the audience gains)
- score (0-1, your confidence in this narrative's potential)
- clarity (0-1, how easy it is to understand)
- trust (0-1, how believable it is)

Return as a JSON array.`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a narrative strategist for KLYC. Generate compelling marketing narratives that drive engagement. Return valid JSON arrays. Each narrative must be specific to the topic — no generic templates.',
        model: SUBMIND_MODELS.narrative,
        temperature: 0.8,
      })

      let candidates = []
      try {
        const jsonMatch = ai.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          candidates = JSON.parse(jsonMatch[0])
        }
      } catch {
        candidates = [{ raw: ai.text, parseError: true }]
      }

      const ranked = candidates.map((c: any) => ({
        ...c,
        narrativeRank: (c.score ?? 0.5) * (c.clarity ?? 0.5) * (c.trust ?? 0.5),
      }))

      ranked.sort((a: any, b: any) => (b.narrativeRank ?? 0) - (a.narrativeRank ?? 0))

      return {
        submind: this.name,
        status: 'success',
        data: {
          candidates: ranked,
          topNarrative: ranked[0] ?? null,
          totalGenerated: ranked.length,
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

export const narrativeSubmind = new NarrativeSubmind()
export const narrativeAgent = narrativeSubmind
