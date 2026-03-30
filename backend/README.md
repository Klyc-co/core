# KLYC Backend — AI Orchestration Architecture

## Overview

KLYC is a backend AI orchestration service powered by the Claude API. The React UI serves as a **development interface** only. The production UI exists in **Loveable** and calls the KLYC backend through REST APIs.

### Singular Agent Architecture (v3)

The backend drives a **single unified agent** (`KLYCAgent`) with 9 submind personality profiles. Each submind is a different lens the same intelligence looks through — not 9 separate agents, but one mind shifting focus.

All AI calls go to the **Claude API** via raw fetch (zero-dependency edge deployment).

## Architecture

```
backend/
├── agents/              # Singular agent + legacy individual agents
│   ├── klyc_agent.ts   # THE agent — 9 submind profiles
│   ├── agent_interface.ts
│   └── [individual agents — legacy, kept for reference]
├── orchestrator/        # Pipeline coordination
│   ├── klyc_orchestrator_v2.ts  # V3 singular-agent orchestrator
│   ├── klyc_orchestrator.ts     # V2 multi-agent (legacy)
│   ├── campaign_lifecycle.ts    # State machine (17 states)
│   ├── normalizer-adapter.ts    # Zod validation + normalization
│   ├── router.ts                # Routing signals + complexity
│   └── agent_runner.ts          # Execution guardrails re-export
├── services/            # Core services
│   ├── claude_client.ts          # Claude API client (raw fetch)
│   ├── campaign-runner.ts        # Full pipeline execution
│   ├── strategy-engine.ts        # Math models (viral, narrative, pre-launch)
│   ├── context-compression.ts    # SHA-256 three-layer compression
│   ├── data-models.ts            # Campaign, Content, Signal interfaces
│   └── security.ts               # Auth, validation, header redaction
├── state/               # State management
│   └── campaign-run-store.ts     # In-memory CRUD + timeline + learning
├── models/              # Type definitions
│   ├── types.ts                  # All TypeScript types
│   └── campaign-lifecycle.ts     # 14 Zod schemas + constants
├── api/                 # API endpoints
│   └── run_campaign.ts           # handleCampaignRun()
├── utils/               # Utilities
│   ├── response_formatter.ts     # formatCampaignResponse()
│   └── execution_guardrails.ts   # Timeout, retry, size limits
├── tests/               # Test suite
├── _legacy/             # Archived OpenAI reference
└── index.ts             # Barrel exports
```

## Submind Profiles

| Submind | Model | Temp | Focus |
|---------|-------|------|-------|
| normalizer | none | 0 | Structural analysis, classification, coverage |
| research | Sonnet | 0.7 | Market signals, audience, competitive gaps |
| product | Sonnet | 0.6 | Positioning, differentiators, trust signals |
| narrative | Sonnet | 0.8 | 3-5 candidates across 7 narrative types |
| social | Sonnet | 0.7 | Platform-native posts (LinkedIn/X/Instagram) |
| image | Haiku | 0.6 | Creative prompts with orientation + fallbacks |
| editor | Sonnet | 0.4 | QA review, brand consistency, quality scoring |
| approval | Haiku | 0.3 | Risk assessment, compliance, regulatory flags |
| analytics | Sonnet | 0.5 | Viral scoring, amplify/monitor/archive |

## API Endpoints

### Campaign
- `POST /api/ai/campaign` — Create campaign (full pipeline)
- `POST /api/ai/content` — Generate content
- `GET /api/ai/status` — Health check

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
```

Set in `.env` locally and in Supabase Edge Function environment for production.

## Development

```bash
bun install
bun run dev
```

## Migration History

- **v1**: OpenAI-based multi-agent (ai-controller repo)
- **v2**: Claude API multi-agent (idea-to-idiom, March 2026)
- **v3**: Singular agent with submind profiles (current)
