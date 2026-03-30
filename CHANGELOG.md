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

### Added
- `[infra]` Unified CHANGELOG.md in production repo (idea-to-idiom), consolidating ai-controller and Lovable histories
- `[infra]` Claude API integration as primary LLM backbone (replacing OpenAI)
- `[backend]` Multi-model architecture supporting model-per-agent configuration
- `[infra]` Unified backend repository consolidating ai-controller and Lovable repos

### Changed
- `[backend]` Migrated LLM provider from OpenAI to Anthropic Claude (primary) with multi-model support
- `[infra]` Backend source of truth moved to single GitHub repository (idea-to-idiom-5e2d779e)
- `[ui]` Frontend remains on Lovable for UI changes only

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
