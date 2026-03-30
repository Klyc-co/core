# KLYC Changelog

All notable changes to the KLYC platform will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Changelog Rules

1. Every commit that changes backend logic, agent behavior, API contracts, schemas, or math models MUST have a corresponding CHANGELOG entry.
2. Frontend-only UI changes (Lovable) are logged under a `### UI` subsection only when they affect user-facing product moments.
3. Entries use past tense ("Added", "Changed", "Fixed", "Removed").
4. Each entry references the affected system layer: `[backend]`, `[agent]`, `[api]`, `[schema]`, `[math]`, `[ui]`, `[infra]`, `[db]`.
5. Breaking changes are called out explicitly with a `### Breaking` subsection.
6. Unreleased work lives under `## [Unreleased]` until tagged.
7. Claude (Cowork) is the single author of this file. Human edits require a `[manual]` tag.

---

## [Unreleased]

### Added — 2026-03-30 Session 2 (ai-controller Merge + Singular Agent Architecture)

#### Commits to Production Repo (idea-to-idiom-5e2d779e)

5. **`26e3b27`** — `feat(backend): merge core ai-controller files with path adaptations` — Strategy engine, context compression, data models, normalizer adapter, router, campaign run store, legacy archive, tests, PRD, SECURITY, LICENSE, .gitignore, barrel exports (14 files)
6. **`6945f61`** — `feat(agent): add singular KLYCAgent with 9 submind personalities` — One agent class, 9 SubmindProfile configurations, KLYCOrchestratorV2 with v3-singular-agent pipeline (2 files)
7. **`1608d69`** — `docs(backend): add final stragglers — docs, tests, legacy archives` — ORCHESTRATOR.md, README.md, active test adaptations, legacy test archives (7 files)

#### ai-controller Merge `[backend]` `[infra]`
- Added `backend/services/strategy-engine.ts` — Full math engine: opportunity profiling, `rankPlatforms()`, `computePreLaunchScore()`, `scoreNarrativeCandidates()`, `computeViralityCheckpoint()`, `generateLearningDelta()`, cosine similarity, hunting modes (reactive/proactive), strategy comparison with stay/adjust/override decisions
- Added `backend/services/context-compression.ts` — Three-layer compression (`compressSummaryLayers()`, `compressCampaignContext()`, `compressContentContext()`), SHA-256 hashing, MAX_FIELD_LENGTH=400
- Added `backend/services/data-models.ts` — Campaign, Content, ResearchSignal, AnalyticsMetric interfaces
- Added `backend/orchestrator/normalizer-adapter.ts` — Zod schemas for normalizer response, `adaptNormalizerResponse()`, `unwrapPayload()`, string clamping (800 chars)
- Added `backend/orchestrator/router.ts` — `buildOrchestrationPackage()`, routing signals, complexity evaluation (low/medium/high), orchestration status (ready/partial/blocked)
- Added `backend/state/campaign-run-store.ts` — `InMemoryCampaignRunStore` with CRUD, timeline metrics, learning updates, clone-on-read safety, FIFO eviction. Import path fixed from `../../core/agents/agent_interface.ts` to `../agents/agent_interface`. Interface renamed to `CampaignRunStoreInterface` to avoid naming conflict with exported store instance
- Added `backend/_legacy/openai-client-reference.ts` — Archived original OpenAI client as migration reference (not imported by active code)
- Added `backend/tests/router.test.ts` — Orchestration routing tests with import paths adapted for new repo structure
- Added `backend/tests/campaign-run-store.test.ts` — State store CRUD + mutation safety tests with adapted imports
- Updated `backend/index.ts` — Barrel exports expanded with strategy engine, compression, data models, router, adapter, state store modules
- Updated `.gitignore` — Added `.env`, `.env.*`, `!.env.example`, `**/agent-eval-report*`, `packages`, `pids`, `.file-manifest`, `.devcontainer/`, `.spark-workbench-id`
- Added `PRD.md` — Updated with Claude model architecture, math formulas, submind pipeline
- Added `SECURITY.md` — KLYC-branded security policy
- Added `LICENSE` — MIT license, copyright KLYC AI

