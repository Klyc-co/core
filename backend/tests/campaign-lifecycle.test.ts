import assert from 'assert'
import { CampaignLifecycleProcessor } from '../orchestrator/campaign_lifecycle'
import type { AgentOutput } from '../agents/agent_interface'

const mockAgents: AgentOutput[] = [
  {
    agent: 'research',
    status: 'success',
    data: {
      summary: 'Concise research summary',
      insights: ['Signal A', 'Signal B'],
      risks: ['Risk A'],
      source: 'mock'
    },
    timestamp: new Date().toISOString()
  },
  {
    agent: 'product',
    status: 'success',
    data: {
      positioning: 'Positioned as fastest option',
      differentiators: ['Speed', 'Reliability'],
      proof_points: ['Proof'],
      source: 'mock'
    },
    timestamp: new Date().toISOString()
  },
  {
    agent: 'narrative',
    status: 'success',
    data: {
      storyline: 'A hero story',
      hooks: ['Hook 1'],
      key_messages: ['Angle 1', 'Angle 2'],
      source: 'mock'
    },
    timestamp: new Date().toISOString()
  },
  {
    agent: 'social',
    status: 'success',
    data: {
      posts: [
        { platform: 'LinkedIn', content: 'Post L', cta: 'Read' },
        { platform: 'X', content: 'Post X', cta: 'Click' }
      ],
      source: 'mock'
    },
    timestamp: new Date().toISOString()
  },
  {
    agent: 'approval',
    status: 'success',
    data: {
      requires_human_review: false,
      notes: ['Safe'],
      source: 'mock'
    },
    timestamp: new Date().toISOString()
  },
  {
    agent: 'analytics',
    status: 'success',
    data: {
      metrics: {
        '1m': {
          interval: '1m',
          views: 1200,
          likes: 120,
          comments: 20,
          shares: 15,
          engagementRate: 3.2,
          viralVelocity: 1.4
        }
      }
    },
    timestamp: new Date().toISOString()
  }
]

const processor = new CampaignLifecycleProcessor()
const result = processor.run(
  {
    campaign_topic: 'Test Launch',
    audience: 'Builders',
    goal: 'growth',
    mock_analytics: {
      '5m': {
        interval: '5m',
        views: 5000,
        likes: 420,
        comments: 80,
        shares: 50,
        engagementRate: 2.1,
        viralVelocity: 1.1
      }
    }
  },
  mockAgents
)

assert.strictEqual(result.final_state, 'learned')
assert.strictEqual(result.stages.checkpoints.length, 6)
assert.ok(
  result.transitions.some(t => t.to === 'checkpoint_2h'),
  'should record 2h checkpoint transition'
)
assert.deepStrictEqual(result.stages.checkpoints[0].window, '1m')
assert.ok(
  result.transitions.at(-1)?.to === 'learned',
  'should end at learned state'
)

console.log('campaign-lifecycle test passed', {
  final_state: result.final_state,
  transitions: result.transitions.length
})
