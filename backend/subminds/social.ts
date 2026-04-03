/**
 * KLYC Social Submind
 * Top narratives → platform-specific post packages.
 * Generates copy for LinkedIn, X, Instagram.
 */

import type { Submind, SubmindInput, SubmindOutput } from './submind_interface'
import { claudeClient, SUBMIND_MODELS } from '../services/claude_client'

export class SocialSubmind implements Submind {
  name = 'social'

  async execute(input: SubmindInput): Promise<SubmindOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Create social media posts for "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Context: ${input.business_context ?? 'No context'}.
Narrative & positioning data: ${JSON.stringify(previous)}.

Generate posts for each platform:

1. LinkedIn post (professional, 150-300 words, include a hook and CTA)
2. X/Twitter post (concise, under 280 chars, punchy, include hashtags)
3. Instagram caption (engaging, include emoji sparingly, 100-200 words, include hashtags)

For each post include:
- platform
- copy (the post text)
- cta (call to action)
- hashtags (3-5 relevant tags)
- tone (professional/casual/bold/educational)

Return as a JSON array.`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a social media strategist for KLYC. Write platform-native copy that drives engagement. Each post must feel native to its platform. Return valid JSON.',
        model: SUBMIND_MODELS.social,
        temperature: 0.7,
      })

      let posts = []
      try {
        const jsonMatch = ai.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          posts = JSON.parse(jsonMatch[0])
        }
      } catch {
        posts = [{ raw: ai.text, parseError: true }]
      }

      return {
        submind: this.name,
        status: 'success',
        data: {
          posts,
          platformCount: posts.length,
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

export const socialSubmind = new SocialSubmind()
export const socialAgent = socialSubmind
