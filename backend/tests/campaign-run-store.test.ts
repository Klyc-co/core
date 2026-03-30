import assert from 'assert'
import type { AgentOutput } from '../agents/agent_interface'
import type { LearningUpdate } from '../models/types'
import { InMemoryCampaignRunStore, type TimelineMetric } from '../state/campaign-run-store'

const run = async () => {
  const store = new InMemoryCampaignRunStore()

  const created = await store.createRun({
    run_id: 'run-1',
    client_id: 'client-1',
    client_name: 'Client One',
    workflow_version: 'v1',
    normalized_campaign_package: { normalized: true }
  })

  assert.strictEqual(created.agent_outputs.length, 0)
  assert.strictEqual(created.timeline_metrics.length, 0)
  assert.strictEqual(created.learning_updates.length, 0)
  assert.ok(created.run_timestamp)
  assert.strictEqual(created.client_name, 'Client One')

  const agentOutput: AgentOutput = {
    agent: 'research',
    status: 'success',
    data: { summary: 'ok' },
    timestamp: new Date().toISOString(),
    metadata: { step_count: 1 }
  }

  const timelineMetric: TimelineMetric = {
    timestamp: new Date().toISOString(),
    label: '1m',
    metrics: { views: 120 }
  }

  const learningUpdate: LearningUpdate = {
    version: '1.0.0',
    campaignId: 'cmp-123',
    scope: 'strategy',
    delta: { added: ['insight'] },
    compressedSummary: {
      layers: {},
      metadata: {
        schemaVersion: '1.0.0',
        createdAt: Date.now()
      }
    }
  }

  await store.appendAgentOutput('run-1', agentOutput)
  await store.appendTimelineMetric('run-1', timelineMetric)
  await store.appendLearningUpdate('run-1', learningUpdate)

  const afterAppends = await store.getRunById('run-1')
  assert.ok(afterAppends)
  assert.strictEqual(afterAppends?.agent_outputs.length, 1)
  assert.strictEqual(afterAppends?.timeline_metrics.length, 1)
  assert.strictEqual(afterAppends?.learning_updates.length, 1)

  const updated = await store.updateRun('run-1', {
    final_status: 'normalized',
    orchestration_package: { step: 'complete' }
  })

  assert.strictEqual(updated?.final_status, 'normalized')
  assert.deepStrictEqual(updated?.orchestration_package, { step: 'complete' })

  const snapshot = await store.getRunById('run-1')
  assert.ok(snapshot)

  snapshot!.client_name = 'Tampered'
  snapshot!.agent_outputs.push({
    agent: 'tamper',
    status: 'success',
    data: { note: 'mutate' },
    timestamp: new Date().toISOString()
  })

  const fresh = await store.getRunById('run-1')
  assert.strictEqual(fresh?.client_name, 'Client One')
  assert.strictEqual(fresh?.agent_outputs.length, 1)

  try {
    await store.createRun({
      run_id: 'run-1',
      client_id: 'client-1',
      client_name: 'Duplicate',
      workflow_version: 'v1'
    })
    assert.fail('Expected duplicate run_id to throw')
  } catch (error) {
    assert.ok(error instanceof Error)
  }
}

run()
  .then(() => console.log('campaign-run-store test passed'))
  .catch(error => {
    console.error('campaign-run-store test failed', error)
    process.exit(1)
  })
