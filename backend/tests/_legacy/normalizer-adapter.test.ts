/**
 * LEGACY TEST: Normalizer Adapter + Old OpenAI Orchestrator
 * ==========================================================
 * This test references the old KLYCOrchestrator (OpenAI-based) and
 * OpenAIWorkflowClient. Archived for migration reference.
 *
 * For current tests, see: backend/tests/router.test.ts
 * For current orchestrator: backend/orchestrator/klyc_orchestrator_v2.ts
 */

import assert from 'assert'
import { adaptNormalizerResponse } from '../../orchestrator/normalizer-adapter'

const sampleWorkflowResponse = {
  campaignBrief: {
    version: '1.0.0',
    campaignId: 'cmp-123',
    title: 'Launch Alpha',
    objective: 'growth',
    focusMarkets: ['US'],
    compressedSummary: {
      layers: {
        raw: { hash: 'abc', length: 12, preview: 'campaign' }
      },
      metadata: {
        schemaVersion: '1.0.0',
        createdAt: Date.now(),
        notes: ['compression-layer']
      }
    },
    sourceReferences: [{ id: 'src-1', type: 'url', uri: 'https://example.com' }]
  },
  customerContext: {
    version: '1.0.0',
    brandVoice: 'Calm expert',
    offerMap: ['alpha'],
    audienceSegments: ['builders'],
    buyerPainPoints: ['time'],
    proofPoints: ['trusted'],
    competitors: ['beta'],
    regulations: [],
    semanticThemes: ['AI'],
    trustSignals: ['proof'],
    objections: ['cost'],
    sourceReferences: [{ id: 'src-c', type: 'note', title: 'cust' }],
    compressedSummary: {
      layers: {
        raw: { hash: 'def', length: 8, preview: 'context' }
      },
      metadata: {
        schemaVersion: '1.0.0',
        createdAt: Date.now()
      }
    }
  },
  orchestratorHints: {
    missingInputs: ['brand_voice'],
    compressionNotes: ['history truncated'],
    confidence: 0.82,
    routing: ['research'],
    sourceReferences: [{ id: 'src-2', type: 'note', title: 'note' }]
  },
  learningHooks: [
    {
      version: '1.0.0',
      campaignId: 'cmp-123',
      scope: 'strategy',
      delta: { added: ['experiment'] },
      compressedSummary: {
        layers: { strategic: { hash: 'ghi', length: 3 } },
        metadata: { schemaVersion: '1.0.0', createdAt: Date.now() }
      }
    }
  ],
  meta: {
    missingInputs: ['audience'],
    compressionNotes: ['extra trimmed'],
    confidence: 0.9
  }
}

// Adapter test — still valid, doesn't require OpenAI client
const normalized = adaptNormalizerResponse(sampleWorkflowResponse, {
  requestId: 'req-1',
  workflowRunId: 'run-1',
  requestType: 'campaign_create',
  clientId: 'client-1'
})

assert.ok(normalized.campaignBrief?.campaignId === 'cmp-123')
assert.deepStrictEqual(normalized.meta.missingInputs, ['audience', 'brand_voice'])
assert.deepStrictEqual(normalized.meta.compressionNotes, [
  'extra trimmed',
  'history truncated',
  'compression-layer'
])
assert.strictEqual(normalized.meta.confidence, 0.9)
assert.strictEqual(normalized.learningHooks?.length, 1)

const emptyNormalized = adaptNormalizerResponse(
  {},
  { requestId: 'req-empty', workflowRunId: 'run-empty' }
)
assert.ok(!emptyNormalized.campaignBrief)
assert.strictEqual(emptyNormalized.meta.requestId, 'req-empty')

console.log('normalizer-adapter (legacy) test passed')
