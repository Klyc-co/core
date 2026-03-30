# KLYC Orchestrator

The KLYC Orchestrator is the central intelligence system that coordinates the singular KLYC Agent through its 9 submind personalities. It implements a sequential pipeline architecture where each submind focus processes data in a specific order, with each focus area's output feeding into the next.

## Architecture Overview

### Singular Agent Model (v3)

The orchestrator drives ONE unified agent (`KLYCAgent`) that shifts focus through 9 submind personalities:

```
normalizer → research → product → narrative → social → image → editor → approval → analytics
```

Each submind receives the accumulated output of all prior subminds, creating a continuous stream of intelligence.

### AI Model Assignment

- **Claude Sonnet** (`claude-sonnet-4-20250514`): research, product, narrative, social, editor, analytics
- **Claude Haiku** (`claude-haiku-4-5-20251001`): image, approval
- **No LLM**: normalizer (pure structural analysis)

## Agent Pipeline Flow

### Campaign Creation Pipeline

```
1. Normalizer  → Structural analysis, request classification, coverage calculation
2. Research    → Market signals, audience insights, competitive gaps
3. Product     → Positioning, differentiators, proof points, trust signals
4. Narrative   → 3-5 narrative candidates across 7 storytelling types
5. Social      → Platform-native posts for LinkedIn, X, Instagram
6. Image       → Creative prompts with orientation, style, mood
7. Editor      → QA review, brand consistency, quality scoring
8. Approval    → Risk assessment, compliance, regulatory flags
9. Analytics   → Viral scoring (VS formula), amplify/monitor/archive decision
```

## Data Structures

### AgentInput

```typescript
interface AgentInput {
  context?: Record<string, unknown>    // Campaign data + accumulated outputs
  previousOutput?: Record<string, unknown>  // Previous submind's output
  userMessage?: string                 // Original user request
}
```

### AgentOutput

```typescript
interface AgentOutput {
  agent: string           // Submind focus identifier
  status: string          // 'success' | 'error'
  data: Record<string, unknown>  // Submind-specific results
  timestamp: string       // ISO timestamp
  metadata: {
    model: string         // Claude model used (or 'none')
    executionTimeMs: number
    submindFocus: string
  }
}
```

## Math Models

**Viral Score**: `VS = 0.25*E + 0.25*V + 0.20*N + 0.15*D + 0.10*CS + 0.05*EE`
**Narrative Rank**: `NarrativeRank = preLaunchScore * clarity * trust`
**Pre-Launch Score**: `PLS = w_r*R + w_n*N + w_e*EE + w_p*PF + w_c*CC + w_u*U`
**Checkpoint**: `combined = engRate*0.6 + viralVelocity*0.4`
  - boost ≥ 0.75, continue ≥ 0.50, pause ≥ 0.25, archive < 0.25

## Usage

```typescript
import { KLYCOrchestratorV2 } from './orchestrator/klyc_orchestrator_v2'

const orchestrator = new KLYCOrchestratorV2()

const result = await orchestrator.runPipeline({
  context: {
    campaignBrief: { name: 'Product Launch', objective: 'growth' },
    platforms: ['LinkedIn', 'X'],
    keywords: ['AI', 'automation'],
    targetAudience: 'B2B operators',
    productInfo: 'AI marketing intelligence platform',
    brandVoice: 'Authoritative yet approachable',
  }
})

console.log(result.status)         // 'success' | 'partial' | 'failed'
console.log(result.finalOutput)    // Accumulated output from all 9 subminds
console.log(orchestrator.getMetrics(result))  // Per-submind timing
```

## Orchestrator Methods

- `runPipeline(input)` — Full 9-submind sequential execution
- `runSingleSubmind(focus, input)` — Test/rerun individual focus area
- `runPipelineFrom(focus, input)` — Resume from any point in the chain
- `getMetrics(result)` — Performance analytics per submind
- `getPipelineOrder()` — Returns the submind execution sequence

## Execution Guardrails

- **Timeout**: 30s per submind call
- **Retries**: 2 attempts on failure
- **Response limit**: 20KB max per submind output
- **Error handling**: Failed subminds are logged, pipeline continues as 'partial'
