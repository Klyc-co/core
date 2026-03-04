# KLYC System Architecture Export

> Generated: 2026-03-04 | Platform Version: Production  
> Classification: Internal Technical Reference

---

## Table of Contents

1. [System Architecture Map](#1-system-architecture-map)
2. [Database Schema Export](#2-database-schema-export)
3. [Edge Functions](#3-edge-functions)
4. [Orchestrator Pipeline](#4-orchestrator-pipeline)
5. [AI Data Flow](#5-ai-data-flow)
6. [Security Model](#6-security-model)
7. [System Health Summary](#7-system-health-summary)

---

## 1. SYSTEM ARCHITECTURE MAP

### 1.1 Frontend — Route Map

#### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Landing page |
| `/auth` | `Auth` | Marketer authentication |
| `/client/auth` | `ClientAuth` | Client authentication |
| `/terms` | `TermsOfService` | Legal |
| `/privacy` | `PrivacyPolicy` | Legal |
| `/admin/login` | `AdminLogin` | Admin authentication |
| `/admin/dashboard` | `AdminDashboard` | Admin panel |

#### Marketer Portal (Protected, `requiredRole="marketer"`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/home` | `Home` | Marketer dashboard |
| `/projects` | `Projects` | Video/content projects |
| `/projects/new` | `NewProject` | Create project |
| `/projects/:id/processing` | `Processing` | Video processing |
| `/projects/:id/edit` | `ProjectEdit` | Edit project segments |
| `/settings` | `Settings` | Platform settings |
| `/profile` | `ProfileOverview` | Brand profile overview |
| `/profile/company` | `CompanyInfo` | Company details |
| `/profile/audience` | `TargetAudience` | Audience definitions |
| `/profile/value` | `ValueProposition` | Value proposition |
| `/profile/import` | `ImportBrandSources` | Import brand data (Google Drive, Dropbox, etc.) |
| `/profile/library` | `Library` | Asset library |
| `/profile/library/import` | `ImportAssetSources` | Import from external sources |
| `/profile/social` | `SocialMediaAssets` | Social platform connections |
| `/profile/products` | `Products` | Product catalog |
| `/profile/products/create` | `CreateProduct` | New product |
| `/profile/products/create-line` | `CreateProductLine` | New product line |
| `/profile/products/edit/:productId` | `EditProduct` | Edit product |
| `/campaigns` | `Campaigns` | Campaign list |
| `/campaigns/new` | `NewCampaign` | Create campaign |
| `/campaigns/schedule` | `Schedule` | Campaign scheduler |
| `/campaigns/generate` | `GenerateCampaignIdeas` | AI campaign ideas |
| `/campaigns/pending` | `PendingApprovals` | Pending approvals |
| `/campaigns/drafts` | `CampaignDrafts` | Draft list |
| `/campaigns/drafts/:id` | `CampaignDraftView` | Draft detail |
| `/campaigns/queue` | `PostQueueManager` | Post queue management |
| `/brand-strategy` | `BrandStrategy` | Strategy dashboard |
| `/trend-monitor` | `TrendMonitor` | Social trend tracking |
| `/competitor-analysis` | `CompetitorAnalysis` | Competitor intelligence |
| `/image-editor` | `ImageEditor` | Canvas-based editor |
| `/profile/tiktok-analytics` | `TikTokAnalytics` | TikTok metrics |
| `/profile/instagram-analytics` | `InstagramAnalytics` | Instagram metrics |
| `/profile/youtube-analytics` | `YouTubeAnalytics` | YouTube metrics |
| `/profile/facebook-analytics` | `FacebookAnalytics` | Facebook metrics |
| `/profile/twitter-analytics` | `TwitterAnalytics` | Twitter/X metrics |
| `/profile/linkedin-analytics` | `LinkedInAnalytics` | LinkedIn metrics |
| `/analytics` | `FullAnalytics` | Cross-platform analytics |
| `/analytics/ai-costs` | `AiCostMonitor` | AI token cost tracking |
| `/messages` | `Messages` | Marketer ↔ client messaging |
| `/orchestrator` | `OrchestratorPanel` | Pipeline control panel |
| `/orchestrator/graph` | `OrchestratorGraph` | Visual pipeline graph |
| `/publishing/status` | `PublishStatusDashboard` | Publish status monitor |
| `/activity` | `ActivityFeed` | Audit trail |
| `/crm/contacts` | `CrmContacts` | CRM contacts |
| `/crm/deals` | `CrmDeals` | CRM deals |
| `/crm/orders` | `CrmOrders` | CRM orders |
| `/reports` | `ReportsPage` | Brand sentiment reports |
| `/reports/scheduled` | `ReportsPage` | Scheduled reports |

#### Client Portal (Protected, `requiredRole="client"`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/client/dashboard` | `ClientDashboard` | Client overview |
| `/client/profile` | `ClientProfile` | Client brand profile |
| `/client/profile/social` | `ClientSocialAssets` | Social connections |
| `/client/campaigns` | `ClientCampaigns` | View campaigns |
| `/client/approvals` | `ClientApprovals` | Approve/reject campaigns |
| `/client/insights` | `ClientInsights` | Performance insights |
| `/client/settings` | `ClientSettings` | Account settings |
| `/client/strategy` | `ClientStrategy` | Strategy view |
| `/client/strategy/trends` | `ClientTrendMonitor` | Trend tracker |
| `/client/strategy/competitors` | `ClientCompetitorAnalysis` | Competitor view |
| `/client/messages` | `Messages` | Messaging (client view) |
| `/client/onboarding` | `ClientOnboarding` | Voice/text onboarding |

### 1.2 Major UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `ChatSidebar` | `src/components/ChatSidebar.tsx` | AI command center — intent routing, voice triggers, campaign pipeline launch |
| `VoiceInterviewMode` | `src/components/VoiceInterviewMode.tsx` | Voice/text interview for onboarding & campaign creation with preview card |
| `AppLayout` | `src/components/AppLayout.tsx` | Sidebar + header shell with ChatSidebar |
| `AppHeader` | `src/components/AppHeader.tsx` | Top nav with client switcher + add client dialog |
| `ClientSwitcher` | `src/components/ClientSwitcher.tsx` | Global marketer ↔ client context switching |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Role-based route guard |
| `AddClientDialog` | `src/components/AddClientDialog.tsx` | Marketer adds client by email |
| `LiveCampaignsFeed` | `src/components/LiveCampaignsFeed.tsx` | Real-time campaign status feed |
| `SocialMediaAnalyticsSummary` | `src/components/SocialMediaAnalyticsSummary.tsx` | Cross-platform analytics overview |
| `WebsiteAnalyticsSummary` | `src/components/WebsiteAnalyticsSummary.tsx` | GA4 website analytics widget |
| `AnalyticsPlatformGrid` | `src/components/AnalyticsPlatformGrid.tsx` | Platform analytics grid |
| `ProductsContent` | `src/components/ProductsContent.tsx` | Product catalog management |
| `SegmentCard` | `src/components/SegmentCard.tsx` | Video segment editor card |
| `ImageSourcePicker` | `src/components/ImageSourcePicker.tsx` | Multi-source image picker |
| `LibraryAssetPicker` | `src/components/LibraryAssetPicker.tsx` | Brand library asset selector |
| CRM Components | `src/components/crm/*` | CRM contact/deal/order views |
| Dropbox Components | `src/components/dropbox/*` | Dropbox file browsing |
| Image Editor Components | `src/components/image-editor/*` | Fabric.js canvas tools |
| Social Post Editor | `src/components/social-post-editor/*` | Post composition tools |
| Landing Components | `src/components/landing/*` | Public landing page sections |

### 1.3 Backend — Edge Functions (130+)

#### Core AI & Pipeline

| Function | Purpose |
|----------|---------|
| `klyc-chat` | AI gateway — JWT auth, rate limiting, replay prevention, tool-calling |
| `launch-campaign` | Campaign launch trigger |
| `generate-campaign-idea` | AI campaign ideation |
| `generate-image` | AI image generation |
| `generate-captions` | AI caption generation |
| `generate-canvas-elements` | AI canvas element generation |
| `generate-broll` | AI B-roll video generation |
| `regenerate-prompt` | Prompt regeneration |
| `elevenlabs-tts` | Text-to-speech via ElevenLabs |
| `scan-website` | Brand import via website scraping |
| `analyze-competitor` | Competitor analysis via AI |
| `run-report` | Brand sentiment report generation |
| `fetch-trends` | Social trend scraping |

#### Publishing & Analytics

| Function | Purpose |
|----------|---------|
| `publish-post` | Publish to connected platforms |
| `record-post-analytics` | Ingest post performance metrics |
| `process-scheduled-campaigns` | Cron processor for scheduled campaigns |
| `process-video` | Video transcription + segmentation |
| `render-video` | Final video rendering |

#### Social OAuth (per platform: auth-url + oauth-callback)

Platforms: Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Snapchat, Discord, Twitch, Tumblr, Patreon, Restream, Slack

#### CRM Integrations (per provider: auth-url + oauth-callback or connect)

Providers: HubSpot, Salesforce, Pipedrive, Zoho, Shopify, Stripe, Square, ActiveCampaign, AgileCRM, Close, Copper, Freshsales, Monday, Nutshell, SugarCRM, Squarespace, Dynamics

#### Storage & Asset Integrations

| Function | Purpose |
|----------|---------|
| `google-drive-*` | Google Drive auth + file listing |
| `dropbox-*` | Dropbox auth, file listing, import, thumbnails |
| `box-*` | Box auth |
| `onedrive-*` | OneDrive auth |
| `notion-*` | Notion auth + content fetch |
| `canva-*` | Canva auth + design listing |
| `figma-*` | Figma auth + template fetch |
| `adobe-cc-*` | Adobe CC connection + assets |
| `frameio-*` | Frame.io auth |
| `miro-*` | Miro auth |
| `airtable-*` | Airtable connect, bases, mapping, sync |
| `clickup-*` | ClickUp connect, spaces, sync, selection |
| `trello-*` | Trello auth + connect |
| `monday-*` | Monday.com auth |
| `loom-connect` | Loom connection |
| `riverside-connect` | Riverside connection |

#### User Management

| Function | Purpose |
|----------|---------|
| `link-client-to-marketer` | Email-matching client linking |
| `send-client-invite` | Client invitation email |
| `admin-list-users` | Admin user listing |
| `admin-delete-user` | Admin user deletion |

#### Platform Analytics Fetchers

Per-platform: `facebook-analytics`, `instagram-analytics`, `twitter-analytics`, `linkedin-analytics`, `tiktok-analytics`, `youtube-analytics`, `google-analytics-data`

Post fetchers: `facebook-fetch-posts`, `instagram-fetch-posts`, `twitter-fetch-posts`, `linkedin-fetch-posts`, `tiktok-fetch-posts`, `youtube-fetch-posts`

### 1.4 AI Layer

| Module | File | Purpose |
|--------|------|---------|
| Orchestrator | `src/lib/agents/orchestrator.ts` | Pipeline controller: draft → brain → plan → generate → save → schedule |
| Campaign Planner | `src/lib/agents/campaignPlanner.ts` | Goal analysis, platform affinity, content structure |
| Batch Generator | `src/lib/agents/batchGenerator.ts` | Multi-post content generation |
| Research Agent | `src/lib/agents/researchAgent.ts` | Trend/competitor research |
| Social Agent | `src/lib/agents/socialAgent.ts` | Platform-optimized content |
| Image Agent | `src/lib/agents/imageAgent.ts` | Visual content generation |
| Editor Agent | `src/lib/agents/editorAgent.ts` | Content editing/refinement |
| Analytics Agent | `src/lib/agents/analyticsAgent.ts` | Performance analysis |
| Token Monitor | `src/lib/agents/tokenMonitor.ts` | Cost estimation, $1/post budget enforcement |
| Platform Templates | `src/lib/agents/platformTemplates.ts` | Platform-specific formatting |
| Client Brain Loader | `src/lib/client/clientBrainLoader.ts` | 400-token budgeted context builder |
| Client Brain Core | `src/lib/clientBrain.ts` | Brain document CRUD |

### 1.5 Voice Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| `useSpeechRecognition` | Web Speech API | Browser-native STT |
| `useTTS` | ElevenLabs (`elevenlabs-tts` edge fn) | Text-to-speech responses |
| `VoiceInterviewMode` | React component | Onboarding + campaign interview UI |
| `onboarding_transcripts` | Database table | Persisted onboarding transcripts |
| `campaign_interview_transcripts` | Database table | Persisted campaign interview transcripts |

### 1.6 Publishing Layer

| Module | File/Function | Purpose |
|--------|---------------|---------|
| Publish Queue | `src/lib/publishing/publishQueue.ts` | In-memory + DB queue with retry/backoff |
| `publish-post` | Edge function | Platform API publishing |
| `process-scheduled-campaigns` | Edge function | Cron-based queue processor |
| `post_queue` | Database table | Persistent post state machine |
| `post_platform_targets` | Database table | Per-platform publish tracking |
| `social_connections` | Database table | AES-256-GCM encrypted OAuth tokens |

### 1.7 Analytics Layer

| Module | File/Function | Purpose |
|--------|---------------|---------|
| Event Collector | `src/lib/analytics/eventCollector.ts` | `recordAnalyticsEvent()`, `comparePredictedVsActualPerformance()` |
| `record-post-analytics` | Edge function | Platform metrics ingestion |
| `post_analytics` | Database table | Per-post performance data |
| `ai_requests` | Database table | AI call audit logging |
| `activity_events` | Database table | Full system audit trail |
| Platform Analytics | Edge functions (6) | Per-platform data fetch |

---

## 2. DATABASE SCHEMA EXPORT

### Core User & Role Tables

#### `user_roles`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | FK → auth.users |
| `role` | app_role enum | No | — | `admin`, `moderator`, `user` |
| `created_at` | timestamptz | No | `now()` | — |

**RLS**: No client-side INSERT/UPDATE/DELETE. Admins SELECT only via `has_role()` SECURITY DEFINER.

#### `marketer_clients`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `marketer_id` | uuid | No | — |
| `client_id` | uuid | No | — |
| `client_name` | text | No | — |
| `client_email` | text | Yes | — |
| `status` | text | No | `'active'` |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS**: Marketers: full CRUD on own rows. Clients: SELECT on own relationships.

### Brand & Client Data

#### `client_profiles`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `business_name` | text | Yes |
| `website` | text | Yes |
| `description` | text | Yes |
| `industry` | text | Yes |
| `target_audience` | text | Yes |
| `value_proposition` | text | Yes |
| `logo_url` | text | Yes |
| `brand_colors` | text[] | Yes |
| `product_category` | text | Yes |
| `geography_markets` | text | Yes |
| `marketing_goals` | text | Yes |
| `main_competitors` | text | Yes |
| `audience_data` | jsonb | Yes |
| `value_data` | jsonb | Yes |

**RLS**: Clients: ALL on own. Marketers: SELECT via `marketer_clients` join.

#### `client_brain`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `client_id` | uuid | No |
| `user_id` | uuid | No |
| `document_type` | text | No |
| `data` | jsonb | Yes |
| `created_at` | timestamptz | No |
| `updated_at` | timestamptz | No |

Document types: `brand_profile`, `voice_profile`, `strategy_profile`, `examples_cache`, `analytics_history`, `campaign_history`, `product_catalog`

### Campaign Tables

#### `campaign_drafts`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `client_id` | uuid | Yes |
| `campaign_idea` | text | Yes |
| `campaign_objective` | text | Yes |
| `campaign_goals` | text | Yes |
| `content_type` | text | Yes |
| `target_audience` | text | Yes |
| `target_audience_description` | text | Yes |
| `post_caption` | text | Yes |
| `image_prompt` | text | Yes |
| `video_script` | text | Yes |
| `article_outline` | text | Yes |
| `scene_prompts` | text | Yes |
| `prompt` | text | Yes |
| `tags` | text[] | Yes |

#### `campaign_approvals`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `campaign_draft_id` | uuid | Yes |
| `scheduled_campaign_id` | uuid | Yes |
| `marketer_id` | uuid | No |
| `client_id` | uuid | No |
| `status` | text | No (`'pending'`) |
| `notes` | text | Yes |

**RLS**: Marketers: ALL on own. Clients: SELECT + UPDATE on own.

#### `scheduled_campaigns`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `client_id` | uuid | Yes |
| `campaign_name` | text | No |
| `platforms` | text[] | No |
| `scheduled_date` | text | No |
| `scheduled_time` | text | No |
| `post_caption` | text | Yes |
| `image_url` | text | Yes |
| `video_url` | text | Yes |
| `media_urls` | text[] | Yes |
| `links` | text[] | Yes |
| `tags` | text[] | Yes |
| `product` | text | Yes |
| `status` | text | No (`'scheduled'`) |

### Post & Publishing Tables

#### `post_queue`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `client_id` | uuid | Yes |
| `campaign_draft_id` | uuid | Yes (FK → campaign_drafts) |
| `content_type` | text | No (`'text'`) |
| `post_text` | text | Yes |
| `media_urls` | text[] | Yes |
| `video_url` | text | Yes |
| `image_url` | text | Yes |
| `status` | text | No (`'draft'`) |
| `scheduled_at` | timestamptz | Yes |
| `published_at` | timestamptz | Yes |
| `approved_by` | uuid | Yes |
| `approved_at` | timestamptz | Yes |
| `approval_notes` | text | Yes |
| `retry_count` | int | Yes (0) |
| `error_message` | text | Yes |

**RLS**: Users: full CRUD on own. Clients: SELECT + UPDATE on posts targeting them.

#### `post_platform_targets`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `post_queue_id` | uuid | No (FK → post_queue) |
| `platform` | text | No |
| `status` | text | No (`'pending'`) |
| `platform_post_id` | text | Yes |
| `published_at` | timestamptz | Yes |
| `error_message` | text | Yes |

**RLS**: All operations via `post_queue.user_id = auth.uid()` join.

#### `post_analytics`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `post_queue_id` | uuid | No (FK → post_queue) |
| `platform` | text | No |
| `impressions` | int | Yes |
| `clicks` | int | Yes |
| `likes` | int | Yes |
| `comments` | int | Yes |
| `shares` | int | Yes |
| `saves` | int | Yes |
| `views` | int | Yes |
| `reach` | int | Yes |
| `engagement_rate` | numeric | Yes |
| `platform_post_id` | text | Yes |
| `raw_metrics` | jsonb | Yes |
| `fetched_at` | timestamptz | No |

**RLS**: INSERT/UPDATE service-role only. Users: SELECT own.

### Messaging & Activity

#### `messages`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `sender_id` | uuid | No |
| `receiver_id` | uuid | No |
| `marketer_client_id` | uuid | Yes (FK → marketer_clients) |
| `content` | text | No |
| `is_read` | boolean | No (false) |
| `created_at` | timestamptz | No |

**RLS**: INSERT where sender = auth.uid(). SELECT where sender or receiver. UPDATE where receiver.

#### `activity_events`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `client_id` | uuid | Yes |
| `event_type` | text | No |
| `event_message` | text | No |
| `metadata` | jsonb | Yes |
| `created_at` | timestamptz | No |

Event types: `campaign_generated`, `campaign_ready`, `publish_failed`, `rate_limited`, `approval_required`, `ai_warning`

**RLS**: INSERT + SELECT + DELETE on own. No UPDATE.

#### `ai_requests`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `request_id` | text | No (UNIQUE) |
| `intent` | text | Yes |
| `client_id` | uuid | Yes |
| `campaign_id` | uuid | Yes |
| `token_count_estimate` | int | Yes |
| `created_at` | timestamptz | No |

**RLS**: INSERT service-role only (with check = false). SELECT own. No UPDATE/DELETE.

### Transcript Tables

#### `onboarding_transcripts`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `client_id` | uuid | Yes |
| `transcript` | text | No |
| `created_at` | timestamptz | No |

#### `campaign_interview_transcripts`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `client_id` | uuid | Yes |
| `campaign_draft_id` | uuid | Yes |
| `transcript` | text | No |
| `created_at` | timestamptz | No |

**RLS**: INSERT + SELECT + DELETE on own. No UPDATE.

### Social & CRM Tables

#### `social_connections`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `platform` | text | No |
| `access_token` | text | No (AES-256-GCM encrypted, `ENC:v1:` prefix) |
| `refresh_token` | text | Yes (encrypted) |
| `platform_user_id` | text | Yes |
| `platform_username` | text | Yes |
| `scopes` | text[] | Yes |
| `token_expires_at` | timestamptz | Yes |

#### `crm_connections`
| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | No |
| `user_id` | uuid | No |
| `provider` | text | No |
| `display_name` | text | No |
| `access_token` | text | Yes |
| `refresh_token` | text | Yes |
| `status` | text | No (`'active'`) |
| `sync_frequency_minutes` | int | No (60) |
| `metadata` | jsonb | Yes |

#### `crm_contacts` / `crm_deals` / `crm_orders`
Standard CRM entity tables with `connection_id` FK, `external_id`, and `raw_data` jsonb. All RLS: own user_id.

### Additional Tables

| Table | Purpose |
|-------|---------|
| `brand_assets` | Imported brand media |
| `brand_imports` | Website scan history |
| `competitor_analyses` | AI competitor reports |
| `social_trends` | Scraped social trends |
| `products` / `product_lines` / `product_assets` | Product catalog |
| `projects` / `segments` | Video editing projects |
| `report_results` / `scheduled_reports` | Brand sentiment reports |
| `user_settings` | User preferences (Zapier webhook URL) |
| `zapier_automation_results` | Zapier trigger logs |
| `oauth_pkce_states` | OAuth PKCE flow state (15-min expiry) |
| `google_drive_connections` / `google_drive_assets` | Google Drive integration |
| `dropbox_connections` / `dropbox_assets` | Dropbox integration |
| `airtable_connections` / `airtable_table_mappings` / `airtable_synced_records` | Airtable sync |
| `clickup_connections` / `clickup_lists` / `clickup_tasks` / `clickup_attachments` | ClickUp sync |
| `loom_connections` / `riverside_connections` / `trello_connections` | Tool connections |
| `crm_companies` / `crm_sync_logs` | CRM metadata |

---

## 3. EDGE FUNCTIONS

### 3.1 `klyc-chat`

| Property | Value |
|----------|-------|
| **Trigger** | `POST` via `supabase.functions.invoke()` or direct fetch |
| **Auth** | JWT required; `getClaims()` validation |
| **Rate Limit** | 30 requests / 5 minutes per user |
| **Replay Prevention** | `request_id` unique constraint + 5-min timestamp window |
| **Input Schema** | `{ messages[], client_id, marketer_client_id?, context_summary?, draft_id?, request_id, timestamp }` |
| **Output Schema** | `{ intent, message, next_questions[], draft_updates{}, risk_level, requires_approval }` |
| **AI Model** | `google/gemini-3-flash-preview` via Lovable AI Gateway |
| **Tool Calling** | `klyc_respond` function with structured output |
| **Side Effects** | Logs to `ai_requests`, persists messages, upserts `campaign_drafts` for `launch_campaign` intent |

### 3.2 `publish-post`

| Property | Value |
|----------|-------|
| **Trigger** | Invoked by `publishQueue.ts` or `process-scheduled-campaigns` |
| **Auth** | Service role |
| **Input** | `{ post_queue_id, platform, content }` |
| **Output** | `{ success, platform_post_id?, error? }` |
| **Side Effects** | Updates `post_platform_targets` status, decrypts `social_connections` tokens |

### 3.3 `record-post-analytics`

| Property | Value |
|----------|-------|
| **Trigger** | Cron or manual invoke |
| **Auth** | Service role |
| **Input** | `{ post_queue_id, platform }` |
| **Output** | `{ metrics }` |
| **Side Effects** | Inserts into `post_analytics` |

### 3.4 `process-scheduled-campaigns`

| Property | Value |
|----------|-------|
| **Trigger** | Cron schedule |
| **Auth** | Service role |
| **Purpose** | Scans `scheduled_campaigns` for due items, triggers `publish-post` |

### 3.5 `launch-campaign`

| Property | Value |
|----------|-------|
| **Trigger** | `POST` from frontend |
| **Auth** | JWT required |
| **Purpose** | Creates/updates `campaign_drafts` and triggers scheduling |

### 3.6 Platform Analytics Functions (6)

`facebook-analytics`, `instagram-analytics`, `twitter-analytics`, `linkedin-analytics`, `tiktok-analytics`, `youtube-analytics`

All follow pattern: JWT auth → decrypt token → fetch platform API → return metrics.

---

## 4. ORCHESTRATOR PIPELINE

### Pipeline Stages

```
┌─────────────┐
│  INIT        │  runCampaignPipeline(draftId, options)
└──────┬──────┘
       │
┌──────▼──────┐
│ LOAD_DRAFT  │  loadCampaignDraft(draftId) → campaign_drafts
└──────┬──────┘
       │
┌──────▼──────┐
│ LOAD_BRAIN  │  loadClientBrain(clientId, 400) → BudgetedBrainContext
└──────┬──────┘  assessCompleteness() → warn if brand/voice/strategy missing
       │
┌──────▼──────┐
│    PLAN     │  runCampaignPlanner(draft, brain, options) → CampaignManifest
└──────┬──────┘  Goal analysis, platform affinity, content structure
       │         Token budget enforcement ($1/post via tokenMonitor)
       │
┌──────▼──────┐
│  GENERATE   │  generateBatchContent(manifest) → BatchResult
└──────┬──────┘  Per-post content via AI (captions, images, variations)
       │
┌──────▼──────┐
│ SAVE_POSTS  │  savePostsToQueue(posts, userId, clientId, draftId)
└──────┬──────┘  Insert into post_queue + post_platform_targets
       │
┌──────▼──────┐
│  SCHEDULE   │  schedulePosts(postIds) → ScheduleResult
└──────┬──────┘  (if auto_schedule enabled)
       │
┌──────▼──────┐
│  COMPLETE   │  Emit activity_events, return PipelineResult
└─────────────┘
```

### File Locations

| Stage | File | Function |
|-------|------|----------|
| Pipeline Entry | `src/lib/agents/orchestrator.ts` | `runCampaignPipeline()` |
| Draft Loading | `src/lib/agents/orchestrator.ts` | `loadCampaignDraft()` |
| Brain Loading | `src/lib/client/clientBrainLoader.ts` | `loadClientBrain()` |
| Planning | `src/lib/agents/campaignPlanner.ts` | `runCampaignPlanner()` |
| Budget | `src/lib/agents/tokenMonitor.ts` | `estimateTokenCost()`, `enforceBudget()` |
| Batch Generation | `src/lib/agents/batchGenerator.ts` | `generateBatchContent()` |
| Queue Save | `src/lib/publishing/publishQueue.ts` | `savePostsToQueue()` |
| Scheduling | `src/lib/publishing/publishQueue.ts` | `schedulePosts()` |
| Activity Events | `src/lib/agents/orchestrator.ts` | `emitActivityEvent()` |

---

## 5. AI DATA FLOW

```
┌─────────────────────┐
│  User (Voice/Text)  │
└─────────┬───────────┘
          │ Speech or typed input
          ▼
┌─────────────────────┐
│  VoiceInterviewMode │  loadClientBrain() → brain_context_min (≤400 tokens)
│  (STT: Web Speech)  │  Accumulates draft fields across steps
└─────────┬───────────┘  Shows CampaignPreviewCard on completion
          │ onSendMessage(text, brainContext)
          ▼
┌─────────────────────┐
│    ChatSidebar      │  signRequest() → { request_id, timestamp }
│                     │  Injects brain context into context_summary
└─────────┬───────────┘
          │ POST /functions/v1/klyc-chat
          ▼
┌─────────────────────┐
│  klyc-chat (Edge)   │  JWT validation → replay check → rate limit
│                     │  → marketer_client access validation
│                     │  → AI Gateway (Gemini 3 Flash)
│                     │  → tool_call parse → structured response
└─────────┬───────────┘
          │ { intent, message, draft_updates, next_questions }
          ▼
┌─────────────────────┐
│  draft_updates      │  campaign_draft: { goal, theme, platforms, ... }
│  processing         │  upsertCampaignDraftFromInterview()
└─────────┬───────────┘
          │ Persisted to campaign_drafts table
          ▼
┌─────────────────────┐
│  Campaign Preview   │  CampaignPreviewCard renders:
│  Card               │  name, goal, theme, platforms, est. posts,
│                     │  predicted engagement
└─────────┬───────────┘
          │ User clicks "Approve Campaign"
          ▼
┌─────────────────────┐
│ runCampaignPipeline │  Load Draft → Load Brain → Plan → Generate
│                     │  → Save Posts → Schedule
└─────────┬───────────┘
          │ PipelineResult { success, post_queue_ids }
          ▼
┌─────────────────────┐
│    post_queue       │  Posts persisted with status 'draft' or
│                     │  'pending_approval'
└─────────┬───────────┘
          │ activity_event: "campaign_ready"
          │ Chat message: "Your campaign is ready"
          │ Button: "Open Campaign Queue" → /campaigns/queue
          ▼
┌─────────────────────┐
│   publishQueue      │  processQueue() → publish-post edge function
│   processor         │  Retry with exponential backoff (max 5)
└─────────┬───────────┘
          │ Updates post_platform_targets
          ▼
┌─────────────────────┐
│   publish-post      │  Decrypt social_connections token
│   (Edge Function)   │  POST to platform API
│                     │  Update status → published/failed
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  record-post-       │  Fetch platform metrics
│  analytics          │  Insert into post_analytics
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ comparePredicted    │  eventCollector.ts
│ VsActual()          │  Returns PredictionComparison[]
└─────────────────────┘  { predicted, actual, delta, accuracy_label }
```

---

## 6. SECURITY MODEL

### 6.1 Authentication

| Layer | Mechanism |
|-------|-----------|
| **JWT Validation** | `getClaims()` in edge functions; `supabase.auth.getSession()` on client |
| **Role Enforcement** | `get_my_role()` SECURITY DEFINER RPC → `user_roles` table |
| **Route Protection** | `ProtectedRoute` component with `requiredRole` prop |
| **Portal Separation** | Marketer portal (`/home/*`) vs Client portal (`/client/*`) |
| **Admin Access** | `has_role(uid, 'admin')` — separate from JWT metadata |

### 6.2 Request Security

| Mechanism | Implementation |
|-----------|---------------|
| **Request Signing** | `signRequest()` adds `request_id` (UUID) + `timestamp` (ISO) to every payload |
| **Replay Prevention** | `ai_requests.request_id` UNIQUE constraint; 5-minute timestamp window |
| **Duplicate Rejection** | PostgreSQL constraint violation (code 23505) → 409 Conflict |

### 6.3 Rate Limiting

| Scope | Limit | Enforcement |
|-------|-------|-------------|
| AI Chat | 30 requests / 5 min per user | `klyc-chat` edge function |
| Campaign Launches | 10 / hour (policy) | `launch-campaign` edge function |
| **Violation Logging** | `activity_events` with `event_type = 'rate_limited'` |

### 6.4 Data Access (RLS)

| Pattern | Tables |
|---------|--------|
| **Own data only** (`auth.uid() = user_id`) | Most tables |
| **Join-based access** (marketer_clients relationship) | `client_profiles`, `google_drive_connections` |
| **Service role only** (INSERT/UPDATE) | `ai_requests`, `post_analytics` |
| **No client modification** | `user_roles` (INSERT/UPDATE/DELETE = false) |
| **Cross-table join RLS** | `post_platform_targets`, `segments` (via parent table owner) |

### 6.5 Token Security

| Mechanism | Details |
|-----------|---------|
| **Encryption** | AES-256-GCM for OAuth tokens in `social_connections` |
| **Versioning** | `ENC:v1:` prefix for key rotation support |
| **AI Isolation** | AI agents NEVER access `social_connections` or raw tokens |
| **Signed URLs** | `getSignedAssetUrl()` generates 5-min expiry URLs for private storage |

### 6.6 AI Security

| Rule | Enforcement |
|------|-------------|
| **No direct client→AI calls** | All AI calls routed through `klyc-chat` edge function |
| **Minimal logging** | Only `{ user_id, client_id, message_count, request_id }` logged |
| **No full prompts stored** | Only `intent` + `token_count_estimate` persisted in `ai_requests` |
| **Token budget** | $1/post budget via `tokenMonitor.ts` with automatic model downgrade |

---

## 7. SYSTEM HEALTH SUMMARY

### ✅ Verified Systems

| System | Status | Notes |
|--------|--------|-------|
| JWT Authentication | ✅ Complete | `getClaims()` in all edge functions |
| Role-based Access Control | ✅ Complete | SECURITY DEFINER `get_my_role()`, `ProtectedRoute` |
| Request Signing & Replay Prevention | ✅ Complete | UUID + timestamp + unique constraint |
| AI Rate Limiting | ✅ Complete | 30/5min with `rate_limited` event logging |
| Client Brain System | ✅ Complete | 7 document types, 400-token budget enforcement |
| Campaign Orchestrator | ✅ Complete | 7-stage pipeline with activity event trail |
| Voice Interview (Onboarding) | ✅ Complete | STT + TTS + transcript persistence |
| Voice Interview (Campaign) | ✅ Complete | Brain-aware questions + preview card + approval flow |
| Campaign Preview Card | ✅ Complete | Pre-approval visualization with metrics |
| Post Queue Management | ✅ Complete | Draft → approval → scheduled → published state machine |
| Publishing Pipeline | ✅ Complete | Retry with exponential backoff, dead letter queue |
| Token Cost Monitoring | ✅ Complete | Pre-flight estimation, $1/post budget, model downgrade |
| Multi-tenant Isolation | ✅ Complete | `client_id` on all core tables, RLS enforcement |
| OAuth Token Encryption | ✅ Complete | AES-256-GCM with `ENC:v1:` versioning |
| Activity Event Audit Trail | ✅ Complete | All pipeline stages emit events |
| Marketer ↔ Client Portal | ✅ Complete | Separate routes, role-based guards |
| CRM Integration Layer | ✅ Complete | HubSpot, Salesforce, Pipedrive + 14 more providers |
| Social Platform Connections | ✅ Complete | 13 platforms with OAuth flows |
| Asset Import Layer | ✅ Complete | Google Drive, Dropbox, Box, OneDrive, Canva, Figma, Notion |

### ⚠️ Partially Implemented

| System | Status | Gap |
|--------|--------|-----|
| Post Analytics Ingestion | ⚠️ Partial | `record-post-analytics` exists but cron scheduling not confirmed active |
| Predicted vs Actual Comparison | ⚠️ Partial | `comparePredictedVsActualPerformance()` implemented but no UI for results |
| Campaign Approval Flow | ⚠️ Partial | Approval records created but client-side approval UI needs validation |
| Auto-scheduling | ⚠️ Partial | `schedulePosts()` implemented; `process-scheduled-campaigns` exists but cron trigger unconfirmed |

### ❌ Missing Components

| Component | Risk Level | Description |
|-----------|------------|-------------|
| Webhook Retry Dashboard | Low | No UI to view failed Zapier/webhook deliveries |
| AI Cost Alerting | Medium | `AiCostMonitor` page exists but no threshold alerts or notifications |
| Token Refresh Automation | Medium | OAuth token refresh exists per-platform but no centralized refresh scheduler |
| E2E Integration Tests | High | No automated test suite for pipeline or publishing |
| Backup/Recovery | Medium | No documented backup strategy for encrypted tokens or brain data |

### 🔴 Performance Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large batch generation | Medium | Token monitor enforces budget; model downgrade available |
| Rate limit fail-open | Low | `checkRateLimit()` fails open on DB error — acceptable for availability |
| Brain loader per-message | Low | Brain context loaded once at interview start, cached in state |
| 1000-row query limit | Medium | Default Supabase limit; affects large post_queue or analytics queries |

### 🔒 Security Risks

| Risk | Severity | Status |
|------|----------|--------|
| Admin role via client storage | Mitigated | Roles stored in `user_roles` with SECURITY DEFINER |
| AI prompt injection | Low | Structured tool-calling constrains output format |
| Token exposure in logs | Mitigated | Only minimal metadata logged; no prompts or tokens |
| Cross-client data leakage | Mitigated | RLS on all tables; `marketer_clients` join for cross-access |

---

*End of KLYC System Architecture Export*