#### Singular Agent Architecture `[agent]` `[backend]`
- Added `backend/agents/klyc_agent.ts` — **THE architectural pivot.** Single `KLYCAgent` class replaces 9 separate agent classes. One agent, 9 `SubmindProfile` configurations. Each profile carries its own system prompt, model assignment, temperature, output format, and max tokens. The agent shifts focus through personality profiles rather than instantiating separate classes.
  - `SubmindFocus` type: `normalizer | research | product | narrative | social | image | editor | approval | analytics`
  - `SubmindProfile` interface: `focus`, `description`, `model`, `temperature`, `systemPrompt`, `outputFormat`, `maxTokens`, `requiresLLM`
  - `SUBMIND_PROFILES` map: all 9 profiles with real system prompts
  - `run(focus, input)` — single entry point, routes to `executeWithClaude()` or `executeNormalizer()` based on `requiresLLM`
  - `executeWithClaude()` — builds prompt, calls Claude API, parses response
  - `executeNormalizer()` — pure TypeScript structural analysis: `classifyRequestType()`, `calculateCoverage()`, `buildNextActions()`
  - `buildPrompt()` — assembles user prompt from profile context + previous output chain
  - `parseOutput()` — JSON regex extraction (`/\{[\s\S]*\}/` or `/\[[\s\S]*\]/`) with fallback to raw text
  - Model assignments: Sonnet (`claude-sonnet-4-20250514`) for research, product, narrative, social, editor, analytics; Haiku (`claude-haiku-4-5-20251001`) for image, approval; `none` for normalizer
  - Temperature tuning: 0.8 (narrative), 0.7 (research, social), 0.6 (product, image), 0.5 (analytics), 0.4 (editor), 0.3 (approval), 0 (normalizer)
- Added `backend/orchestrator/klyc_orchestrator_v2.ts` — V3 orchestrator (`v3-singular-agent` version string). Drives the single KLYCAgent through all 9 submind profiles sequentially. Pipeline: normalizer → research → product → narrative → social → image → editor → approval → analytics. Each submind receives accumulated `previousOutputs` from all prior successes.
  - `runPipeline(initialInput)` — full 9-submind sequential execution with error tolerance (continues on failure, marks as `partial`)
  - `runSingleSubmind(focus, input)` — isolated submind execution for testing/re-runs
  - `runPipelineFrom(startingFocus, input)` — resume interrupted pipelines from any submind
  - `getMetrics(result)` — execution analytics: total time, avg submind time, slowest/fastest submind, success/error counts
  - Campaign ID generation: `campaign-${timestamp}-${random7}`

#### Documentation & Test Updates `[backend]` `[infra]`
- Rewrote `backend/ORCHESTRATOR.md` — Updated for v3 singular agent architecture, submind profiles table, pipeline flow diagram
- Rewrote `backend/README.md` — Updated with submind profiles table, v3 architecture overview, migration history from OpenAI to Claude
- Adapted `backend/tests/campaign-lifecycle.test.ts` — Import paths updated to `../orchestrator/campaign_lifecycle` and `../agents/agent_interface`
- Adapted `backend/tests/run-campaign.test.ts` — Import paths updated to `../services/campaign-runner`
- Archived `backend/tests/_legacy/normalizer-adapter.test.ts` — Adapter-only tests still valid as reference, but imports `OpenAIWorkflowClient` which is no longer active
- Archived `backend/tests/_legacy/test-orchestrator.ts` — Old orchestrator smoke test stub, references replaced `KLYCOrchestrator`
- Archived `backend/tests/_legacy/workflow-intake.test.ts` — Workflow intake validation stub, references old client

