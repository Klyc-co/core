-- KLYC Roadmap Items — seeded from git history
-- Run this in Supabase SQL editor to populate the roadmap_items table
-- Categories: infrastructure | subminds | frontend | integrations | business
-- Statuses:   backlog | planning | design | build | test | shipped
-- Efforts:    S | M | L | XL
-- owner_id:   e1=Kitchens  e2=Ethan K  e3=Ethan W  e4=Rohil

-- Create table if it doesn't exist
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

-- Wipe any existing seed data to avoid dupes on re-run
DELETE FROM roadmap_items WHERE owner_id IN ('e1','e2','e3','e4') OR owner_id IS NULL;

-- ─── SHIPPED ──────────────────────────────────────────────────────────────────

-- Apr 24 — Campaigns Tab + Command Center
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Campaigns Tab', 'Added Campaigns tab to main nav + CampaignCommandCenter gate — entry point for all post creation.', 'frontend', 'shipped', 10, 'M', 100, 'e3', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

-- Apr 24 — Creative Studio
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Creative Studio', 'Image generation studio with tile thumbnails, lightbox on click, and Use in Post → /campaigns/generate flow. References images passed to campaign generator.', 'frontend', 'shipped', 20, 'L', 100, 'e3', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

-- Apr 24 — Imagen 4 Integration (NanoBanana replaced)
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Google Imagen 4 — AI Image Generation', 'Replaced NanoBanana with Google Imagen 4 via generate-image-composite. 4-tile output, brand color swatches, aspect ratio selector, dynamic tile crop. KLYC Supabase key wired. generate-image-composite v28 deployed.', 'integrations', 'shipped', 30, 'L', 100, 'e2', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z');

-- Apr 27 — Platform OAuth Connections
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Platform OAuth Connections', 'Social connections page wired to social_connections table. Twitter OAuth callback flow deployed. LinkedIn, Threads, Snapchat routed through social_connections. Mock platforms (YouTube, Pinterest) bypass token check. Focus re-fetch on reconnect.', 'integrations', 'shipped', 40, 'L', 100, 'e2', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z');

-- Apr 27 — Instagram Aspect Ratio + Session Media Tracking
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Instagram Aspect Ratio + Session Media Tracking', 'Fixed IG aspect ratio cropping. Removed forced crop from AI tile picker (natural h-auto). Added session media tracking. Aspect ratio selector added to campaign builder.', 'frontend', 'shipped', 50, 'S', 100, 'e3', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z');

-- Apr 27-28 — Post-to-Platform Pipeline
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Post-to-Platform Pipeline', 'post-to-platform edge function routes LinkedIn/Threads/Snapchat through social_connections. Returns 200 for business errors so client can read actual error message. Twitter uses per-user OAuth tokens. Mock platforms (YouTube/Pinterest) bypass token check. Tags stripped of leading #.', 'integrations', 'shipped', 60, 'XL', 100, 'e2', '2026-04-28T00:00:00Z', '2026-04-28T00:00:00Z', '2026-04-28T00:00:00Z');

