-- ============================================================
-- KLYC COMPLETE PROJECT HISTORY — Roadmap Seed
-- Source of truth for company progress / due diligence
-- Run in Supabase SQL editor: project wkqiielsazzbxziqmgdb
-- ============================================================
-- owner_id:  e1=Kitchens  e2=Ethan K  e3=Ethan W  e4=Rohil
-- category:  infrastructure | subminds | frontend | integrations | business
-- status:    backlog | planning | design | build | test | shipped
-- effort:    S | M | L | XL
-- ============================================================

CREATE TABLE IF NOT EXISTS roadmap_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  category      text NOT NULL DEFAULT 'frontend',
  status        text NOT NULL DEFAULT 'backlog',
  priority      integer NOT NULL DEFAULT 100,
  effort        text NOT NULL DEFAULT 'M',
  target_date   date,
  progress_pct  integer NOT NULL DEFAULT 0,
  owner_id      text,
  shipped_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

TRUNCATE TABLE roadmap_items;

-- ============================================================
-- PHASE 1 — PLATFORM ARCHITECTURE & CORE IP
-- Dates: Early–Mid April 2026
-- ============================================================

INSERT INTO roadmap_items VALUES
(gen_random_uuid(), 'KLYC Complete Platform Spec', 'Authored full platform specification: architecture, subminds, KNP protocol, orchestrator, normalizer, pricing tiers, go-to-market. Stored as KLYC_COMPLETE_PLATFORM_SPEC.md — source of truth for all engineering decisions.', 'business', 'shipped', 10, 'XL', null, 100, 'e1', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),

(gen_random_uuid(), 'KNP V2.1 Protocol Design', 'Designed and documented Kill Noise Protocol V2.1 — semantic compression and transport layer. Core IP owned by Empyrean Analytics. Baseline compression 68x, maturity target 316x. Stored as KLYC_KNP_V2.1_PROTOCOL.md.', 'subminds', 'shipped', 20, 'XL', null, 100, 'e1', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),

(gen_random_uuid(), 'Orchestrator Routing Logic Design', 'Designed orchestrator routing: wide-open orchestrator routes tasks across 10 domain-locked subminds. Each submind owns a single domain — no cross-contamination. Stored as KLYC_ORCHESTRATOR_ROUTING_LOGIC.md.', 'subminds', 'shipped', 30, 'L', null, 100, 'e1', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),

(gen_random_uuid(), 'Normalizer Spec', 'Cross-platform content normalization layer. Translates campaign content to platform-specific format requirements (LinkedIn, Instagram, TikTok, Twitter, YouTube, etc). Stored as KLYC_NORMALIZER_SPEC.md.', 'subminds', 'shipped', 40, 'L', null, 100, 'e1', '2026-04-05T00:00:00Z', '2026-04-05T00:00:00Z', '2026-04-05T00:00:00Z'),

(gen_random_uuid(), 'Lovable Frontend — Initial Build Queue', 'Established Lovable (React/TypeScript) as frontend framework. Set up idea-to-idiom-5e2d779e repo on GitHub (ethanw37 account). Defined initial build queue for admin portal and client-facing app. Stored as KLYC_LOVABLE_BUILD_QUEUE.md.', 'infrastructure', 'shipped', 50, 'L', null, 100, 'e1', '2026-04-05T00:00:00Z', '2026-04-05T00:00:00Z', '2026-04-05T00:00:00Z'),

(gen_random_uuid(), 'Supabase Schema Setup — Core Tables', 'Set up core Supabase schema: ai_activity_log, submind_health_snapshots, client_profiles, campaign_drafts, orchestrator_sessions, campaign_memory, client_brain, post_queue, post_analytics, social_connections, client_platform_connections. Two projects: KLYC (wkqiielsazzbxziqmgdb) and Empyrean Analytics.', 'infrastructure', 'shipped', 60, 'L', null, 100, 'e2', '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z'),

-- ============================================================
-- PHASE 2 — KNP DASHBOARD DEVELOPMENT (v14c → v18x)
-- Dates: Mid April 2026
-- ============================================================

