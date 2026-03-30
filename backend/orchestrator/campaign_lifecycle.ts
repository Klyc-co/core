/**
 * KLYC Campaign Lifecycle Processor
 * Full state machine with checkpoint evaluation and learning updates.
 * Migrated from ai-controller/core/orchestrator/campaign_lifecycle.ts
 */

import type { AgentOutput } from '../agents/agent_interface'
import type { CampaignStatus, CheckpointWindow } from '../models/types'

export interface LifecycleTransition {
  from: CampaignStatus
  to: CampaignStatus
  actor: string
  timestamp: number
  notes?: string
}

export interface CampaignLifecycleResult {
  campaignId: string
  currentStatus: CampaignStatus
  transitions: LifecycleTransition[]
  agentsSummary: {
    total: number
    successful: number
    failed: number
    agents: string[]
  }
}

export interface CheckpointEvaluation {
  campaignId: string
  window: CheckpointWindow
  engagementRate: number
  viralVelocity: number
  decision: 'boost' | 'continue' | 'pause' | 'archive'
  reasoning: string
}

export class CampaignLifecycleProcessor {
  private transitions: LifecycleTransition[] = []
  private currentStatus: CampaignStatus = 'draft'

  processResults(campaignId: string, agentResults: AgentOutput[]): CampaignLifecycleResult {
    this.transitions = []
    this.currentStatus = 'draft'

    // Walk through the lifecycle based on agent results
    this.transition('normalized', 'orchestrator', 'Input normalized')

    const hasResearch = agentResults.find(r => r.agent === 'research' && r.status === 'success')
    if (hasResearch) {
      this.transition('researched', 'research_agent', 'Market research complete')
    }

    const hasProduct = agentResults.find(r => r.agent === 'product' && r.status === 'success')
    if (hasProduct) {
      this.transition('positioned', 'product_agent', 'Product positioning complete')
    }

    const hasNarrative = agentResults.find(r => r.agent === 'narrative' && r.status === 'success')
    if (hasNarrative) {
      this.transition('simulated', 'narrative_agent', 'Narrative simulation complete')
    }

    const hasApproval = agentResults.find(r => r.agent === 'approval' && r.status === 'success')
    if (hasApproval) {
      const assessment = (hasApproval.data as any)?.assessment
      if (assessment?.readyForApproval) {
        this.transition('approved', 'approval_agent', 'Auto-approved by agent assessment')
        this.transition('publish_ready', 'orchestrator', 'Campaign ready for publishing')
      } else {
        this.transition('approved', 'approval_agent', 'Flagged for human review')
      }
    }

    const successful = agentResults.filter(r => r.status === 'success').length
    const failed = agentResults.length - successful

    return {
      campaignId,
      currentStatus: this.currentStatus,
      transitions: [...this.transitions],
      agentsSummary: {
        total: agentResults.length,
        successful,
        failed,
        agents: agentResults.map(r => r.agent),
      },
    }
  }

  /**
   * Checkpoint evaluation for live campaigns.
   * Uses engagement rate + viral velocity to decide: boost, continue, pause, or archive.
   */
  evaluateCheckpoint(
    campaignId: string,
    window: CheckpointWindow,
    engagementRate: number,
    viralVelocity: number
  ): CheckpointEvaluation {
    let decision: CheckpointEvaluation['decision']
    let reasoning: string

    const combined = (engagementRate * 0.6) + (viralVelocity * 0.4)

    if (combined >= 0.75) {
      decision = 'boost'
      reasoning = `Strong performance (${combined.toFixed(2)}). Amplify spend and distribution.`
    } else if (combined >= 0.50) {
      decision = 'continue'
      reasoning = `Moderate performance (${combined.toFixed(2)}). Maintain current strategy.`
    } else if (combined >= 0.25) {
      decision = 'pause'
      reasoning = `Below threshold (${combined.toFixed(2)}). Pause and evaluate creative.`
    } else {
      decision = 'archive'
      reasoning = `Poor performance (${combined.toFixed(2)}). Archive and learn.`
    }

    return { campaignId, window, engagementRate, viralVelocity, decision, reasoning }
  }

  /**
   * Generate learning update from campaign performance data.
   * Identifies best-performing window and recommends scale/iterate/retire.
   */
  writeLearningUpdate(
    campaignId: string,
    snapshots: { window: CheckpointWindow; engagementRate: number }[]
  ) {
    if (snapshots.length === 0) {
      return { campaignId, recommendation: 'iterate' as const, bestWindow: '1m' as CheckpointWindow }
    }

    const sorted = [...snapshots].sort((a, b) => b.engagementRate - a.engagementRate)
    const best = sorted[0]
    const avgEngagement = snapshots.reduce((sum, s) => sum + s.engagementRate, 0) / snapshots.length

    let recommendation: 'scale' | 'iterate' | 'retire'
    if (avgEngagement >= 0.75) {
      recommendation = 'scale'
    } else if (avgEngagement >= 0.40) {
      recommendation = 'iterate'
    } else {
      recommendation = 'retire'
    }

    return {
      campaignId,
      bestWindow: best.window,
      peakEngagement: best.engagementRate,
      avgEngagement,
      recommendation,
      timestamp: Date.now(),
    }
  }

  private transition(to: CampaignStatus, actor: string, notes?: string) {
    this.transitions.push({
      from: this.currentStatus,
      to,
      actor,
      timestamp: Date.now(),
      notes,
    })
    this.currentStatus = to
  }
}
