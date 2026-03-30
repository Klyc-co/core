/**
 * KLYC Image/Creative Agent
 * Generates creative prompts and specs per platform.
 * Uses Haiku for speed — prompt generation is lightweight.
 */

import type { Agent, AgentInput, AgentOutput } from './agent_interface'
import { claudeClient, AGENT_MODELS } from '../services/claude_client'

export class ImageAgent implements Agent {
  name = 'image'

  private toList(text: string): string[] {
    return text
      .split(/\n|\r|\u2022|-/)
      .map(entry => entry.trim())
      .filter(Boolean)
      .slice(0, 4)
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Generate image prompt descriptions for "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Context: ${input.business_context ?? 'No context'}.
Prior content: ${JSON.stringify(previous)}.
Provide 3 descriptive prompts suitable for modern marketing visuals.`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a creative director. Provide vivid but concise image prompts without camera jargon. Focus on emotion, composition, and brand relevance.',
        model: AGENT_MODELS.image,
      })

      const prompts =
        this.toList(ai.text).map((entry, index) => ({
          prompt: entry,
          orientation: index % 2 === 0 ? '16:9' : '1:1',
        })) || []

      const fallbackPrompts = [
        {
          prompt: `Dynamic team using ${input.campaign_topic} dashboard with clear growth metrics`,
          orientation: '16:9',
        },
        {
          prompt: `Customer success story showcasing ${input.campaign_topic} benefits`,
          orientation: '1:1',
        },
        {
          prompt: `Mobile-first view of ${input.campaign_topic} simplifying work for ${input.audience ?? 'teams'}`,
          orientation: '4:5',
        },
      ]

      return {
        agent: this.name,
        status: 'success',
        data: {
          prompts: prompts.length ? prompts : fallbackPrompts,
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

export const imageAgent = new ImageAgent()