### Changed
- `[agent]` **Breaking architecture change**: 9 separate agent classes (`NormalizerAgent`, `ResearchAgent`, `ProductAgent`, `NarrativeAgent`, `SocialAgent`, `ImageAgent`, `EditorAgent`, `ApprovalAgent`, `AnalyticsAgent`) consolidated into single `KLYCAgent` class with 9 `SubmindProfile` configurations. Old individual agent files remain for reference but are superseded by `klyc_agent.ts`.
- `[backend]` Orchestrator version bumped from `v2-claude` to `v3-singular-agent`. `KLYCOrchestratorV2` replaces `KLYCOrchestrator` as the active pipeline driver.
- `[infra]` ai-controller merge completed — zero files remaining in ai-controller that haven't been brought over or archived. ai-controller repo is now fully deprecated.
- `[backend]` Campaign run store interface renamed from `CampaignRunStore` to `CampaignRunStoreInterface` to avoid naming collision with exported instance.

### Architecture Decisions Made This Session
- **Singular agent with subminds**: One `KLYCAgent` class with 9 personality profiles rather than 9 separate agent classes. The agent is one intelligence that shifts focus, not 9 separate intelligences.
- **Agent lives in the API**: System prompts are sent to Claude API at call time via the `system` parameter. The repo is the routing/plumbing layer only — the agent intelligence resides in Claude's API responses, shaped by the system prompts defined in `SUBMIND_PROFILES`.
- **Legacy test archival**: Tests that import `OpenAIWorkflowClient` or old `KLYCOrchestrator` are archived to `tests/_legacy/` rather than deleted or broken. They serve as migration reference.
- **Import path adaptation over refactoring**: Files from ai-controller were adapted with minimal changes (import paths, interface names) rather than rewritten, preserving battle-tested logic.

### Merge Completion Status
- **ai-controller → idea-to-idiom merge: COMPLETE**
- All backend services, agents, orchestrator, state management, tests, documentation, and configuration files have been brought over
- Import paths adapted for new directory structure
- OpenAI-dependent code either replaced (agents, orchestrator) or archived (_legacy)
- Remaining work: repo rename (scheduled as grand event, not yet)

---

### Added — 2026-03-30 Session (Claude Backend Build)

#### Commits to Production Repo (idea-to-idiom-5e2d779e)

1. **`4aae3de`** — `feat: add unified CHANGELOG.md` — Consolidated ai-controller + idea-to-idiom history into single production changelog
2. **`8c637b7`** — `feat(backend): add Claude API foundation layer` — Client, types, schemas, security, utilities (8 files)
3. **`a71c003`** — `feat(agents): add all 9 Claude-powered agents` — Complete agent pipeline rebuilt for Anthropic Claude API (9 files)
4. **`8838056`** — `feat(orchestrator): add orchestrator, lifecycle, runner, campaign API` — Full orchestration engine (5 files)