(gen_random_uuid(), 'KNP Dashboard v14c', 'Initial KNP testing dashboard. Three-test framework: RAW, Individual Tokens, Compressed Utility run in concert with unified comparison table. NanoBanana image generation integrated. First structured compression measurement.', 'subminds', 'shipped', 70, 'XL', null, 100, 'e1', '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v15–v16 — Three-Test Framework', 'Iterated dashboard to run RAW + Individual + Compressed tests simultaneously. Unified comparison table. Token economics displayed: 1 token per image, $0.067/token. Composite = 10x compression (1 credit → 10 images, 90% savings).', 'subminds', 'shipped', 80, 'L', null, 100, 'e1', '2026-04-15T00:00:00Z', '2026-04-15T00:00:00Z', '2026-04-15T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v17b — sigma-o Response Format Fix', 'Fixed sigma-o response format parsing: function was returning single URL string instead of platform object. Images now display correctly in dashboard. Critical fix for compression measurement accuracy.', 'subminds', 'shipped', 90, 'S', null, 100, 'e1', '2026-04-17T00:00:00Z', '2026-04-17T00:00:00Z', '2026-04-17T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v17c — Platform Array Unique Identifiers', 'Fixed platform array to use unique identifiers (tiktok@0, tiktok@1, etc) instead of plain platform name. Prevents collision when same platform appears multiple times in batch output.', 'subminds', 'shipped', 91, 'S', null, 100, 'e1', '2026-04-17T00:00:00Z', '2026-04-17T00:00:00Z', '2026-04-17T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v17d — Batch Path Fix', 'Removed lane parameter from KNP batch calls to enable correct batch generation path. Lane parameter was forcing single-item path instead of optimized batch route. Unlocked true batch throughput.', 'subminds', 'shipped', 92, 'S', null, 100, 'e1', '2026-04-17T00:00:00Z', '2026-04-17T00:00:00Z', '2026-04-17T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v18x — inferGridLayout + Global Lightbox', 'Added inferGridLayout function: auto-detects optimal image grid from batch output. Global lightbox added — all images zoomable. Final stable NanoBanana-era dashboard before Imagen 4 migration.', 'subminds', 'shipped', 93, 'M', null, 100, 'e1', '2026-04-18T00:00:00Z', '2026-04-18T00:00:00Z', '2026-04-18T00:00:00Z'),

-- ============================================================
-- PHASE 3 — IMAGE PIPELINE & COMPOSITE ARCHITECTURE
-- Dates: Mid–Late April 2026
-- ============================================================

(gen_random_uuid(), 'generate-image Edge Function — Initial Build', 'Built generate-image Supabase edge function: first image generation endpoint. NanoBanana integration via Deno. Deployed to KLYC project. Foundation for all AI image generation in the platform.', 'integrations', 'shipped', 100, 'L', null, 100, 'e2', '2026-04-18T00:00:00Z', '2026-04-18T00:00:00Z', '2026-04-18T00:00:00Z'),

(gen_random_uuid(), 'generate-image-composite v13 — Server-Side Split', 'Rebuilt composite edge function with server-side image splitting. One NanoBanana call returns composite; server splits into 4 separate URLs. Eliminates client-side canvas operations. Deployed to both KLYC and Empyrean.', 'integrations', 'shipped', 110, 'L', null, 100, 'e2', '2026-04-19T00:00:00Z', '2026-04-19T00:00:00Z', '2026-04-19T00:00:00Z'),

(gen_random_uuid(), 'knp-cell-images Storage Bucket', 'Created public Supabase Storage bucket knp-cell-images for composite image hosting. Stores split thumbnails with public URLs for dashboard and app consumption.', 'infrastructure', 'shipped', 120, 'S', null, 100, 'e2', '2026-04-19T00:00:00Z', '2026-04-19T00:00:00Z', '2026-04-19T00:00:00Z'),

(gen_random_uuid(), 'Empyrean Analytics — Sync Deployment', 'Deployed all KLYC edge function updates to Empyrean Analytics project in parallel. Established sync requirement: all function fixes deploy to both projects until Empyrean cutover. Both projects stay at feature parity.', 'infrastructure', 'shipped', 130, 'M', null, 100, 'e2', '2026-04-19T00:00:00Z', '2026-04-19T00:00:00Z', '2026-04-19T00:00:00Z'),

