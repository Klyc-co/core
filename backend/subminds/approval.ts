/**
 * KLYC Approval Submind
 * Human-in-the-loop gating with risk flagging.
 * Uses Haiku — fast structured decision, not creative work.
 */

import type { Submind, SubmindInput, SubmindOutput } from './submind_interface'
import { claudeClient, SUBMIND_MODELS } from '../services/claude_client'

export class ApprovalSubmind implements Submind {
  name = 'approval'

  async execute(input: SubmindInput): Promise<SubmindOutput> {
    const start = Date.now()
    const previous = input.previous_output ?? {}

    try {
      const prompt = `Evaluate this campaign for approval readiness: "${input.campaign_topic}".
Audience: ${input.audience ?? 'general'}.
Editor review and all prior outputs: ${JSON.stringify(previous)}.

Assess:
1. Is this campaign ready for human approval? (true/false)
2. Risk level (low/medium/high)
3. Risk flags (list any concerns)
4. Recommended changes before approval (if any)
5. Confidence that this will perform well (0-1)

Return JSON: { readyForApproval, riskLevel, riskFlags, recommendedChanges, confidence }`

      const ai = await claudeClient.generateResponse({
        prompt,
        system: 'You are a campaign approval gatekeeper for KLYC. Assess readiness for human review. Be conservative on risk — flag anything questionable. Return valid JSON.',
        model: SUBMIND_MODELS.approval,
      })

      let assessment: Record<string, unknown> = {}
      try {
        const jsonMatch = ai.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          assessment = JSON.parse(jsonMatch[0])
        }
      } catch {
        assessment = { raw: ai.text, parseError: true, readyForApproval: false }
      }

      return {
        submind: this.name,
        status: 'success',
        data: {
          assessment,
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

export const approvalSubmind = new ApprovalSubmind()
export const approvalAgent = approvalSubmind
