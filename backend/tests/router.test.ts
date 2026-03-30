import assert from 'assert'
import { buildOrchestrationPackage } from '../orchestrator/router'
import type { CampaignBrief, CustomerDNA, LearningUpdate, OrchestratorHints } from '../models/types'

const compressedSummary = {
  layers: {
    raw: { hash: 'abc', length: 12 }
  },
  metadata: {
    schemaVersion: '1.0.0' as const,
    createdAt: Date.now()
  }
}

const baseCampaignBrief: CampaignBrief = {
  version: '1.0.0',
  campaignId: 'cmp-1',
  title: 'Launch',
  objective: 'growth',
  compressedSummary
}

const baseCustomerContext: CustomerDNA = {
  version: '1.0.0',
  brandVoice: 'Confident',
  offerMap: [],
  audienceSegments: [],
  buyerPainPoints: [],
  proofPoints: [],
  competitors: [],
  regulations: [],
  semanticThemes: [],
  trustSignals: [],
  objections: [],
  sourceReferences: [],
  compressedSummary
}

const testPartialOrchestrationWithMissingInputs = () => {
  const campaignBrief = {
    ...baseCampaignBrief,
    compressedSummary: {
      ...compressedSummary,
      metadata: {
        ...compressedSummary.metadata,
        notes: ['compression-layer']
      }
    }
  }

  const customerContext = { ...baseCustomerContext }
  const orchestratorHints: OrchestratorHints = {
    missingInputs: ['audience', 'positioning'],
    routing: ['research', 'narrative']
  }

  const plan = buildOrchestrationPackage({
    campaignBrief,
    customerContext,
    orchestratorHints
  })

  assert.deepStrictEqual(plan.orchestrationStatus, 'partial')
  assert.ok(
    plan.partialRunAllowed,
    'partial runs should be allowed when missing inputs are below the blocking threshold'
  )
  assert.ok(plan.executionOrder.includes('requiresResearch'))
  assert.ok(plan.executionOrder.includes('requiresNarrativeSimulation'))
  assert.ok(plan.blockedReasons.length > 0, 'missing inputs should record blocked reasons')
  assert.ok(
    plan.nextReportHints.some(hint => hint.includes('Resolve missing inputs')),
    'should surface missing input resolution hint'
  )
}

const testHighComplexityCampaignRouting = () => {
  const campaignBrief: CampaignBrief = {
    ...baseCampaignBrief,
    focusMarkets: ['US', 'EU', 'APAC'],
    primaryOffers: ['offer-a', 'offer-b', 'offer-c'],
    callToActions: [],
    compressedSummary: {
      layers: {
        raw: { hash: 'raw', length: 50 },
        extracted: { hash: 'ext', length: 40 }
      },
      metadata: {
        schemaVersion: '1.0.0',
        createdAt: Date.now(),
        notes: ['crowded market', 'multi-language', 'compliance']
      }
    }
  }

  const customerContext: CustomerDNA = {
    ...baseCustomerContext,
    semanticThemes: ['ai', 'automation', 'efficiency'],
    objections: ['price', 'time', 'trust', 'risk'],
    proofPoints: ['case studies'],
    trustSignals: ['reviews'],
    compressedSummary: {
      layers: {
        raw: { hash: 'cust', length: 30 },
        strategic: { hash: 'strat', length: 20 }
      },
      metadata: { schemaVersion: '1.0.0', createdAt: Date.now(), notes: ['dense'] }
    }
  }

  const learningHooks: LearningUpdate[] = [
    {
      version: '1.0.0',
      campaignId: 'cmp-1',
      scope: 'strategy',
      delta: { added: ['new angle'] },
      compressedSummary
    }
  ]

  const plan = buildOrchestrationPackage({
    campaignBrief,
    customerContext,
    learningHooks
  })

  assert.strictEqual(plan.orchestrationStatus, 'ready')
  assert.ok(plan.executionOrder.includes('requiresPlatformEvaluation'))
  assert.ok(plan.executionOrder.includes('requiresNarrativeSimulation'))
  assert.strictEqual(plan.blockedReasons.length, 0)
  assert.ok(
    plan.nextReportHints.some(hint => hint.toLowerCase().includes('staggered handoff')),
    'should surface complexity hint'
  )
}

testPartialOrchestrationWithMissingInputs()
testHighComplexityCampaignRouting()
console.log('router tests passed')