(gen_random_uuid(), 'NanoBanana 4x Probe — Native Multi-Image Research', 'Definitive investigation: proved NB always returns 1 URL per credit regardless of parameters. No native multi-image path exists. Composite approach confirmed as correct 4x solution. Documented as DEFINITIVE finding Apr 22 2026.', 'subminds', 'shipped', 140, 'M', null, 100, 'e2', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z'),

(gen_random_uuid(), 'generate-image-composite — encodeWebP Bug Fix', 'Fixed encodeWebP encoding bug in composite v18 that was corrupting split image data. Images were decoding incorrectly on some platforms. Fix restored correct RGBA buffer handling.', 'integrations', 'shipped', 150, 'S', null, 100, 'e2', '2026-04-20T00:00:00Z', '2026-04-20T00:00:00Z', '2026-04-20T00:00:00Z'),

(gen_random_uuid(), 'Brief Leakage Fix — generate-image-composite v14', 'Fixed brief context leakage in composite function where campaign brief was persisting between calls. Critical privacy fix — one client''s brief must never influence another client''s generation.', 'integrations', 'shipped', 160, 'S', null, 100, 'e2', '2026-04-20T00:00:00Z', '2026-04-20T00:00:00Z', '2026-04-20T00:00:00Z'),

-- ============================================================
-- PHASE 4 — GOOGLE IMAGEN 4 MIGRATION
-- Dates: Late April 2026
-- ============================================================

(gen_random_uuid(), 'Google Imagen 4 — Edge Function Migration', 'Rebuilt generate-image edge function with Google Imagen 4 (replacing NanoBanana). Full KNP compression pipeline integrated. Routed to KLYC Supabase. generate-image v73 deployed and validated with three-test framework.', 'integrations', 'shipped', 170, 'XL', null, 100, 'e2', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v19 — Google Imagen 4 + Compression Metrics', 'Migrated KNP dashboard from NanoBanana to Google Imagen 4. Added full compression metrics: tokens in/out, cost per image, seconds per image, yield efficiency. Inline error display. Added to 4-panel test suite.', 'subminds', 'shipped', 180, 'L', null, 100, 'e1', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v20 — Imagen Individual/RAW Modes + Labels', 'Added Individual and RAW test modes for Imagen 4. Fixed all mode labels. Seconds and $/img columns added to results table. Force-redeployed generate-image-composite v29 to clear Deno worker init failure.', 'subminds', 'shipped', 185, 'M', null, 100, 'e1', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z'),

(gen_random_uuid(), 'generate-image-composite v28 — NanoBanana Replaced', 'Final replacement: NanoBanana fully removed from generate-image-composite. Google Imagen 4 handles all image generation. GitHub synced to production v28. Composite v5 confirmed: 10x image compression, 90% cost savings.', 'integrations', 'shipped', 190, 'L', null, 100, 'e2', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'KNP Three-Test Framework — PROVEN (95.2x Yield)', 'Three-test framework validated with Google Imagen 4: 95.2x yield efficiency, 10x image compression, 90% cost savings. generate-image v73 + generate-image-composite v5. DEFINITIVE proof of KNP compression economics. Apr 21 2026.', 'subminds', 'shipped', 195, 'XL', null, 100, 'e1', '2026-04-21T00:00:00Z', '2026-04-21T00:00:00Z', '2026-04-21T00:00:00Z'),

-- ============================================================
-- PHASE 5 — BATCH LAB & ADVANCED DASHBOARD
-- Dates: Late April 2026
-- ============================================================

(gen_random_uuid(), 'Batch Lab Tab — KNP Dashboard v21', 'Built Batch Lab tab: multi-image batch generation with configurable parameters. Sequential test execution (one call at a time) to prevent rate limiting. Integrated into four-test suite end-to-end. Clear pre-filled numbers — show dash until test runs.', 'subminds', 'shipped', 200, 'L', null, 100, 'e1', '2026-04-21T00:00:00Z', '2026-04-21T00:00:00Z', '2026-04-21T00:00:00Z'),

(gen_random_uuid(), 'KNP Dashboard v22 — 4 Targeted UI Fixes', 'Four specific fixes: inline error display in 4-panel test UI, removed image scroll from Tests 1-4 tab, removed image grids from Compression tab, fixed Yield Efficiency Gain to show proven 95.2x when raw tokens unavailable.', 'subminds', 'shipped', 210, 'M', null, 100, 'e1', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z'),

(gen_random_uuid(), 'NB Daily Outage Pattern — Documented', 'Documented NanoBanana daily outage pattern: fails ~3–7 AM UTC (China peak hours). Both gemini001 distributor and OpenAI saturate during this window. Testing protocol updated to avoid this window.', 'infrastructure', 'shipped', 215, 'S', null, 100, 'e2', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z'),

-- ============================================================
-- PHASE 6 — ORCHESTRATOR ARCHITECTURE
-- Dates: Late April 2026
-- ============================================================

(gen_random_uuid(), 'Orchestrator — 10 Submind Architecture', 'Audited and documented klyc-orchestrator subminds routing for image lane. Each of 10 subminds locked to single domain. Orchestrator wide-open, routes based on intent. Image lane confirmed separate from content lane.', 'subminds', 'shipped', 220, 'L', null, 100, 'e2', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z', '2026-04-22T00:00:00Z'),

(gen_random_uuid(), 'Orchestrator v9 — Sequential Neural Pipeline', 'Rebuilt orchestrator as sequential neural pipeline: ordered submind execution, handoff chain, context passing between steps. Time to React and Time to Respond metrics added. Prevents parallel execution conflicts.', 'subminds', 'shipped', 230, 'XL', null, 100, 'e2', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z'),

(gen_random_uuid(), 'Time to React + Time to Respond Metrics', 'Added Time to React (first submind acknowledgment) and Time to Respond (full pipeline completion) to orchestrator pipeline. Enables latency benchmarking per submind and per campaign type.', 'subminds', 'shipped', 240, 'S', null, 100, 'e2', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z'),

-- ============================================================
-- PHASE 7 — KNP PATENT (KNP-001)
-- Dates: Late April 2026
-- ============================================================

(gen_random_uuid(), 'KNP-001 Provisional Patent — v1', 'Filed provisional patent application KNP-001 for Kill Noise Protocol. Covers semantic compression transport layer, yield efficiency measurement, multi-modal compression. Inventor: Kristopher Kitchens. Assignee: Empyrean Analytics LLC.', 'business', 'shipped', 250, 'XL', null, 100, 'e1', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z'),

(gen_random_uuid(), 'KNP-001 Patent v2 — 8 Embedded Technical Diagrams', 'Enhanced patent with 8 embedded architecture diagrams: compression pipeline, submind routing, token economics, yield efficiency curves, composite image architecture, three-test framework, orchestrator flow, cross-platform normalization.', 'business', 'shipped', 260, 'L', null, 100, 'e1', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'KNP-001 Patent v3 — Broadened Scope + Corrected Framing', 'Broadened patent claims to cover all semantic compression methods, not just current implementation. Corrected inventor/company attribution. Fixed technical framing to properly distinguish from prior art. Strengthened independent claims.', 'business', 'shipped', 265, 'L', null, 100, 'e1', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'KNP-001 Patent v4 — Inter-AI Envelope Compression', 'Added inter-AI envelope compression to patent scope: novel claim covering compression of AI-to-AI communication envelopes across distributed inference networks. Dashboard v27 built to demonstrate this claim with live data.', 'business', 'shipped', 270, 'XL', null, 100, 'e1', '2026-04-25T00:00:00Z', '2026-04-25T00:00:00Z', '2026-04-25T00:00:00Z'),

-- ============================================================
-- PHASE 8 — KNP DASHBOARD v27 REFINEMENTS
-- Dates: Late April 2026
-- ============================================================

(gen_random_uuid(), 'KNP Dashboard v27 — Inter-AI Envelope + UI Cleanup', 'Added inter-AI envelope compression demonstration to dashboard. 4 UI cleanup changes: removed redundant panels, tightened layout, improved metric labels, fixed color coding for compression tiers. Dashboard v27 cleanup committed.', 'subminds', 'shipped', 280, 'M', null, 100, 'e1', '2026-04-25T00:00:00Z', '2026-04-25T00:00:00Z', '2026-04-25T00:00:00Z'),

-- ============================================================
-- PHASE 9 — FRONTEND APP FEATURES
-- Dates: April 24–27 2026
-- ============================================================

(gen_random_uuid(), 'Campaigns Tab + CampaignCommandCenter', 'Added Campaigns tab to main app nav. CampaignCommandCenter gate implemented — admin-controlled access. Entry point for all campaign creation flows. Campaign add button in header.', 'frontend', 'shipped', 290, 'M', null, 100, 'e3', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'Creative Studio — Image Generation UI', 'Creative Studio page with tile thumbnails (h-190px + object-cover), lightbox on click, Use in Post button routing to /campaigns/generate. Reference images from Creative Studio passed as navigation state to campaign generator.', 'frontend', 'shipped', 300, 'L', null, 100, 'e3', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'ImageVideoGenerator Component', 'Built ImageVideoGenerator.tsx: dynamic aspect-ratio tile selector, lightbox on click, AI image generation via generate-image-composite, 4-tile output cap, brand color swatches. Pushed to GitHub.', 'frontend', 'shipped', 310, 'L', null, 100, 'e3', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'GenerateCampaignIdeas v2 — Reference Images from Creative Studio', 'GenerateCampaignIdeas.tsx v2: pre-seeds referenceImages from Creative Studio navigation state. Images selected in Creative Studio automatically flow into campaign generation context. Pushed to GitHub.', 'frontend', 'shipped', 320, 'M', null, 100, 'e3', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z'),

(gen_random_uuid(), 'AI Generate — Imagen 4 in Campaign Builder', 'Added Imagen 4 AI Generate panel to Templates assets step in campaign builder. Brand color swatches, flush tile crop indicators, cap at 4 results. Labeled KLYC in UI (not Imagen 4). Routed generate-image-composite to KLYC Supabase.', 'frontend', 'shipped', 330, 'M', null, 100, 'e3', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z'),

(gen_random_uuid(), 'Aspect Ratio Selector + Instagram Crop Fix', 'Added aspect ratio selector to campaign builder. Fixed IG aspect ratio cropping (was forcing wrong crop on all images). Removed forced aspect-ratio crop from AI tile picker — now uses natural h-auto. Added session media tracking.', 'frontend', 'shipped', 340, 'S', null, 100, 'e3', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z'),

-- ============================================================
-- PHASE 10 — POSTING PIPELINE
-- Dates: April 27–29 2026
-- ============================================================

(gen_random_uuid(), 'Platform OAuth Connections — All Social Networks', 'Wired social connections page to social_connections table. Twitter OAuth callback flow: deploys edge function, redirects to /campaigns/new?oauth_success=twitter. LinkedIn, Threads, Snapchat routed through social_connections. Mock platforms (YouTube, Pinterest) bypass token check. Focus re-fetch on reconnect.', 'integrations', 'shipped', 350, 'L', null, 100, 'e2', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z'),

(gen_random_uuid(), 'post-to-platform Edge Function', 'Built post-to-platform Supabase edge function. Routes LinkedIn/Threads/Snapchat through social_connections table. Returns HTTP 200 for business errors (so client can read actual error message). Tags stripped of leading #. Mock platforms bypass token check for testing.', 'integrations', 'shipped', 360, 'XL', null, 100, 'e2', '2026-04-28T00:00:00Z', '2026-04-28T00:00:00Z', '2026-04-28T00:00:00Z'),

(gen_random_uuid(), 'Twitter Per-User OAuth Tokens', 'Fixed Twitter posting: switched from static environment variable tokens to per-user OAuth tokens stored in social_connections table. Each user''s Twitter token retrieved at post time. Eliminated shared-credential security risk.', 'integrations', 'shipped', 365, 'S', null, 100, 'e2', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z'),

(gen_random_uuid(), 'LinkedIn API — Permalink URN + API Version', 'Fixed LinkedIn permalink URN format (was malformed, causing post failures). Updated LinkedIn API version to current. Added IG disclaimer to campaign page. Added account creation toggle.', 'integrations', 'shipped', 370, 'S', null, 100, 'e2', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z'),

(gen_random_uuid(), 'YouTube Real Upload Integration', 'Integrated real YouTube upload path — previously all YouTube uploads were mock/simulated. Now routes through actual YouTube Data API. Removed campaign button from header nav (cleanup).', 'integrations', 'shipped', 375, 'M', null, 100, 'e2', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z'),

-- ============================================================
-- PHASE 11 — INFRASTRUCTURE & LAUNCH PREP
-- Dates: April 30 – May 1 2026
-- ============================================================

(gen_random_uuid(), 'Landing Page — Remove Pricing Section', 'Removed public pricing section from landing page. Pricing now gated to onboarding/sales flow — prevents anchoring before demo and enables custom enterprise negotiation.', 'business', 'shipped', 380, 'S', null, 100, 'e3', '2026-04-30T00:00:00Z', '2026-04-30T00:00:00Z', '2026-04-30T00:00:00Z'),

(gen_random_uuid(), 'Vercel Auto-Deploy CI/CD', 'GitHub Action: auto-deploys to Vercel on push to main. Added vercel.json for Vite SPA routing (all routes serve index.html). Correct output directory configured. Eliminates manual deploy step for every code change.', 'infrastructure', 'shipped', 390, 'S', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'KLYC Supabase Project Separation', 'Separated KLYC and Empyrean Analytics Supabase projects. Pointed all VITE_ env vars to KLYC project (wkqiielsazzbxziqmgdb) — was pointing to old Lovable project causing auth and data failures. Both projects now fully independent.', 'infrastructure', 'shipped', 395, 'M', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'CLAUDE.md — Shared Team Knowledge Base', 'Added CLAUDE.md to repo root. Defines: WHO (Kitchens, Ethan K, Ethan W, Rohil), THE PLATFORM (architecture, tech stack), CURRENT SPRINT GOAL, KEY FILES, BEHAVIOR RULES, SHARED MEMORY sync protocol. All Cowork instances load this on start — zero onboarding time for new sessions.', 'infrastructure', 'shipped', 400, 'S', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Admin Portal Auth — Refresh Session Fix', 'Fixed KlycAdminGuard: replaced getUser() (network round-trip, returns null on refresh before session rehydrates) with getSession() (reads localStorage instantly). Admin no longer gets kicked to login on page refresh or direct URL navigation.', 'infrastructure', 'shipped', 403, 'S', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

-- ============================================================
-- PHASE 12 — ADMIN PORTAL BUILD
-- Dates: May 1 2026
-- ============================================================

(gen_random_uuid(), 'Admin Portal — Full Build (16 Sections)', 'Built complete KLYC Admin Portal at klyc.ai/klyc_admin. 16 sections: Overview, Clients, Revenue, Infrastructure, Compression, Subminds, Channels, Dispatch Log, Collaboration, Client Voting, Roadmap, Marketing, Financials, AI Testing & Measurement, KLYC Internal, Audit Log. Live Supabase data throughout.', 'frontend', 'shipped', 405, 'XL', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Admin Portal — Remove All Mock Data', 'Stripped all hardcoded mock data from: Marketing (30KB to empty state), Financials (37KB to tier pricing + empty state), Roadmap (generateMockItems removed), Voting (4 mock generators removed), Dispatch (5 mock generators removed), Internal (usageComparison + submindUsage removed). All sections now show real data or proper empty states.', 'frontend', 'shipped', 406, 'M', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Cowork Admin Portal Artifact', 'Built self-contained KLYC Admin Portal as Cowork artifact (klyc-admin-portal). Mirrors website exactly: same 16 nav items in same order, same data from same Supabase project. Refresh All does full page reload. Shared via .artifacts/ folder — all team members auto-sync when connected to KLYC folder.', 'infrastructure', 'shipped', 407, 'L', null, 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

-- ============================================================
-- ACTIVE — IN PROGRESS
-- ============================================================

(gen_random_uuid(), 'OAuth Edge Functions — All Platforms', 'Deploy OAuth edge functions for LinkedIn, Instagram, TikTok, Twitter, YouTube, Pinterest to KLYC Supabase. Wire platform connection flow end-to-end from app UI through edge function to social API. Currently: LinkedIn + Threads live, others in progress.', 'integrations', 'build', 5, 'XL', 60, 'e2', '2026-05-15', '2026-04-27T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Post End-to-End — All Live Platforms', 'Full post pipeline working live: create campaign → generate content → select assets → schedule/publish to all connected platforms. LinkedIn + Threads posting confirmed live. YouTube real upload integrated. TikTok, Instagram, Twitter OAuth + posting in progress.', 'integrations', 'build', 6, 'XL', 55, 'e2', '2026-05-20', '2026-04-24T00:00:00Z', '2026-05-01T00:00:00Z'),

-- ============================================================
-- PLANNED — MID-JULY 2026 GOAL: 100 ACTIVE CLIENTS
-- ============================================================

(gen_random_uuid(), 'Analytics Dashboard — Per-Client Post Performance', 'Per-client analytics: impressions, engagement, reach, click-through by platform. Line charts, trend comparison, best/worst performing posts. Admin view aggregated across all clients. Required for client retention.', 'frontend', 'planning', 7, 'L', 0, 'e3', '2026-06-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Klyc Chat', 'In-app AI chat interface: clients ask questions about their campaigns, request content variations, get performance insights, trigger new campaign ideas. Powered by orchestrator. Primary retention and engagement feature.', 'frontend', 'planning', 8, 'XL', 0, 'e3', '2026-06-15', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Client Onboarding Flow', 'Guided setup wizard: connect brand identity, link social platforms, define target audience, set content goals, run first campaign. Required for self-serve onboarding without sales call. Feeds campaign generation context permanently.', 'frontend', 'planning', 9, 'L', 0, 'e3', '2026-06-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Billing + Subscription Management', 'Stripe integration: Starter ($99/10 campaigns), Growth ($350/50), Pro ($1k/150), Enterprise ($2.5k unlimited). Billing portal, usage meters, upgrade/downgrade, invoice history. Required for revenue. Target 100 paying clients by mid-July.', 'business', 'planning', 11, 'XL', 0, 'e1', '2026-06-15', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'TikTok Integration', 'TikTok OAuth + video posting. Vertical format aspect ratio support. Supabase edge function deployment. TikTok for Business API integration.', 'integrations', 'backlog', 15, 'L', 0, 'e2', '2026-07-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'KNP Compression — Runtime Learning (86x Target)', 'Phase 2 of KNP: semantic cache learns from repeated client content patterns. Hash library grows with usage. Target 86x yield efficiency. Each client''s compression improves over time — compounding competitive moat.', 'subminds', 'backlog', 20, 'XL', 0, 'e2', '2026-07-15', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Content Calendar View', 'Calendar UI for cross-platform post scheduling. Drag to reschedule. Color-coded by platform. Filter by client (admin view) or show all (client view). Week/month toggle.', 'frontend', 'backlog', 25, 'M', 0, 'e3', '2026-07-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'KNP Compound Hashes (102x Target)', 'Phase 3 of KNP: cross-session compound hashing. Previously compressed outputs used as inputs to next compression cycle. Target 102x yield efficiency at 3 months of client usage.', 'subminds', 'backlog', 35, 'XL', 0, 'e2', '2026-09-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'),

(gen_random_uuid(), 'Cross-Client Compression Pool (143x Target)', 'Phase 4 of KNP: opt-in cross-client semantic similarity pool. Anonymous brand pattern matching — similar industries share compression gains without sharing content. Target 143x at 6 months.', 'subminds', 'backlog', 45, 'XL', 0, 'e2', '2026-11-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

-- ============================================================
-- VERIFY
SELECT status, COUNT(*) as items FROM roadmap_items GROUP BY status ORDER BY items DESC;
-- ============================================================
