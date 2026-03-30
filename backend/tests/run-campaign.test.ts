import assert from 'assert'
import { executeCampaignRun, campaignRunStore } from '../services/campaign-runner'

const stubOrchestrator = {
  async runCampaign(body: any) {
    return {
      success: true,
      data: {
        received: body,
        stage: 'orchestrated'
      }
    }
  }
}

async function shouldRunEndToEndPipeline() {
  const payload = {
    input_as_text: 'Launch GTM motion for builders',
    client_id: 'client-42',
    client_name: 'Builder Labs',
    goal: 'growth',
    platforms: ['LinkedIn'],
    keywords: ['gtm', 'launch'],
    prior_strategy_summary: 'Focus on builders and operator communities'
  }

  const result = await executeCampaignRun(payload, { orchestrator: stubOrchestrator })

  if ('error' in result && result.error) {
    throw new Error(`Unexpected validation failure: ${JSON.stringify(result.error)}`)
  }

  assert.strictEqual(result.runMetadata.client_id, 'client-42')
  assert.strictEqual(result.runMetadata.normalization_status, 'normalized')
  assert.strictEqual(result.orchestrationStatus.status, 'completed')
  assert.ok(result.normalizedCampaignPackage.runMetadata.runTimestamp)
  assert.ok(result.nextActions)
  assert.strictEqual(campaignRunStore.latest()?.run_id, result.runMetadata.run_id)
}

async function shouldRejectInvalidPayload() {
  const result = await executeCampaignRun({}, { orchestrator: stubOrchestrator })

  if (!('error' in result)) {
    throw new Error('Expected validation error to be returned')
  }

  assert.strictEqual(result.status, 400)
  assert.ok(result.error.missing?.includes('input_as_text'))
}

;(async () => {
  try {
    await shouldRunEndToEndPipeline()
    await shouldRejectInvalidPayload()
    console.log('run-campaign pipeline tests passed')
  } catch (error) {
    console.error('run-campaign pipeline tests failed', error)
    process.exit(1)
  }
})()
