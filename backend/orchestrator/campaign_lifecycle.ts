/**
 * KLYC Campaign Lifecycle Processor
 * Full state machine with checkpoint evaluation and learning updates.
 */

import type { SubmindOutput } from '../subminds/submind_interface'
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
  submindsSummary: {
    total: number
    successful: number
    failed: number
    subminds: string[]
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

  processResults(campaignId: string, submindResults: SubmindOutput[]): CampaignLifecycleResult {
    this.transitions = []
    this.currentStatus = 'draft'

    this.transition('normalized', 'orchestrator', 'Input normalized')

    const hasResearch = submindResults.find(r => r.submind === 'research' && r.status === 'success')
    if (hasResearch) {
      this.transition('researched', 'research_submind', 'Market research complete')
    }

    const hasProduct = submindResults.find(r => r.submind === 'product' && r.status === 'success')
    if (hasProduct) {
      this.transition('positioned', 'product_submind', 'Product positioning complete')
    }

    const hasNarrative = submindResults.find(r => r.submind === 'narrative' && r.status === 'success')
    if (hasNarrative) {
      this.transition('simulated', 'narrative_submind', 'Narrative simulation complete')
    }

    const hasApproval = submindResults.find(r => r.submind === 'approval' && r.status === 'success')
    if (hasApproval) {
      const assessment = (hasApproval.data as any)?.assessment
      if (assessment?.readyForApproval) {
        this.transition('approved', 'approval_submind', 'Auto-approved by submind assessment')
        this.transition('publish_ready', 'orchestrator', 'Campaign ready for publishing')
      } else {
        this.transition('approved', 'approval_submind', 'Flagged for human review')
      }
    }

    const successful = submindResults.filter(r => r.status === 'success').length
    const failed = submindResults.length - successful

    return {
      campaignId,
      currentStatus: this.currentStatus,
      transitions: [...this.transitions],
      submindsSummary: {
        total: submindResults.length,
        successful,
        failed,
        subminds: submindResults.map(r => r.submind),
      },
    }
  }

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