#### Claude API Client `[backend]`
- Added `backend/services/claude_client.ts` — Anthropic Messages API client via raw fetch, no SDK dependency
- Added multi-model architecture via `AGENT_MODELS` constant map (Haiku for lightweight, Sonnet for creative/analytical)
- Added fallback mode when `ANTHROPIC_API_KEY` is not configured (returns placeholder, app doesn't crash)
- Added configurable timeout (default 30s), AbortController-based cancellation
- Added token usage tracking (`input_tokens`, `output_tokens`) on every response
- API version pinned to `2023-06-01`
- Key lookup order: `ANTHROPIC_API_KEY` → `CLAUDE_API_KEY` → fallback

#### Agent Interface `[backend]`
- Added `backend/agents/agent_interface.ts` — Universal agent contracts (`Agent`, `AgentInput`, `AgentOutput`, `AgentStatus`)
- Added `backend/agents/base.ts` — Base agent class with status tracking, error counting, lifecycle hooks

#### 9 Agents Rebuilt for Claude `[agent]`
- Added `backend/agents/normalizer.ts` — Raw input → structured `CampaignBrief` with confidence scoring, coverage analysis, pass/fail gating. No LLM call (pure structural). Workflow version: `normalization-v2-claude`
- Added `backend/agents/research.ts` — Market opportunity, competitive landscape, trend signals, confidence scoring. Model: `claude-sonnet-4-20250514`
- Added `backend/agents/product.ts` — Positioning statement, pain-to-capability mapping, differentiators, competitive contrast. Model: `claude-sonnet-4-20250514`
- Added `backend/agents/narrative.ts` — Generates 3-5 scored candidates across 7 narrative types. JSON array output with `NarrativeRank = score * clarity * trust` ranking. Temperature: 0.8. Model: `claude-sonnet-4-20250514`
- Added `backend/agents/social.ts` — Platform-native posts for LinkedIn, X, Instagram. JSON array output with copy, CTA, hashtags, tone. Temperature: 0.7. Model: `claude-sonnet-4-20250514`
- Added `backend/agents/image.ts` — Creative prompt generation with orientation handling (16:9, 1:1, 4:5). Fallback prompts if LLM returns empty. Model: `claude-haiku-3-5-20241022`
- Added `backend/agents/editor.ts` — QA review returning JSON with `qualityScore`, `brandConsistent`, `riskFlags`, `edits`, `approved`, `notes`. Model: `claude-sonnet-4-20250514`
- Added `backend/agents/approval.ts` — Risk gating with `readyForApproval`, `riskLevel`, `riskFlags`, `recommendedChanges`, `confidence`. Model: `claude-haiku-3-5-20241022`
- Added `backend/agents/analytics.ts` — CTR/reach/conversion estimation with viral score formula `VS = 0.25E + 0.25V + 0.20N + 0.15D + 0.10CS + 0.05EE` and amplify/monitor/archive decision. Model: `claude-sonnet-4-20250514`

#### Orchestrator `[backend]`
- Added `backend/orchestrator/klyc_orchestrator.ts` — 9-agent sequential pipeline. Each agent receives accumulated `previous_output` from all prior successes. Campaign ID generated per run. Integrates lifecycle processor. Version: `v2-claude`
- Added `backend/orchestrator/campaign_lifecycle.ts` — 17-state machine (`draft` → `learned`). Checkpoint evaluation: `combined = engRate*0.6 + viralVelocity*0.4`, thresholds: boost (≥0.75), continue (≥0.50), pause (≥0.25), archive (<0.25). Learning update with `scale`/`iterate`/`retire` recommendation
- Added `backend/orchestrator/agent_runner.ts` — Re-exports execution guardrails for backward compatibility

#### Campaign Runner `[backend]`
- Added `backend/services/campaign-runner.ts` — Full pipeline: Zod validation → merge nested/root payload → build orchestration context → normalize → orchestrate → return result. FIFO run store (50-entry limit). Supports dual `camelCase`/`snake_case` field conventions
- Added `backend/api/run_campaign.ts` — Campaign execution endpoint with auth check via `Security.authenticate()`, wires campaign runner to orchestrator

#### Types & Schemas `[schema]`
- Added `backend/models/types.ts` — Complete TypeScript definitions: `Platform` (8), `ContentType` (9), `CampaignObjective` (8), `CampaignStatus` (17), `RequestType` (5), `NarrativeType` (7), `CampaignBrief`, `NormalizedCampaignBrief`, `CustomerDNA`, `StrategyProfile`, `NarrativeCandidate`, `PlatformScore`, `PostPackage`, `CheckpointWindow`, `PerformanceSnapshot`, `LearningUpdate`, `SourceReference`, `CompressedSummary`, `CompressionMetadata`, `OrchestrationContext`, `OrchestrationStep`, `AgentTask`, `WorkflowCallMetadata`, `WorkflowIntakeRequest`, `NormalizationReportEnvelope`, `ValidationErrorPayload`
- Added `backend/models/campaign-lifecycle.ts` — 14 Zod schemas: `normalizedBriefSchema`, `customerDNASchema`, `researchStageSchema`, `positioningStageSchema`, `narrativeCandidateSchema`, `simulationStageSchema`, `platformScoreSchema`, `postPackageSchema`, `packagingStageSchema`, `approvalStageSchema`, `analyticsSnapshotSchema`, `checkpointEvaluationSchema`, `learningUpdateSchema`, `lifecycleTransitionSchema`. Constants: `LIFECYCLE_STATES`, `CHECKPOINT_WINDOWS`, `NARRATIVE_TYPES`, `PLATFORMS`

#### Utilities `[backend]`
- Added `backend/utils/response_formatter.ts` — Compressed payload builder mapping agent results to `research`/`narrative`/`social`/`images`/`product`/`editor`/`analytics` keys. Campaign ID via `crypto.randomUUID()` with fallback. Metadata aggregation with success/failure counts
- Added `backend/utils/execution_guardrails.ts` — Default: 15s timeout, 2 retries, 50 max steps, 20KB response limit. `executeAgent()` with `AbortController`-based timeout and response size validation

#### Security `[backend]`
- Added `backend/services/security.ts` — Auth via `x-loveable-auth` header or Bearer token. Zod payload validation. Header redaction (allowlist: `x-client-id`, `x-loveable-client`, `x-loveable-source`). Keyword normalization (max 25, deduped). Request ID via `crypto.randomUUID()` with fallback

#### Entry Point `[infra]`
- Added `backend/index.ts` — Barrel export of all public modules: client, agents, orchestrator, campaign runner, API handler, utilities, types, schemas

### Changed
- `[backend]` Migrated LLM provider from OpenAI (`gpt-4.1-mini` via Responses API) to Anthropic Claude (Messages API) with multi-model support
- `[infra]` Backend source of truth moved from `klyc-ai/ai-controller` to `klyc-ai/idea-to-idiom-5e2d779e`
- `[infra]` ai-controller repo retained as fallback only — all new development targets idea-to-idiom
- `[agent]` Agent timeout increased from 15s to 30s for Claude API (Claude responses are more detailed)
- `[agent]` Normalizer workflow version bumped from `normalization-v1` to `normalization-v2-claude`

### Architecture Decisions Made This Session
- Claude API via raw fetch (not Anthropic SDK) for zero-dependency edge deployment
- Haiku for normalizer, image, approval (fast, cheap); Sonnet for research, product, narrative, social, editor, analytics (quality)
- Fallback mode returns placeholder text when API key missing — no crashes during development
- `backend/` directory at repo root, parallel to `src/` (Lovable frontend) and `supabase/` (database)
- Single `backend/index.ts` barrel export for clean frontend imports
- All agent JSON parsing uses regex extraction (`/\[[\s\S]*\]/` or `/\{[\s\S]*\}/`) with fallback to raw text

### Pending (Not Yet Implemented)
- `ANTHROPIC_API_KEY` not yet added to Supabase secrets or `.env`
- Supabase edge function wiring (connecting `backend/api/run_campaign.ts` to `supabase/functions/`)
- Frontend integration (connecting Lovable UI components to new `backend/` imports)
- Repo rename (scheduled as grand event after all work is verified)

---

## [0.1.0] - 2026-03-30 — Architecture Foundation

### Added

#### Core Schemas
- `[schema]` `CampaignBrief` — structured campaign input with geo, industry, customer size, competitor, regulatory filters, product definition, goal, mode (reactive/proactive/hybrid), and platform selection
- `[schema]` `CustomerDNA` — brand voice, offer map, audience segments, pain points, proof points, competitors, regulations, semantic themes, trust signals, objections, source references, compressed summary hashes
- `[schema]` `StrategyProfile` — requested vs recommended strategy with confidence scoring and strategic reasoning
- `[schema]` `NarrativeCandidate` — 7 narrative types (hidden_truth, threat_warning, framework_revelation, status_upgrade, contrarian_insight, future_prediction, tool_discovery) with core claim, problem, mechanism, outcome, scoring fields
- `[schema]` `PlatformScore` — audience density, engagement rate, topic relevance, buyer presence per platform
- `[schema]` `PostPackage` — platform-specific copy, creative prompt, CTA, QR link, tracking link, campaign ID
- `[schema]` `PerformanceSnapshot` — checkpoint metrics at 1m, 5m, 15m, 30m, 60m, 120m windows
- `[schema]` `LearningUpdate` — delta-only updates for narrative performance, platform preferences, CTA patterns, theme effectiveness

#### Mathematical Models
- `[math]` Semantic Brand Score: `SBS = Prevalence + Diversity + Connectivity`
- `[math]` Pre-launch narrative score: `S_pre = w_r*R + w_n*N + w_e*EE + w_p*PF + w_c*CC + w_u*U`
- `[math]` Narrative ranking: `NarrativeRank = S_pre * Clarity * Trust`
- `[math]` Platform score: `PS = AudienceDensity * EngagementRate * TopicRelevance * BuyerPresence`
- `[math]` Velocity: `V_t = E_t / t`
- `[math]` Acceleration: `A_t = V_t - V_(t-1)`
- `[math]` Novelty: `N = 1 - cosine_similarity(content, history)`
- `[math]` Emotional energy: `EE = arousal * sentiment_intensity`
- `[math]` Community spread: `CS = unique_communities / total_engagement`
- `[math]` Viral score: `VS = 0.25*E + 0.25*V + 0.20*N + 0.15*D + 0.10*CS + 0.05*EE`
- `[math]` Viral decision thresholds: amplify (>=0.75), monitor (0.50-0.74), archive (<0.50)

#### Agent Pipeline
- `[agent]` Normalizer Agent — raw input to structured CampaignBrief with confidence scoring, coverage analysis, pass/fail gating
- `[agent]` Research Agent — CampaignBrief + CustomerDNA to market opportunity profile
- `[agent]` Product Agent — positioning, pain-to-capability mapping, competitive contrast, differentiators
- `[agent]` Narrative Agent — generates 10-26 scored narrative candidates across 7 types
- `[agent]` Social Agent — top narratives to platform-specific post packages (LinkedIn, X, Instagram)
- `[agent]` Image/Creative Agent — creative prompts and specs per platform with orientation handling
- `[agent]` Editor Agent — final QA, brand consistency, checklist validation
- `[agent]` Approval Agent — human-in-the-loop review workflow with risk flagging
- `[agent]` Analytics Agent — 2-hour checkpoint scoring and learning updates with CTR/reach/conversion estimates

#### Campaign State Machine
- `[backend]` Full lifecycle: `draft > normalized > researched > positioned > simulated > approved > publish_ready > live > checkpoint_1m > checkpoint_5m > checkpoint_15m > checkpoint_30m > checkpoint_1h > checkpoint_2h > archived > learned`
- `[backend]` Hard-coded checkpoint windows: 1m, 5m, 15m, 30m, 1h, 2h
- `[backend]` All post-2h data treated as historical
- `[backend]` Checkpoint evaluation with engagement rate + viral velocity for boost/continue/pause/archive decisions

#### API Contracts
- `[api]` `POST /campaign/create` — create campaign from brief
- `[api]` `POST /campaign/simulate` — run pre-launch A-Z simulation
- `[api]` `POST /campaign/approve` — human approval workflow
- `[api]` `POST /campaign/publish-ready` — finalize for publishing
- `[api]` `POST /analytics/ingest` — ingest checkpoint performance data
- `[api]` `GET /campaign/:id/status` — campaign lifecycle status
- `[api]` `GET /campaign/:id/learning` — learning updates for campaign

#### Backend Services
- `[backend]` `normalizeBrief()` — structure messy input with coverage scoring
- `[backend]` `buildCustomerDNA()` — parse uploads into DNA map
- `[backend]` `runOpportunityScan()` — market opportunity analysis with SBS scoring
- `[backend]` `generateStrategyComparison()` — requested vs recommended with stay/adjust/override decisions
- `[backend]` `generateNarrativeSet()` — multi-candidate narrative generation with cosine novelty
- `[backend]` `scoreNarratives()` — mathematical narrative scoring and ranking
- `[backend]` `generatePostPackages()` — platform-specific content generation
- `[backend]` `generateQRCodeFlow()` — QR/conversation routing
- `[backend]` `ingestAnalyticsCheckpoint()` — performance data ingestion
- `[backend]` `computeViralState()` — real-time viral scoring with component breakdown
- `[backend]` `writeLearningUpdate()` — delta learning writes with recommendation engine

#### Orchestration
- `[backend]` `KLYCOrchestrator` — main orchestrator with campaign/content/workflow dispatch
- `[backend]` `CampaignLifecycleProcessor` — full state machine with stage-by-stage processing
- `[backend]` Routing engine — complexity estimation, signal inference, execution order building
- `[backend]` Normalizer adapter — response normalization and caching (FIFO, 50-entry limit)
- `[backend]` Campaign runner — end-to-end run with Zod validation, normalization, orchestration
- `[backend]` Execution guardrails — max 10 agent steps, 15s timeout, 50KB response limit, 2 retries
- `[backend]` Response formatter — compressed payload, campaign ID generation, metadata aggregation

#### Database Tables
- `[db]` `campaigns`, `campaign_briefs`, `customer_dna`, `narrative_candidates`, `post_packages`, `engagement_events`, `performance_snapshots`, `learning_updates`

#### Compression Architecture
- `[backend]` Three-layer storage: raw > extracted > compressed strategic summary
- `[backend]` SHA-256 hashing for summary deduplication with preview snippets
- `[backend]` Embedding references instead of repeated long text
- `[backend]` Learning updates as deltas only, not full rewrites
- `[backend]` Compressed summary hashes for deduplication
- `[backend]` Reusable memory across campaigns

#### Security
- `[backend]` Request authentication via `x-loveable-auth` header
- `[backend]` Zod schema validation on all inbound payloads
- `[backend]` Header redaction for logging
- `[backend]` Keyword normalization and deduplication (max 25)

### Architecture Decisions
- Claude API as primary LLM with multi-model support per agent
- Lovable for frontend/UI only; all backend via GitHub
- Claude (Cowork) as single source of truth across both systems
- Reactive + proactive hunting modes supported
- Pre-launch A-Z simulation (not just post-launch A/B)
- 2-hour virality decision window with hard cutoff
- Supabase as database layer (existing Lovable integration preserved)

---

## Pre-History — Lovable UI Era (idea-to-idiom)

### Summary
The idea-to-idiom repo was generated by Lovable as the frontend/UI layer for KLYC (click.ai). It contains the full React + Vite + TypeScript + Tailwind application with Supabase integration for database and auth. 37+ migrations spanning Dec 2025 through Mar 2026 built out the database schema incrementally. Components include client management, campaign feeds, strategy intelligence, analytics dashboards, creative tools, social post editing, voice interview mode, and integrations with Airtable, ClickUp, Dropbox, Google Drive, Notion, Canva, Adobe, and video tools. This repo becomes the single production repository going forward.

### Key Components Preserved
- `src/components/` — 40+ React components (campaigns, strategy, analytics, CRM, creative, library, onboarding, social-post-editor, command-center, dashboard, image-editor, landing)
- `src/pages/` — Full page routing
- `src/integrations/supabase/` — Supabase client and type definitions
- `src/contexts/` — React context providers
- `src/hooks/` — Custom React hooks
- `supabase/functions/` — Edge functions
- `supabase/migrations/` — 37 database migrations (Dec 2025 - Mar 2026)

---

## Pre-History — OpenAI Era (ai-controller)

### Summary
Original KLYC AI backend built on OpenAI API (`gpt-4.1-mini`) with the Responses API. Separate middleware repo (`klyc-ai/ai-controller`) housing all agent implementations, orchestrator, campaign lifecycle processor, strategy engine, context compression, and Zod schemas. Architecture validated through development but required migration to Claude for production. Core concepts — Customer DNA, multi-agent orchestration, learning loop, virality scoring — all originated in this phase and carry forward into the Claude-based rebuild.

### Key Files Preserved
- `core/` — Original agent implementations (8 agents), orchestrator, campaign lifecycle, OpenAI client, execution guardrails, response formatter
- `backend/` — Production-grade orchestrator, normalizer, router, strategy engine, campaign runner, context compression, security, Zod schemas, state management
- `backend/models/types.ts` — 13KB comprehensive TypeScript type definitions
- `backend/models/campaign-lifecycle.ts` — Full Zod schema suite for all lifecycle models
- `api/run_campaign.ts` — Campaign execution API endpoint
- Build history files (`klyc_build_history_000` through `024`) and `Raw_history.md` — complete architecture specification
