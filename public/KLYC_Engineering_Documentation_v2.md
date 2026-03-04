# KLYC Platform — Full Engineering Documentation Export

**Version:** 2.0  
**Generated:** 2026-03-04  
**Purpose:** Pre-freeze architecture snapshot before AI Agent Architecture phase  
**Classification:** Internal Engineering Reference

---

## Table of Contents

1. [System Overview](#section-1--system-overview)
2. [Routes and Screens](#section-2--routes-and-screens)
3. [Database Schema](#section-3--database-schema)
4. [Edge Functions](#section-4--edge-functions)
5. [AI System](#section-5--ai-system)
6. [Orchestrator Pipeline](#section-6--orchestrator-pipeline)
7. [Learning Engine](#section-7--learning-engine)
8. [Security Model](#section-8--security-model)
9. [Data Flow](#section-9--data-flow)
10. [System Health Report](#section-10--system-health-report)

---

# SECTION 1 — SYSTEM OVERVIEW

## Architecture Summary

KLYC is a full-stack AI-powered marketing automation platform built on React + Vite (frontend) with Supabase (backend). The system is organized into seven distinct layers that interact through well-defined interfaces.

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│  React 18 + Vite + Tailwind CSS + TypeScript            │
│  Routes: 70+ screens across 4 portals                   │
│  State: React Query + ClientContext                      │
├─────────────────────────────────────────────────────────┤
│                    AI ORCHESTRATOR LAYER                  │
│  orchestrator.ts → campaignPlanner → batchGenerator      │
│  Token Monitor → Budget Enforcement                      │
│  Client Brain Loader (400-token budget)                  │
├─────────────────────────────────────────────────────────┤
│                    PUBLISHING LAYER                       │
│  publishQueue.ts → publish-post edge function            │
│  post_queue → post_platform_targets lifecycle            │
│  Exponential backoff + dead_letter handling               │
├─────────────────────────────────────────────────────────┤
│                    ANALYTICS LAYER                        │
│  eventCollector.ts → record-post-analytics               │
│  Platform-specific analytics (6 platforms)               │
│  Predicted vs Actual comparison engine                    │
├─────────────────────────────────────────────────────────┤
│                    LEARNING ENGINE LAYER                  │
│  performanceAnalyzer → patternDiscovery → scopeEngine    │
│  prototypeEngine → massProductionEngine                  │
│  selfPromotion → strategyLearning                        │
├─────────────────────────────────────────────────────────┤
│                    SECURITY LAYER                         │
│  JWT Auth → Request Signing → Rate Limiting              │
│  AES-256-GCM Token Encryption → RLS Policies             │
│  PKCE OAuth → Service-role isolation                     │
├─────────────────────────────────────────────────────────┤
│                    BACKEND LAYER                          │
│  Supabase (Postgres + Auth + Storage + Edge Functions)   │
│  130+ Edge Functions │ 45+ Tables │ RLS on all tables    │
└─────────────────────────────────────────────────────────┘
```

### Layer Interaction Flow

```
User → Frontend → AI Orchestrator → Edge Functions → Database
                       ↓                    ↓
              Publishing Layer ←── Analytics Layer
                       ↓
              Learning Engine → Client Brain → Next Campaign
```

**Frontend ↔ Backend:** All communication via Supabase JS client (`@supabase/supabase-js`). Edge functions invoked via `supabase.functions.invoke()`.

**AI Orchestrator ↔ Publishing:** Orchestrator saves posts to `post_queue`. Publishing layer processes queue independently via `publish-post` edge function.

**Analytics ↔ Learning Engine:** Analytics data flows into `post_analytics`, which feeds `campaign_performance`. Learning Engine discovers patterns and updates `client_brain.strategy_profile`.

**Security Layer:** Cross-cutting concern. JWT validation in all edge functions, RLS on all tables, encrypted tokens for social connections, request signing for AI calls.

---

# SECTION 2 — ROUTES AND SCREENS

## Public Pages

| Route | Component | Purpose | Auth |
|-------|-----------|---------|------|
| `/` | `Index` | Landing page | None |
| `/auth` | `Auth` | Marketer authentication | None |
| `/terms` | `TermsOfService` | Legal terms | None |
| `/privacy` | `PrivacyPolicy` | Privacy policy | None |
| `/admin/login` | `AdminLogin` | Admin authentication | None |
| `/admin/dashboard` | `AdminDashboard` | Admin panel | Admin |
| `/trello-callback` | `TrelloCallback` | OAuth callback | None |

## Client Portal

All routes require `role: client` via `ClientProtected` wrapper. Unauthenticated users redirect to `/client/auth`. Wrong role redirects to `/home`.

| Route | Component | Purpose |
|-------|-----------|---------|
| `/client/auth` | `ClientAuth` | Client login/signup |
| `/client/dashboard` | `ClientDashboard` | Client home dashboard |
| `/client/profile` | `ClientProfile` | Client brand profile |
| `/client/profile/social` | `ClientSocialAssets` | Social media connections |
| `/client/campaigns` | `ClientCampaigns` | View campaigns |
| `/client/approvals` | `ClientApprovals` | Approve/reject content |
| `/client/insights` | `ClientInsights` | Analytics insights |
| `/client/settings` | `ClientSettings` | Account settings |
| `/client/strategy` | `ClientStrategy` | Strategy overview |
| `/client/strategy/trends` | `ClientTrendMonitor` | Trend monitoring |
| `/client/strategy/competitors` | `ClientCompetitorAnalysis` | Competitor analysis |
| `/client/messages` | `Messages` (portalType="client") | Client messaging |
| `/client/onboarding` | `ClientOnboarding` | Voice onboarding flow |

## Marketer Portal

All routes require `role: marketer` via `WithSidebar` wrapper (includes `AppLayout` with sidebar + chat). Unauthenticated users redirect to `/auth`. Wrong role redirects to `/client/dashboard`.

### Core Navigation

| Route | Component | Purpose |
|-------|-----------|---------|
| `/home` | `Home` | Marketer dashboard |
| `/settings` | `Settings` | Platform settings |
| `/messages` | `Messages` (portalType="marketer") | Messaging system |

### Profile & Brand

| Route | Component | Purpose |
|-------|-----------|---------|
| `/profile` | `ProfileOverview` | Brand profile overview |
| `/profile/company` | `CompanyInfo` | Company information |
| `/profile/audience` | `TargetAudience` | Target audience config |
| `/profile/value` | `ValueProposition` | Value proposition editor |
| `/profile/import` | `ImportBrandSources` | Brand source imports |
| `/profile/library` | `Library` | Asset library |
| `/profile/library/import` | `ImportAssetSources` | Asset import sources |
| `/profile/social` | `SocialMediaAssets` | Social connections |
| `/profile/products` | `Products` | Product catalog |
| `/profile/products/create` | `CreateProduct` | Create new product |
| `/profile/products/create-line` | `CreateProductLine` | Create product line |
| `/profile/products/edit/:productId` | `EditProduct` | Edit product |

### Campaigns

| Route | Component | Purpose |
|-------|-----------|---------|
| `/campaigns` | `Campaigns` | Campaign hub |
| `/campaigns/new` | `NewCampaign` | Create campaign |
| `/campaigns/schedule` | `Schedule` | Schedule management |
| `/campaigns/generate` | `GenerateCampaignIdeas` | AI idea generation |
| `/campaigns/pending` | `PendingApprovals` | Pending approvals |
| `/campaigns/drafts` | `CampaignDrafts` | Draft management |
| `/campaigns/drafts/:id` | `CampaignDraftView` | Individual draft view |
| `/campaigns/queue` | `PostQueueManager` | Post queue management |

### Strategy & Research

| Route | Component | Purpose |
|-------|-----------|---------|
| `/brand-strategy` | `BrandStrategy` | Brand strategy planner |
| `/trend-monitor` | `TrendMonitor` | Trend monitoring |
| `/competitor-analysis` | `CompetitorAnalysis` | Competitor analysis |
| `/image-editor` | `ImageEditor` | Visual content editor |

### Analytics

| Route | Component | Purpose |
|-------|-----------|---------|
| `/analytics` | `FullAnalytics` | Full analytics dashboard |
| `/analytics/ai-costs` | `AiCostMonitor` | AI token cost monitor |
| `/profile/tiktok-analytics` | `TikTokAnalytics` | TikTok analytics |
| `/profile/instagram-analytics` | `InstagramAnalytics` | Instagram analytics |
| `/profile/youtube-analytics` | `YouTubeAnalytics` | YouTube analytics |
| `/profile/facebook-analytics` | `FacebookAnalytics` | Facebook analytics |
| `/profile/twitter-analytics` | `TwitterAnalytics` | Twitter/X analytics |
| `/profile/linkedin-analytics` | `LinkedInAnalytics` | LinkedIn analytics |

### System & Orchestrator

| Route | Component | Purpose |
|-------|-----------|---------|
| `/orchestrator` | `OrchestratorPanel` | Pipeline control panel |
| `/orchestrator/graph` | `OrchestratorGraph` | Visual pipeline graph |
| `/publishing/status` | `PublishStatusDashboard` | Publish status tracker |
| `/activity` | `ActivityFeed` | System activity log |

### CRM

| Route | Component | Purpose |
|-------|-----------|---------|
| `/crm/contacts` | `CrmContacts` | Contact management |
| `/crm/deals` | `CrmDeals` | Deal pipeline |
| `/crm/orders` | `CrmOrders` | Order tracking |

### Reports

| Route | Component | Purpose |
|-------|-----------|---------|
| `/reports` | `ReportsPage` | Report generation |
| `/reports/scheduled` | `ReportsPage` | Scheduled reports |

### Projects (Video)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/projects` | `Projects` | Video projects list |
| `/projects/new` | `NewProject` | Create video project |
| `/projects/:id/processing` | `Processing` | Video processing |
| `/projects/:id/edit` | `ProjectEdit` | Video editor |

**Total Routes: 72**

---

# SECTION 3 — DATABASE SCHEMA

## Core Tables

### user_roles

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | FK → auth.users(id) |
| role | app_role (enum) | No | — |

**Unique constraint:** (user_id, role)  
**RLS:** Enabled. Security definer functions `has_role()` and `get_my_role()` bypass RLS for role checks.

### marketer_clients

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| marketer_id | uuid | No | — |
| client_id | uuid | No | — |
| client_name | text | No | — |
| client_email | text | Yes | — |
| status | text | No | 'active' |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** Marketers can CRUD their own records.

### client_profiles

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| business_name | text | Yes | — |
| website | text | Yes | — |
| description | text | Yes | — |
| industry | text | Yes | — |
| target_audience | text | Yes | — |
| value_proposition | text | Yes | — |
| logo_url | text | Yes | — |
| brand_colors | text[] | Yes | — |
| product_category | text | Yes | — |
| geography_markets | text | Yes | — |
| marketing_goals | text | Yes | — |
| main_competitors | text | Yes | — |
| audience_data | jsonb | Yes | '{}' |
| value_data | jsonb | Yes | '{}' |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** Clients manage own profile. Marketers can view connected client profiles via marketer_clients join.

### client_brain

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_id | uuid | No | — |
| user_id | uuid | No | — |
| document_type | text | No | — |
| data | jsonb | No | '{}' |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**Unique constraint:** (client_id, document_type)  
**Document types:** brand_profile, voice_profile, strategy_profile, examples_cache, analytics_history, campaign_history, product_catalog  
**RLS:** Users can CRUD their own brain documents.

### campaign_drafts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| client_id | uuid | Yes | — |
| content_type | text | Yes | — |
| campaign_idea | text | Yes | — |
| campaign_objective | text | Yes | — |
| campaign_goals | text | Yes | — |
| target_audience | text | Yes | — |
| target_audience_description | text | Yes | — |
| post_caption | text | Yes | — |
| image_prompt | text | Yes | — |
| video_script | text | Yes | — |
| article_outline | text | Yes | — |
| scene_prompts | text | Yes | — |
| prompt | text | Yes | — |
| tags | text[] | Yes | — |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** Users can CRUD their own drafts.

### campaign_approvals

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| campaign_draft_id | uuid | Yes | FK → campaign_drafts |
| scheduled_campaign_id | uuid | Yes | FK → scheduled_campaigns |
| marketer_id | uuid | No | — |
| client_id | uuid | No | — |
| status | text | No | 'pending' |
| notes | text | Yes | — |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** Clients can view and update approval status. Marketers can view.

### post_queue

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| client_id | uuid | Yes | — |
| campaign_draft_id | uuid | Yes | FK → campaign_drafts |
| content_type | text | No | 'text' |
| post_text | text | Yes | — |
| media_urls | text[] | Yes | '{}' |
| video_url | text | Yes | — |
| image_url | text | Yes | — |
| status | text | No | 'draft' |
| scheduled_at | timestamptz | Yes | — |
| published_at | timestamptz | Yes | — |
| approved_by | uuid | Yes | — |
| approved_at | timestamptz | Yes | — |
| approval_notes | text | Yes | — |
| error_message | text | Yes | — |
| retry_count | int | Yes | 0 |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**Statuses:** draft, pending_approval, approved, scheduled, publishing, published, failed, partial, dead_letter  
**RLS:** Users CRUD own posts. Clients can view/update posts targeting them.

### post_platform_targets

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| post_queue_id | uuid | No | FK → post_queue |
| platform | text | No | — |
| status | text | No | 'pending' |
| platform_post_id | text | Yes | — |
| published_at | timestamptz | Yes | — |
| error_message | text | Yes | — |
| created_at | timestamptz | No | now() |

**RLS:** Users can CRUD their own post targets (via post_queue join).

### post_analytics

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| post_queue_id | uuid | No | FK → post_queue |
| platform | text | No | — |
| views | int | Yes | — |
| likes | int | Yes | — |
| comments | int | Yes | — |
| shares | int | Yes | — |
| saves | int | Yes | — |
| clicks | int | Yes | — |
| impressions | int | Yes | — |
| reach | int | Yes | — |
| engagement_rate | numeric | Yes | — |
| platform_post_id | text | Yes | — |
| raw_metrics | jsonb | Yes | — |
| fetched_at | timestamptz | No | now() |
| created_at | timestamptz | No | now() |

**RLS:** INSERT restricted to service role only. Users can SELECT.

### messages

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| sender_id | uuid | No | — |
| receiver_id | uuid | No | — |
| marketer_client_id | uuid | Yes | FK → marketer_clients |
| content | text | No | — |
| is_read | boolean | No | false |
| created_at | timestamptz | No | now() |

**RLS:** Users can send (INSERT where sender_id = uid). Users can view messages they sent or received. Receivers can update (mark read).

### activity_events

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| client_id | uuid | Yes | — |
| event_type | text | No | — |
| event_message | text | No | — |
| metadata | jsonb | Yes | '{}' |
| created_at | timestamptz | No | now() |

**Event types:** campaign_generated, campaign_learning_started, campaign_learning_complete, campaign_performance_analyzed, learning_patterns_discovered, scope_recommendations_created, prototype_campaign_created, strategy_scaled, self_promotion_detected, approval_required, ai_warning, publish_failed, strategy_updated  
**RLS:** Users can INSERT and SELECT their own events.

### ai_requests

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| request_id | text | No | — |
| intent | text | Yes | — |
| token_count_estimate | int | Yes | — |
| campaign_id | uuid | Yes | — |
| client_id | uuid | Yes | — |
| created_at | timestamptz | No | now() |

**RLS:** INSERT restricted to service role only (WITH CHECK = false). Users can SELECT their own.

### onboarding_transcripts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| client_id | uuid | Yes | — |
| transcript | text | No | — |
| created_at | timestamptz | No | now() |

**RLS:** Users can INSERT and SELECT their own transcripts.

### campaign_interview_transcripts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| client_id | uuid | Yes | — |
| campaign_draft_id | uuid | Yes | FK → campaign_drafts |
| transcript | text | No | — |
| created_at | timestamptz | No | now() |

**RLS:** Users can INSERT, SELECT, DELETE their own transcripts.

## Learning Engine Tables

### campaign_performance

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| campaign_id | uuid | Yes | FK → campaign_drafts |
| client_id | uuid | No | — |
| platform | text | No | — |
| post_id | uuid | Yes | FK → post_queue |
| predicted_engagement | numeric | Yes | 0 |
| actual_engagement | numeric | Yes | 0 |
| predicted_ctr | numeric | Yes | 0 |
| actual_ctr | numeric | Yes | 0 |
| predicted_conversion | numeric | Yes | 0 |
| actual_conversion | numeric | Yes | 0 |
| engagement_accuracy | numeric | Yes | 0 |
| ctr_accuracy | numeric | Yes | 0 |
| conversion_accuracy | numeric | Yes | 0 |
| performance_score | numeric | Yes | 0 |
| post_length | int | Yes | — |
| post_theme | text | Yes | — |
| cta_type | text | Yes | — |
| publish_time | timestamptz | Yes | — |
| experiment | boolean | Yes | false |
| created_at | timestamptz | No | now() |

**Indexes:** campaign_id, client_id, platform  
**RLS:** Users can INSERT (via campaign_drafts join) and SELECT (via post_queue or campaign_drafts join).

### learning_patterns

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_id | uuid | No | — |
| pattern_type | text | No | — |
| pattern_value | text | No | — |
| confidence_score | numeric | Yes | 0 |
| supporting_campaigns | int | Yes | 0 |
| discovered_at | timestamptz | Yes | now() |
| created_at | timestamptz | Yes | now() |

**Pattern types:** best_platform, best_cta, best_post_length, optimal_publish_time, best_content_theme, highest_engagement_day  
**RLS:** Users can INSERT, SELECT, DELETE (via campaign_drafts or post_queue join).

### strategy_updates

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_id | uuid | No | — |
| old_strategy | jsonb | Yes | '{}' |
| new_strategy | jsonb | Yes | '{}' |
| confidence_score | numeric | Yes | 0 |
| approved | boolean | Yes | false |
| applied_at | timestamptz | Yes | — |
| created_at | timestamptz | Yes | now() |

**RLS:** Users can INSERT, UPDATE, SELECT (via campaign_drafts or post_queue join).

### learning_experiments

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| client_id | uuid | No | — |
| experiment_type | text | No | — |
| hypothesis | text | Yes | — |
| posts_tested | int | Yes | 0 |
| status | text | Yes | 'pending' |
| results | jsonb | Yes | '{}' |
| created_at | timestamptz | Yes | now() |

**RLS:** Users can INSERT, UPDATE, SELECT (via campaign_drafts or post_queue join).

## CRM Tables

### crm_contacts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| connection_id | uuid | No | FK → crm_connections |
| external_id | text | No | — |
| email | text | Yes | — |
| first_name | text | Yes | — |
| last_name | text | Yes | — |
| phone | text | Yes | — |
| company_name | text | Yes | — |
| lifecycle_stage | text | Yes | — |
| source | text | No | — |
| tags | jsonb | Yes | '[]' |
| raw_data | jsonb | Yes | '{}' |

**RLS:** Users can CRUD their own contacts.

### crm_deals

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| connection_id | uuid | No | FK → crm_connections |
| external_id | text | No | — |
| name | text | No | — |
| value | numeric | Yes | — |
| currency | text | Yes | 'USD' |
| stage | text | Yes | — |
| status | text | Yes | — |
| owner | text | Yes | — |
| close_date | timestamptz | Yes | — |
| associated_contact_external_id | text | Yes | — |
| raw_data | jsonb | Yes | '{}' |

**RLS:** Users can CRUD their own deals.

### crm_orders

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| connection_id | uuid | No | FK → crm_connections |
| external_id | text | No | — |
| order_number | text | No | — |
| customer_email | text | Yes | — |
| customer_name | text | Yes | — |
| total_amount | numeric | Yes | — |
| currency | text | Yes | 'USD' |
| status | text | Yes | — |
| items | jsonb | Yes | '[]' |
| order_date | timestamptz | Yes | — |
| raw_data | jsonb | Yes | '{}' |

**RLS:** Users can CRUD their own orders.

## Database Functions

| Function | Returns | Security | Purpose |
|----------|---------|----------|---------|
| `has_role(_user_id uuid, _role app_role)` | boolean | SECURITY DEFINER | Check if user has a specific role |
| `get_my_role()` | text | SECURITY DEFINER | Get current user's role (defaults to 'user') |
| `update_updated_at_column()` | trigger | SECURITY DEFINER | Auto-update `updated_at` on row changes |

---

# SECTION 4 — EDGE FUNCTIONS

## Core Platform Functions

### klyc-chat

| Property | Value |
|----------|-------|
| **Path** | `supabase/functions/klyc-chat/index.ts` |
| **Purpose** | AI chat entrypoint — intent classification, draft management, tool-calling |
| **Auth** | JWT required (verify_jwt in config.toml or manual validation) |
| **Input** | `{ message: string, client_id?: string, conversation_history?: array }` |
| **Output** | `{ response: string, intent?: string, draft_updates?: object, risk_level?: string }` |
| **Tables** | campaign_drafts, client_brain, ai_requests, activity_events |

### publish-post

| Property | Value |
|----------|-------|
| **Path** | `supabase/functions/publish-post/index.ts` |
| **Purpose** | Publish a post to a specific social platform via OAuth tokens |
| **Auth** | JWT required |
| **Input** | `{ postQueueId: string, platform: string }` |
| **Output** | `{ success: boolean, platform_post_id?: string, error?: string }` |
| **Tables** | post_queue, post_platform_targets, social_connections |
| **Security** | Decrypts tokens via AES-256-GCM. AI models never access this function. |

### record-post-analytics

| Property | Value |
|----------|-------|
| **Path** | `supabase/functions/record-post-analytics/index.ts` |
| **Purpose** | Ingest analytics data for a published post |
| **Auth** | Service role or JWT |
| **Input** | `{ post_queue_id: string, platform: string, views: number, likes: number, ... }` |
| **Output** | `{ success: boolean }` |
| **Tables** | post_analytics (INSERT) |

### process-scheduled-campaigns

| Property | Value |
|----------|-------|
| **Path** | `supabase/functions/process-scheduled-campaigns/index.ts` |
| **Purpose** | Cron-triggered worker that processes due scheduled posts |
| **Auth** | CRON_SECRET validation |
| **Trigger** | pg_cron (every minute) |
| **Tables** | post_queue, post_platform_targets, social_connections |

### launch-campaign

| Property | Value |
|----------|-------|
| **Path** | `supabase/functions/launch-campaign/index.ts` |
| **Purpose** | Encrypted campaign payload gateway |
| **Auth** | JWT required |
| **Input** | Encrypted campaign context payload (AES-256-GCM) |
| **Output** | `{ success: boolean, campaign_id: string }` |

## Social Platform Functions (per platform)

Each platform has 3-5 functions following a pattern:

| Pattern | Purpose |
|---------|---------|
| `{platform}-auth-url` | Generate OAuth authorization URL |
| `{platform}-oauth-callback` | Handle OAuth callback, store encrypted tokens |
| `{platform}-analytics` | Fetch platform-specific analytics |
| `{platform}-fetch-posts` | Retrieve published posts |

**Supported platforms:**
- Instagram (auth-url, oauth-callback, analytics, fetch-posts)
- Facebook (auth-url, oauth-callback, analytics, fetch-posts)
- Twitter/X (auth-url, oauth-callback, analytics, fetch-posts)
- LinkedIn (auth-url, oauth-callback, analytics, fetch-posts)
- TikTok (auth-url, oauth-callback, analytics, fetch-posts)
- YouTube (auth-url, oauth-callback, analytics, fetch-posts)
- Discord, Snapchat, Tumblr, Twitch, Patreon, Restream (auth-url, oauth-callback)

## CRM Integration Functions

| Function | Purpose |
|----------|---------|
| `hubspot-crm-auth-url` / `hubspot-crm-oauth-callback` | HubSpot OAuth |
| `salesforce-crm-auth-url` / `salesforce-crm-oauth-callback` | Salesforce OAuth |
| `pipedrive-crm-auth-url` / `pipedrive-crm-oauth-callback` | Pipedrive OAuth |
| `zoho-crm-auth-url` / `zoho-crm-oauth-callback` | Zoho OAuth |
| `shopify-crm-auth-url` / `shopify-crm-oauth-callback` | Shopify OAuth |
| `stripe-crm-auth-url` / `stripe-crm-connect` / `stripe-crm-oauth-callback` | Stripe integration |
| `monday-crm-auth-url` / `monday-crm-oauth-callback` | Monday.com CRM |
| `dynamics-crm-auth-url` / `dynamics-crm-oauth-callback` | Microsoft Dynamics |
| `close-crm-connect` | Close CRM API token |
| `copper-crm-connect` | Copper CRM API token |
| `freshsales-crm-connect` | Freshsales API token |
| `agilecrm-connect` | Agile CRM API token |
| `nutshell-crm-connect` | Nutshell CRM API token |
| `sugarcrm-connect` | SugarCRM API token |
| `activecampaign-crm-connect` | ActiveCampaign API token |
| `square-crm-connect` | Square integration |
| `squarespace-crm-connect` | Squarespace integration |
| `crm-sync` | Unified CRM data sync engine |

## Asset & Integration Functions

| Function | Purpose |
|----------|---------|
| `google-drive-auth-url` / `google-drive-oauth-callback` / `google-drive-list-files` | Google Drive |
| `dropbox-auth-url` / `dropbox-oauth-callback` / `dropbox-list-files` / `dropbox-import-files` / `dropbox-get-thumbnail` / `dropbox-disconnect` | Dropbox |
| `box-auth-url` / `box-oauth-callback` | Box |
| `onedrive-auth-url` / `onedrive-oauth-callback` | OneDrive |
| `canva-auth-url` / `canva-oauth-callback` / `canva-list-designs` | Canva |
| `figma-auth-url` / `figma-oauth-callback` / `figma-fetch-templates` | Figma |
| `notion-auth-url` / `notion-oauth-callback` / `notion-fetch-content` | Notion |
| `frameio-auth-url` / `frameio-oauth-callback` | Frame.io |
| `miro-auth-url` / `miro-oauth-callback` | Miro |
| `adobe-cc-connect` / `adobe-cc-list-assets` | Adobe Creative Cloud |
| `slack-auth-url` / `slack-oauth-callback` | Slack |
| `monday-auth-url` / `monday-oauth-callback` | Monday.com PM |
| `trello-auth-url` / `trello-connect` / `trello-oauth-callback` | Trello |
| `clickup-connect` / `clickup-list-spaces` / `clickup-sync` / `clickup-update-selection` | ClickUp |
| `airtable-connect` / `airtable-list-bases` / `airtable-save-mapping` / `airtable-sync` | Airtable |
| `loom-connect` | Loom |
| `riverside-connect` | Riverside |

## AI & Content Functions

| Function | Purpose |
|----------|---------|
| `generate-campaign-idea` | AI campaign idea generation |
| `generate-image` | AI image generation |
| `generate-canvas-elements` | Canvas element generation |
| `generate-captions` | Video caption generation |
| `generate-broll` | B-roll video generation |
| `regenerate-prompt` | Prompt refinement |
| `elevenlabs-tts` | Text-to-speech synthesis |
| `scan-website` | Website brand scanning |
| `analyze-competitor` | AI competitor analysis |
| `fetch-trends` | Trend data fetching |
| `resolve-trend-url` | Trend URL resolution |
| `run-report` | Report generation |
| `fuse-template` | Template fusion |

## Utility Functions

| Function | Purpose |
|----------|---------|
| `link-client-to-marketer` | Link client account to marketer (service role) |
| `send-client-invite` | Send client invitation email |
| `admin-list-users` | Admin: list all users |
| `admin-delete-user` | Admin: delete user |
| `google-analytics-auth-url` / `google-analytics-oauth-callback` / `google-analytics-data` | GA4 |
| `process-video` / `render-video` | Video processing pipeline |

**Total Edge Functions: ~130**

---

# SECTION 5 — AI SYSTEM

## Architecture

```
┌──────────────────────┐
│   ChatSidebar (UI)   │
│  Web Speech API STT  │
│  ElevenLabs TTS      │
└─────────┬────────────┘
          │ supabase.functions.invoke("klyc-chat")
          ▼
┌──────────────────────┐
│  klyc-chat Edge Fn   │
│  ┌─ Intent Router    │
│  ├─ Tool Calling     │
│  ├─ Draft Manager    │
│  └─ Request Logger   │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐      ┌──────────────────┐
│  Lovable AI Models   │      │  Client Brain    │
│  (gemini / gpt-5)    │◄─────│  (400-token ctx) │
└──────────────────────┘      └──────────────────┘
```

### ChatSidebar Entrypoint

The `ChatSidebar` component serves as the primary user interface for AI interaction. It:
- Persists messages to the database
- Supports text and voice input (Web Speech API STT)
- Renders AI responses with secure Markdown (skipHtml, target="_blank")
- Displays dynamic form elements (text, select, date, bool) for structured intake

### klyc-chat Edge Function

The central AI gateway that:
1. **Validates JWT** — Rejects unauthenticated requests
2. **Signs requests** — Generates unique `request_id` + timestamp for replay protection
3. **Classifies intent** — Determines action: `launch_campaign`, `edit_campaign`, `ask_metrics`, `approval`
4. **Executes tool calls** — Structured function calling for campaign operations
5. **Manages drafts** — Automatically creates/updates `campaign_drafts` from `draft_updates`
6. **Logs requests** — Records to `ai_requests` (metadata only, no full prompts)

### Intent Classification

| Intent | Action |
|--------|--------|
| `launch_campaign` | Create draft → run pipeline |
| `edit_campaign` | Update existing draft fields |
| `ask_metrics` | Query analytics data |
| `approval` | Route to approval workflow |

### Client Brain Loading

Before AI calls, the `clientBrainLoader` loads all 7 brain document types and compresses them into a 400-token budget string. Priority order:

1. Voice rules (tone, banned phrases, CTA style)
2. Compliance constraints
3. Brand positioning & description
4. Product positioning (compact)
5. Strategy (target audience, messaging pillars)
6. Examples (counts only)
7. Analytics summary (aggregated)
8. Campaign history (count)
9. Performance learning insights
10. Learning engine insights (best theme, CTA, timing)

### Voice Interview System

Two voice-driven flows:
1. **Onboarding Interview** — Multi-step brand profile creation. Transcripts stored in `onboarding_transcripts`. Auto-populates `client_brain` and `client_profiles`.
2. **Campaign Interview** — Campaign creation via verbal intake. Transcripts stored in `campaign_interview_transcripts`. Generates `campaign_drafts`.

Both use Web Speech API (STT) and ElevenLabs/SpeechSynthesis (TTS).

### Request Signing & Validation

All AI requests are signed using `aiRequestSigning.ts`:

```typescript
{
  ...payload,
  request_id: crypto.randomUUID(),
  timestamp: new Date().toISOString()
}
```

Validation in edge functions:
- Reject duplicate `request_id` values
- Reject requests with timestamps older than 5 minutes
- Per-user rate limit: 30 AI calls per 5 minutes

---

# SECTION 6 — ORCHESTRATOR PIPELINE

## Pipeline Stages

The `runCampaignPipeline()` function in `src/lib/agents/orchestrator.ts` executes the full campaign lifecycle:

```
Stage 1: load_draft
    │  Load campaign_drafts record by ID
    ▼
Stage 2: load_brain
    │  loadClientBrain() → 400-token budgeted context
    │  Check completeness (brand + voice + strategy required)
    ▼
Stage 3: plan
    │  runCampaignPlanner() → CampaignManifest
    │  Goal analysis → Platform scoring → Structure selection
    │  Token cost estimation → Budget enforcement
    ▼
Stage 4: generate
    │  generateBatchContent() → GeneratedPost[]
    │  Batch size: 10, Concurrency: 3, Max retries: 2
    │  Generates: hook, body, CTA, hashtags per post
    ▼
Stage 5: save_posts
    │  Insert posts into post_queue
    │  Status: "draft" (manual) or "scheduled" (auto)
    ▼
Stage 6: schedule
    │  schedulePosts() → Create post_platform_targets
    │  OR mark as pending_approval
    ▼
Stage 7: campaign_learning (non-blocking)
    │  7a. analyzeCampaignPerformance()
    │  7b. updateClientStrategyFromPerformance()
    │  7c. discoverPerformancePatterns()
    │  7d. scopeNewOpportunities()
    │  7e. generatePrototypeCampaigns()
    │  7f. scaleWinningStrategies()
    │  7g. detectSelfPromotionOpportunity()
    ▼
Stage 8: complete
    │  Return PipelineResult with all metadata
```

## Pipeline Types

```typescript
interface PipelineResult {
  success: boolean;
  draft_id: string;
  client_id: string;
  stage_completed: PipelineStage;
  brain_context?: ClientBrainContext;
  planner_output?: PlannerOutput;
  batch_result?: BatchResult;
  schedule_result?: ScheduleResult;
  post_queue_ids: string[];
  warnings: string[];
  error?: string;
  started_at: string;
  completed_at: string;
}

type PipelineStage =
  | "init" | "load_draft" | "load_brain" | "plan"
  | "generate" | "save_posts" | "schedule"
  | "campaign_learning" | "complete" | "error";
```

## Campaign Planner

`src/lib/agents/campaignPlanner.ts`

1. **Goal Analysis:** Maps campaign objectives to categories (awareness, engagement, leads, sales, authority, community)
2. **Platform Scoring:** Uses goal-platform affinity matrix + client preferences
3. **Structure Selection:** Selects content structures per platform from `platformTemplates.ts`
4. **Manifest Generation:** Creates `CampaignManifest` with schedule, platforms, variations
5. **Budget Enforcement:** Pre-flight cost estimation via `tokenMonitor.ts`

## Token Monitor

`src/lib/agents/tokenMonitor.ts`

Three-step budget enforcement:
1. **Reduce variations** (min 1)
2. **Disable research agent** (save ~3500 tokens/post)
3. **Downgrade model** (gemini-flash-lite or gpt-5-nano)

Model pricing table:
| Model | Input/1K | Output/1K |
|-------|----------|-----------|
| gemini-3-flash-preview | $0.00015 | $0.0006 |
| gemini-2.5-pro | $0.00125 | $0.005 |
| gpt-5 | $0.005 | $0.015 |
| gpt-5-mini | $0.0004 | $0.0016 |
| gpt-5-nano | $0.0001 | $0.0004 |

## Batch Generator

`src/lib/agents/batchGenerator.ts`

- Processes manifest schedule in batches of 10
- Concurrency limit: 3 parallel generations
- Max retries per post: 2
- Generates: hook, body, CTA, hashtags, full_text, structure, tone
- Three tone variations: professional, conversational, bold

## Agent Metrics System

Five specialized agents compute metrics independently:

| Agent | File | Key Metrics |
|-------|------|-------------|
| Research | `researchAgent.ts` | Trend scores, competitor coverage |
| Social | `socialAgent.ts` | Engagement prediction, sentiment |
| Image | `imageAgent.ts` | Visual quality score, text detection |
| Editor | `editorAgent.ts` | Platform compliance, hashtag quality |
| Analytics | `analyticsAgent.ts` | Campaign performance metrics |

`aggregateAgentMetrics()` combines all agent outputs into a unified `OrchestratorMetricsReport`.

---

# SECTION 7 — LEARNING ENGINE

## Architecture

The Learning Intelligence Engine operates autonomously after each campaign pipeline execution.

```
campaign_performance data
        │
        ▼
┌─────────────────────┐
│ Performance Analyzer │  ← Scores: 40% engagement + 30% CTR + 30% conversion
│  performanceAnalyzer │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Pattern Discovery    │  ← Analyzes last 20 campaigns for significant patterns
│  patternDiscovery    │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Scope Engine         │  ← Combines patterns + trends + competitors
│  scopeEngine         │     → New platform/theme/CTA recommendations
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Prototype Engine     │  ← Tests hypotheses with small post batches
│  prototypeEngine     │     → Max 20 posts per experiment
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Mass Production      │  ← Scales patterns with score>0.75, confidence>0.7
│  massProductionEngine│     → Updates client_brain strategy_profile
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Self-Promotion       │  ← Detects high-performing AI marketing content
│  selfPromotion       │     → Generates internal KLYC promo campaigns
└─────────────────────┘
```

## Module Details

### Performance Analyzer (`performanceAnalyzer.ts`)

- Pulls posts from `post_queue` by `campaign_draft_id`
- Retrieves analytics from `post_analytics`
- Compares predicted vs actual via `comparePredictedVsActualPerformance()`
- Calculates: `performance_score = 0.4 * engagement_accuracy + 0.3 * ctr_accuracy + 0.3 * conversion_accuracy`
- Normalizes scores between 0 and 1
- Infers `post_theme` and `cta_type` from content text
- Inserts results into `campaign_performance`

### Pattern Discovery (`patternDiscovery.ts`)

- Analyzes last 500 rows (up to 20 campaigns) from `campaign_performance`
- Minimum 3 campaigns required before pattern detection
- Discovers patterns across dimensions:
  - `best_platform` — Highest avg score by platform
  - `best_content_theme` — Highest avg score by theme
  - `best_cta` — Highest avg score by CTA type
  - `optimal_publish_time` — Best performing time windows
  - `best_post_length` — Optimal character count range
  - `highest_engagement_day` — Best day of week
- Calculates `confidence_score = pattern_support / total_campaigns`
- Minimum confidence threshold: 0.4
- Persists to `learning_patterns` table

### Scope Engine (`scopeEngine.ts`)

- Inputs: discovered patterns + trend data (`social_trends`) + competitor data (`competitor_analyses`)
- Outputs recommendation types:
  - `new_platform` — Untested platforms
  - `emerging_topic` — Trending topics from `social_trends`
  - `content_gap` — Competitor weaknesses
  - `cta_experiment` — New CTA structures
  - `theme_experiment` — New content themes
- Stores recommendations in `strategy_updates` (approved=false)

### Prototype Engine (`prototypeEngine.ts`)

- Creates experimental campaigns from scope recommendations
- Constraints: max 20 posts per experiment, tagged `experiment=true`
- Inserts experiments into `learning_experiments` table
- Generates hypotheses from scope recommendations

### Mass Production Engine (`massProductionEngine.ts`)

- Filters patterns where `confidence_score >= 0.7`
- Performance threshold: `performance_score > 0.75` (referenced in design)
- Max adjustment: 20% change per cycle
- Never overwrites manually configured marketer strategies
- Updates `client_brain.strategy_profile` with:
  - `preferredTheme`
  - `preferredCta`
  - `bestEngagementDay`
  - `preferredPostLength`
  - `learningOptimalTime`
  - `platformPerformance`
  - `optimalPostTimes`
  - `performanceInsights`

### Self-Promotion System (`selfPromotion.ts`)

- Analyzes system-wide `campaign_performance` for AI/automation themes
- Themes monitored: "AI marketing", "social automation", "campaign scaling", "marketing intelligence"
- Performance threshold: 0.7 avg score
- Minimum data points: 10
- Returns `SelfPromoResult` with `should_promote`, `best_themes`, `avg_score`

### Strategy Learning (`strategyLearning.ts`)

Legacy integration providing:
- `updateClientStrategyFromPerformance()` — Direct strategy updates from performance data
- `getCampaignLearningInsights()` — Dashboard data endpoint

### Learning Dashboard (`learningDashboard.ts`)

API for UI consumption:
- `getLearningInsights(clientId)` returns: top platforms, best themes, best CTAs, optimal times, active experiments, winning strategies

### Barrel Export (`campaignLearningEngine.ts`)

Re-exports all learning modules for backward compatibility.

## Safety Controls

| Control | Value |
|---------|-------|
| Min campaigns before learning | 3 |
| Max strategy adjustment per cycle | ±20% |
| Max posting time shift | ±2 hours |
| Max prototype posts per experiment | 20 |
| Prototype cap vs monthly total | 20% |
| Never overwrite manual marketer strategies | ✓ |

---

# SECTION 8 — SECURITY MODEL

## Authentication

### JWT Authentication
- All edge functions validate JWT tokens
- `supabase.auth.getUser()` extracts authenticated user
- `verify_jwt = false` in config.toml for functions needing custom validation

### Role-Based Access Control
- Roles stored in `user_roles` table (never in JWT metadata)
- `get_my_role()` — SECURITY DEFINER function returns role from DB
- `has_role()` — SECURITY DEFINER function for policy checks
- `ProtectedRoute` component enforces client-side routing
- `useUserRole` hook caches role for session

### Portal Separation
- Marketer Portal: `requiredRole="marketer"`, redirect to `/client/dashboard` on wrong role
- Client Portal: `requiredRole="client"`, redirect to `/home` on wrong role

## Request Security

### AI Request Signing (`aiRequestSigning.ts`)

```typescript
{
  ...payload,
  request_id: crypto.randomUUID(),  // Unique per request
  timestamp: new Date().toISOString() // 5-minute validity window
}
```

### Replay Protection
- `request_id` checked for uniqueness in `ai_requests` table
- Requests older than 5 minutes are rejected
- Duplicate `request_id` values are rejected

### Rate Limiting
- Per-user: 30 AI calls per 5-minute window
- Enforced in `klyc-chat` edge function

## Token Security

### AES-256-GCM Encryption (`_shared/encryption.ts`)

All OAuth tokens (access + refresh) encrypted before storage:

```
Format: ENC:v1:<iv_hex>:<ciphertext_hex>
```

- Algorithm: AES-256-GCM with 12-byte IV
- Key: 32-byte `TOKEN_ENCRYPTION_KEY` (hex-encoded secret)
- Auth tag: Appended to ciphertext (16 bytes)
- Backward compatible: Unencrypted tokens (no `ENC:` prefix) read as-is

### AI Isolation
- **Critical:** AI models never access social tokens
- Publishing is strictly via `publish-post` edge function
- Token decryption only occurs in publishing and analytics edge functions

### Signed Storage URLs
- Private storage assets accessed via short-lived signed URLs (5-minute expiry)
- `getSignedAssetUrl()` generates URLs for AI consumption

## Row-Level Security (RLS)

RLS is enabled on **all tables**. Key patterns:

| Pattern | Tables |
|---------|--------|
| `auth.uid() = user_id` | Most tables (direct ownership) |
| Join-based | post_platform_targets → post_queue, campaign_performance → campaign_drafts |
| Service role only INSERT | ai_requests, post_analytics |
| Cross-user SELECT via marketer_clients | client_profiles, google_drive_connections |
| `WITH CHECK = false` (deny all) | ai_requests INSERT (service role only) |

## Service-Role Operations

Edge functions using service role key:
- `process-scheduled-campaigns` — Cron worker
- `record-post-analytics` — Analytics ingestion
- `link-client-to-marketer` — Client linking
- `admin-list-users` / `admin-delete-user` — Admin operations

## PKCE OAuth Security

- `oauth_pkce_states` table stores code_verifier with 15-minute expiry
- Used for Canva, Dropbox, and other PKCE-required OAuth flows
- RLS: Users can INSERT, SELECT, DELETE their own states

---

# SECTION 9 — DATA FLOW

## Complete Campaign Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│ 1. CLIENT VOICE REQUEST                                     │
│    VoiceInterviewMode → Web Speech API (STT)                │
│    OR ChatSidebar → text input                              │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 2. AI INTERVIEW                                             │
│    ChatSidebar → supabase.functions.invoke("klyc-chat")     │
│    Intent: launch_campaign                                  │
│    Output: draft_updates object                             │
│    Transcript → campaign_interview_transcripts              │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 3. DRAFT CREATION                                           │
│    klyc-chat → INSERT/UPDATE campaign_drafts                │
│    Fields: campaign_idea, objective, goals, audience, tags   │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 4. CAMPAIGN PLANNER                                         │
│    runCampaignPlanner({                                      │
│      clientBrain, campaignGoal, platforms, dateRange         │
│    })                                                       │
│    → Goal analysis → Platform scoring                       │
│    → Structure selection → Manifest generation              │
│    → Token estimation → Budget enforcement                  │
│    Output: CampaignManifest                                 │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 5. POST GENERATION                                          │
│    generateBatchContent(manifest)                           │
│    Batch size: 10, Concurrency: 3                           │
│    Per post: hook + body + CTA + hashtags                   │
│    3 tone variations: professional, conversational, bold    │
│    Output: GeneratedPost[]                                  │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 6. POST QUEUE                                               │
│    INSERT → post_queue (status: draft or scheduled)         │
│    INSERT → post_platform_targets (status: pending)         │
│    OR mark pending_approval → emit approval_required event  │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 7. APPROVAL (optional)                                      │
│    Client reviews in ClientApprovals                        │
│    Marketer reviews in PendingApprovals                     │
│    Status: pending_approval → approved → scheduled          │
│    Records in campaign_approvals                            │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 8. PUBLISHING PIPELINE                                      │
│    processQueue() checks for due posts                      │
│    OR process-scheduled-campaigns cron (every minute)       │
│    Status: scheduled → publishing → published/failed        │
│    publish-post edge function per platform                  │
│    Token decryption → Platform API call                     │
│    Exponential backoff on failure (2^retry minutes)         │
│    Dead letter after 5 retries                              │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 9. ANALYTICS INGESTION                                      │
│    record-post-analytics edge function                      │
│    OR platform-specific analytics functions                 │
│    INSERT → post_analytics (service role only)              │
│    updateCampaignMetrics() aggregates per campaign           │
│    comparePredictedVsActualPerformance()                    │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 10. LEARNING ENGINE                                         │
│    analyzeCampaignPerformance() → campaign_performance      │
│    discoverPerformancePatterns() → learning_patterns         │
│    scopeNewOpportunities() → strategy_updates               │
│    generatePrototypeCampaigns() → learning_experiments      │
│    scaleWinningStrategies() → client_brain update           │
│    detectSelfPromotionOpportunity() → internal promo        │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 11. STRATEGY UPDATE                                         │
│    Updated client_brain.strategy_profile with:              │
│      performanceInsights, optimalPostTimes, topThemes       │
│      bestCTA, platformPerformance                           │
│    These feed into the NEXT campaign's brain context        │
│    → The loop closes                                        │
└────────────────────────────────────────────────────────────┘
```

---

# SECTION 10 — SYSTEM HEALTH REPORT

## Operational Systems ✅

| System | Status | Files |
|--------|--------|-------|
| Campaign Orchestrator | ✅ Operational | `orchestrator.ts` (657 lines) |
| Campaign Planner | ✅ Operational | `campaignPlanner.ts` (243 lines) |
| Batch Content Generator | ✅ Operational | `batchGenerator.ts` (265 lines) |
| Publishing Queue | ✅ Operational | `publishQueue.ts` (322 lines) |
| Token Monitor & Budget | ✅ Operational | `tokenMonitor.ts` (311 lines) |
| Client Brain System | ✅ Operational | `clientBrain.ts` + `clientBrainLoader.ts` |
| Performance Analyzer | ✅ Operational | `performanceAnalyzer.ts` (159 lines) |
| Pattern Discovery | ✅ Operational | `patternDiscovery.ts` (217 lines) |
| Scope Engine | ✅ Operational | `scopeEngine.ts` (148 lines) |
| Prototype Engine | ✅ Operational | `prototypeEngine.ts` |
| Mass Production Engine | ✅ Operational | `massProductionEngine.ts` (163 lines) |
| Self-Promotion System | ✅ Operational | `selfPromotion.ts` (84 lines) |
| Analytics Event Collector | ✅ Operational | `eventCollector.ts` (202 lines) |
| Request Signing | ✅ Operational | `aiRequestSigning.ts` (41 lines) |
| Token Encryption | ✅ Operational | `_shared/encryption.ts` (145 lines) |
| Role-Based Access | ✅ Operational | `get_my_role()`, `has_role()` |
| Social OAuth (6 platforms) | ✅ Operational | 30+ edge functions |
| CRM Integration (15+ providers) | ✅ Operational | 30+ edge functions |
| Voice Interview System | ✅ Operational | Web Speech API + ElevenLabs |
| Agent Metrics System | ✅ Operational | 5 agent modules + orchestrator |
| Approval Workflow | ✅ Operational | campaign_approvals + UI |
| Messaging System | ✅ Operational | messages table + realtime |
| Activity Events | ✅ Operational | Emitted at every pipeline stage |

## Recent Changes (Current Sprint)

1. **Learning Intelligence Engine** — Full implementation of 6 learning modules
2. **Database Expansion** — Added `campaign_performance`, `learning_patterns`, `strategy_updates`, `learning_experiments`
3. **Pipeline Integration** — 7 learning stages added to orchestrator (non-blocking)
4. **Brain Context Expansion** — Learning insights injected into 400-token budget
5. **Self-Promotion System** — Autonomous KLYC marketing detection

## Known Gaps ⚠️

| Gap | Severity | Description |
|-----|----------|-------------|
| Cron confirmation | Medium | `process-scheduled-campaigns` pg_cron registration needs verification |
| Analytics auto-ingestion | Medium | Platform analytics fetching is manual, not cron-triggered |
| Predicted vs Actual UI | Low | No dedicated dashboard component for prediction accuracy |
| E2E Integration Tests | Medium | No automated test suite for full pipeline |
| Learning Dashboard UI | Low | `getLearningInsights()` API exists but no dedicated UI component |
| Strategy approval UI | Low | `strategy_updates` table has `approved` field but no approval workflow UI |

## Performance Risks

| Risk | Mitigation |
|------|------------|
| Large batch processing (50+ posts) | Batch size 10 + concurrency limit 3 |
| 1000-row Supabase query limit | Batched queries in eventCollector (50 per batch) |
| Learning engine blocking pipeline | All learning stages wrapped in try/catch (non-blocking) |
| Token cost escalation | 3-step budget enforcement (reduce variations → disable research → downgrade model) |
| Local queue memory growth | `clearCompleted()` cleanup function available |

## Security Risks

| Risk | Status | Mitigation |
|------|--------|------------|
| Token exposure to AI | ✅ Mitigated | AI models never access social tokens or publish-post |
| SQL injection | ✅ Mitigated | No raw SQL execution; parameterized queries only |
| RLS bypass | ✅ Mitigated | RLS on all tables; service role isolated to edge functions |
| Request replay | ✅ Mitigated | request_id uniqueness + 5-min timestamp window |
| Rate limiting | ✅ Mitigated | 30 requests / 5 minutes per user |
| OAuth token storage | ✅ Mitigated | AES-256-GCM encryption with versioned format |
| Admin access | ⚠️ Partial | AdminLogin exists but verify server-side validation |

## Scalability Considerations

| Aspect | Current | Recommendation |
|--------|---------|----------------|
| Edge function cold starts | ~200ms | Acceptable for current scale |
| Campaign batch size | Max 50 posts | Consider worker queue for >100 posts |
| Learning data volume | Last 500 rows analyzed | Add time-windowed partitioning at scale |
| Social connections | 6 platforms publishing | Connection pooling at scale |
| Real-time events | Activity events via polling | Consider Supabase Realtime for live feeds |

---

## File Inventory Summary

| Category | Files | Lines (est.) |
|----------|-------|-------------|
| Frontend Pages | 69 components | ~15,000 |
| Agent System | 12 modules | ~2,500 |
| Learning Engine | 9 modules | ~1,200 |
| Publishing | 1 module | ~320 |
| Analytics | 1 module | ~200 |
| Security | 2 modules | ~180 |
| Client Brain | 2 modules | ~480 |
| Edge Functions | ~130 functions | ~25,000 |
| Database Tables | 45+ tables | — |
| RLS Policies | 120+ policies | — |

**Total estimated codebase: ~45,000+ lines of TypeScript**

---

*End of KLYC Engineering Documentation Export v2.0*  
*Generated: 2026-03-04*  
*Status: Pre-freeze snapshot for AI Agent Architecture phase*