-- Apr 29 — LinkedIn Fixes
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('LinkedIn API Fixes', 'Fixed LinkedIn permalink URN format. Updated LinkedIn API version. IG disclaimer added to campaign page. Account creation toggle added.', 'integrations', 'shipped', 70, 'S', 100, 'e2', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z');

-- Apr 29 — YouTube Real Upload
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('YouTube Real Upload Integration', 'Integrated real YouTube upload path (previously mock). Removed campaign button from header nav.', 'integrations', 'shipped', 80, 'M', 100, 'e2', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z');

-- Apr 30 — Landing Page
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Landing Page — Remove Pricing Section', 'Removed public pricing section from landing page. Pricing gated to onboarding flow.', 'business', 'shipped', 90, 'S', 100, 'e1', '2026-04-30T00:00:00Z', '2026-04-30T00:00:00Z', '2026-04-30T00:00:00Z');

-- May 1 — Vercel CI/CD
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Vercel Auto-Deploy CI/CD', 'Added GitHub Action for Vercel auto-deploy on push to main. Added vercel.json for Vite SPA routing with correct output dir.', 'infrastructure', 'shipped', 100, 'S', 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

-- May 1 — KLYC Supabase Migration
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('KLYC Supabase Migration', 'Pointed all VITE_ env vars to KLYC Supabase project (was pointing to old Lovable project). Separated KLYC and Empyrean environments.', 'infrastructure', 'shipped', 110, 'M', 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

-- May 1 — CLAUDE.md
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('CLAUDE.md — Shared Team Context', 'Added CLAUDE.md to repo root: shared team knowledge base for all Cowork instances. Covers platform architecture, sprint goal, team roster, behavior rules, and memory sync protocol.', 'infrastructure', 'shipped', 120, 'S', 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

-- May 1 — Admin Portal Mock Data Removal
INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, shipped_at, created_at, updated_at) VALUES
('Admin Portal — Remove All Mock Data', 'Removed all hardcoded mock data from Marketing, Financials, Roadmap, Voting, Dispatch, and Internal admin pages. All sections now show proper empty states and pull live from Supabase.', 'frontend', 'shipped', 130, 'M', 100, 'e1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

-- ─── ACTIVE ───────────────────────────────────────────────────────────────────

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('OAuth Edge Functions — All Platforms', 'Deploy OAuth edge functions for LinkedIn, Instagram, TikTok, Twitter, YouTube, Pinterest. Wire platform connection flow end-to-end so users can connect accounts from the app.', 'integrations', 'build', 5, 'XL', 60, 'e2', '2026-05-15', '2026-04-27T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('Post End-to-End — All Live Platforms', 'Full post pipeline working live: create campaign → generate content → select assets → publish to all connected platforms. LinkedIn + Threads live. YouTube, IG, Twitter, TikTok in progress.', 'integrations', 'build', 6, 'XL', 55, 'e2', '2026-05-20', '2026-04-24T00:00:00Z', '2026-05-01T00:00:00Z');

-- ─── PLANNED ──────────────────────────────────────────────────────────────────

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('Analytics Dashboard', 'Per-client post analytics: impressions, engagement, reach by platform. Chart views, trend lines. Feeds into admin portal Analytics section.', 'frontend', 'planning', 7, 'L', 0, 'e3', '2026-06-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('Klyc Chat', 'In-app AI chat for clients: campaign questions, content suggestions, performance insights. Powered by orchestrator.', 'frontend', 'planning', 8, 'XL', 0, 'e3', '2026-06-15', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('Client Onboarding Flow', 'Guided setup: connect brand, platforms, audience, goals. Required for 100-client goal.', 'frontend', 'planning', 9, 'L', 0, 'e3', '2026-06-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('Billing + Subscription Management', 'Stripe integration: Starter ($99), Growth ($350), Pro ($1k), Enterprise ($2.5k). Billing portal, usage limits, upgrade/downgrade.', 'business', 'planning', 11, 'XL', 0, 'e1', '2026-06-15', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('TikTok Integration', 'TikTok OAuth + posting. Video upload via post-to-platform. Vertical aspect ratio support.', 'integrations', 'backlog', 15, 'L', 0, 'e2', '2026-07-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('KNP Compression — Runtime Learning', 'Phase 2 KNP: semantic cache learns from repeated client content patterns. Target: 86x yield efficiency.', 'subminds', 'backlog', 20, 'XL', 0, 'e2', '2026-07-15', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');

INSERT INTO roadmap_items (title, description, category, status, priority, effort, progress_pct, owner_id, target_date, created_at, updated_at) VALUES
('Content Calendar View', 'Calendar UI for viewing and scheduling posts across platforms. Drag to reschedule. Color-coded by platform.', 'frontend', 'backlog', 25, 'M', 0, 'e3', '2026-07-01', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');
