/**
 * KLYC Analytics Submind
 * CTR/reach/conversion estimation with checkpoint scoring.
 * Estimates pre-launch performance metrics.
 */

import type { Submind, SubmindInput, SubmindOutput } from './submind_interface'
import { claudeClient, SUBMIND_MODELS } from '../services/claude_client'

export class AnalyticsSubmind implements Submind {
  name = 'analytics'

  async execute(input: SubmindInput): Promise<SubmindOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Estimate performance metrics for a campaign about "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Business context: ${input.business_context ?? 'No context'}.
All campaign data so far: ${JSON.stringify(previous)}.

Provide estimates for:
1. Expected CTR range (low/mid/high as percentages)
2. Estimated reach (impressions in first 24h)
3. Estimated engagement rate
4. Conversion probability (0-1)
5. Best performing platform prediction
6. Recommended posting window (day/time)
7. Viral potential score (0-1) using: VS = 0.25*Engagement + 0.25*Velocity + 0.20*Novelty + 0.15*Diversity + 0.10*CommunitySpread + 0.05*EmotionalEnergy
8. Decision: amplify (VS>=0.75), monitor (0.50-0.74), or archive (VS<0.50)

Return JSON: { ctr, reach, engagementRate, conversionProbability, bestPlatform, postingWindow, viralScore, decision }`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a marketing analytics specialist for KLYC. Provide realistic, data-informed performance estimates. Do not inflate numbers. Return valid JSON.',
        model: SUBMIND_MODELS.analytics,
      })

      let estimates: Record<string, unknown> = {}
      try {
        const jsonMatch = ai.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          estimates = JSON.parse(jsonMatch[0])
        }
      } catch {
        estimates = { raw: ai.text, parseError: true }
      }

      return {
        submind: this.name,
        status: 'success',
        data: {
          estimates,
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

export const analyticsSubmind = new AnalyticsSubmind()
export const analyticsAgent = analyticsSubmind
