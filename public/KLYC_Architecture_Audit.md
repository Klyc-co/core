# KLYC Backend Architecture Audit Report
**Date:** 2026-03-04  
**Status:** FUNCTIONAL WITH GAPS  

---

## TABLE OF CONTENTS

1. [User / Organization Structure](#section-1--user--organization-structure)
2. [Client Isolation](#section-2--client-isolation)
3. [Integration Ownership](#section-3--integration-ownership)
4. [Campaign Manifest](#section-4--campaign-manifest)
5. [Delivery Package](#section-5--delivery-package)
6. [Publishing Queue](#section-6--publishing-queue)
7. [Analytics Pipeline](#section-7--analytics-pipeline)
8. [Token Cost Control](#section-8--token-cost-control)
9. [AI Orchestrator](#section-9--ai-orchestrator)
10. [Security](#section-10--security)
11. [Complete Database Schema](#complete-database-schema)
12. [Summary & Recommendations](#summary)

---

## SECTION 1 — USER / ORGANIZATION STRUCTURE

### Current State

| Relationship | Status | Notes |
|---|---|---|
| Organization → Users | ❌ MISSING | No `organizations` table exists. The platform uses a flat `user_id` model. |
| Users → Roles | ✅ EXISTS | `user_roles` table with `app_role` enum (`admin`, `moderator`, `user`). Server-side `has_role()` security definer function. |
| Users → Clients | ✅ EXISTS | `marketer_clients` table links `marketer_id` → `client_id`. |
| Clients → Campaigns | ⚠️ PARTIAL | `campaign_drafts` has `user_id` but no explicit `client_id`. `scheduled_campaigns` also lacks `client_id`. `post_queue` has `client_id`. |
| Campaigns → Posts | ✅ EXISTS | `post_queue.campaign_draft_id` → `campaign_drafts.id` |

### Findings

1. **Agencies managing multiple clients** — ✅ Works via `marketer_clients` (one marketer, many clients).
2. **Clients belong to one org** — ❌ No org concept exists. Clients belong to marketers, not organizations. A client can theoretically be linked to multiple marketers.
3. **Client cross-access prevention** — ✅ RLS on `client_profiles` restricts to `auth.uid() = user_id`. Marketers access via `marketer_clients` join.
4. **Server-side role enforcement** — ⚠️ PARTIAL. `user_roles` table with locked-down RLS (no client-side inserts/updates/deletes). However, `ProtectedRoute.tsx` reads roles from `user_metadata` (client-side JWT metadata), **not** from the `user_roles` table — this is a mismatch.

### Missing Components

- `organizations` table with `org_id` foreign keys
- `client_id` on `campaign_drafts` and `scheduled_campaigns`
- Role enforcement via `user_roles` table instead of JWT metadata in ProtectedRoute

---

## SECTION 2 — CLIENT ISOLATION

| Table | Scoped by `client_id`? | Status |
|---|---|---|
| `campaign_drafts` | ❌ Only `user_id` | **GAP** — no client_id column |
| `post_queue` | ✅ Has `client_id` | OK |
| `post_analytics` | ❌ No `client_id` | **GAP** — linked via `post_queue_id` only |
| `social_connections` | ❌ Only `user_id` | **GAP** — client connections are resolved by client's own `user_id` |
| `client_brain` | ✅ Has `client_id` | OK |
| `scheduled_campaigns` | ❌ Only `user_id` | **GAP** |
| `brand_assets` | ❌ Only `user_id` | Isolation via user ownership |

### RLS Assessment

- All tables have RLS enabled with `auth.uid() = user_id` patterns. ✅
- Cross-client access prevented at the row level. ✅
- However, tables without `client_id` force the app to use the client's `user_id` as a proxy — this works but creates a fragile indirection.

---

## SECTION 3 — INTEGRATION OWNERSHIP

| Platform | Auth Edge Function | Token Storage | Status |
|---|---|---|---|
| LinkedIn | ✅ `linkedin-auth-url`, `linkedin-oauth-callback` | `social_connections` | ✅ |
| Twitter/X | ✅ `twitter-auth-url`, `twitter-oauth-callback` | `social_connections` | ✅ |
| Instagram | ✅ `instagram-auth-url`, `instagram-oauth-callback` | `social_connections` | ✅ |
| TikTok | ✅ `tiktok-auth-url`, `tiktok-oauth-callback` | `social_connections` | ✅ |
| YouTube | ✅ `youtube-auth-url`, `youtube-oauth-callback` | `social_connections` | ✅ |
| Calendly | ❌ **MISSING** | N/A | **GAP** |

### Token Security

- ✅ All OAuth tokens encrypted with AES-256-GCM (`ENC:v1:` prefix).
- ✅ Tokens stored in `social_connections` table with RLS.
- ✅ AI agents in `src/lib/agents/` do **not** import `social_connections` or access tokens — they operate on content data only.

### All Integration Edge Functions

```
Social Media:
- facebook-auth-url / facebook-oauth-callback / facebook-analytics / facebook-fetch-posts
- instagram-auth-url / instagram-oauth-callback / instagram-analytics / instagram-fetch-posts
- twitter-auth-url / twitter-oauth-callback / twitter-analytics / twitter-fetch-posts
- tiktok-auth-url / tiktok-oauth-callback / tiktok-analytics / tiktok-fetch-posts
- youtube-auth-url / youtube-oauth-callback / youtube-analytics / youtube-fetch-posts
- linkedin-auth-url / linkedin-oauth-callback / linkedin-analytics / linkedin-fetch-posts
- twitch-auth-url / twitch-oauth-callback
- snapchat-auth-url / snapchat-oauth-callback
- tumblr-auth-url / tumblr-oauth-callback
- discord-auth-url / discord-oauth-callback
- patreon-auth-url / patreon-oauth-callback
- restream-auth-url / restream-oauth-callback

Cloud Storage:
- google-drive-auth-url / google-drive-oauth-callback / google-drive-list-files
- dropbox-auth-url / dropbox-oauth-callback / dropbox-disconnect / dropbox-list-files / dropbox-import-files / dropbox-get-thumbnail
- onedrive-auth-url / onedrive-oauth-callback
- box-auth-url / box-oauth-callback

Design Tools:
- canva-auth-url / canva-oauth-callback / canva-list-designs
- figma-auth-url / figma-oauth-callback / figma-fetch-templates
- adobe-cc-connect / adobe-cc-list-assets
- miro-auth-url / miro-oauth-callback

Project Management:
- clickup-connect / clickup-list-spaces / clickup-sync / clickup-update-selection
- trello-auth-url / trello-connect / trello-oauth-callback
- notion-auth-url / notion-oauth-callback / notion-fetch-content
- monday-auth-url / monday-oauth-callback
- frameio-auth-url / frameio-oauth-callback
- slack-auth-url / slack-oauth-callback

CRM / Commerce:
- hubspot-crm-auth-url / hubspot-crm-oauth-callback
- salesforce-crm-auth-url / salesforce-crm-oauth-callback
- pipedrive-crm-auth-url / pipedrive-crm-oauth-callback
- zoho-crm-auth-url / zoho-crm-oauth-callback
- dynamics-crm-auth-url / dynamics-crm-oauth-callback
- monday-crm-auth-url / monday-crm-oauth-callback
- shopify-crm-auth-url / shopify-crm-oauth-callback
- stripe-crm-auth-url / stripe-crm-connect / stripe-crm-oauth-callback
- activecampaign-crm-connect
- close-crm-connect
- copper-crm-connect
- freshsales-crm-connect
- agilecrm-connect
- nutshell-crm-connect
- square-crm-connect
- squarespace-crm-connect
- sugarcrm-connect
- crm-sync

Media / Content:
- loom-connect
- riverside-connect
- airtable-connect / airtable-list-bases / airtable-save-mapping / airtable-sync

Analytics:
- google-analytics-auth-url / google-analytics-data / google-analytics-oauth-callback

AI / Generation:
- generate-campaign-idea
- generate-canvas-elements
- generate-captions
- generate-image
- generate-broll
- elevenlabs-tts
- klyc-chat
- regenerate-prompt
- scan-website
- analyze-competitor
- fuse-template

Publishing / Scheduling:
- publish-post
- process-scheduled-campaigns
- launch-campaign

Admin / User:
- admin-list-users
- admin-delete-user
- link-client-to-marketer
- send-client-invite

Reports:
- run-report
- fetch-trends
- resolve-trend-url

Video:
- process-video
- render-video
```

---

## SECTION 4 — CAMPAIGN MANIFEST

### Status: ✅ EXISTS

File: `src/lib/campaigns/campaignManifest.ts`

### CampaignManifest Interface

```typescript
interface CampaignManifest {
  campaign_id: string;
  client_id: string;
  campaign_goal: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  timezone: string;
  cadence: CampaignCadence;
  structures: Record<string, string[]>;
  variation_count: number;
  total_posts: number;
  schedule: ScheduledPost[];
  generated_at: string;
}

interface CampaignCadence {
  posts_per_day: number;
  days_of_week: string[];
  blackout_dates: string[];
}

interface ScheduledPost {
  post_id: string;
  platform: string;
  publish_time: string;
  structure: string;
  variation_index: number;
}
```

| Required Field | Present? |
|---|---|
| `campaign_id` | ✅ |
| `client_id` | ✅ |
| `platforms` | ✅ |
| `schedule` | ✅ (array of `ScheduledPost`) |
| `variation_count` | ✅ |
| `structures` | ✅ (per-platform template IDs) |
| `total_posts` | ✅ |

### Integration with Orchestrator

- ⚠️ The orchestrator (`orchestrator.ts`) does **NOT** create a campaign manifest. It aggregates agent metrics only. The **campaign planner** (`campaignPlanner.ts`) creates the manifest, which is correct but the orchestrator doesn't call the planner — they're decoupled.

---

## SECTION 5 — DELIVERY PACKAGE

### Status: ✅ EXISTS

File: `src/lib/agents/batchGenerator.ts`

### BatchResult Interface

```typescript
interface BatchResult {
  campaign_id: string;
  total_requested: number;
  total_generated: number;
  total_failed: number;
  posts: GeneratedPost[];
  failures: BatchFailure[];
  tokenEstimate: TokenEstimate;
  generated_at: string;
}

interface GeneratedPost {
  post_id: string;
  platform: string;
  publish_time: string;
  content: GeneratedContent;
  variation: number;
  estimated_tokens: number;
  estimated_cost: number;
}

interface GeneratedContent {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  full_text: string;
  structure: string;
  tone: string;
}

interface BatchFailure {
  post_id: string;
  platform: string;
  error: string;
  attempts: number;
}
```

| Required Field | Present? |
|---|---|
| `campaign_id` | ✅ |
| `posts[]` | ✅ (`GeneratedPost[]`) |
| Each post: `post_id` | ✅ |
| Each post: `platform` | ✅ |
| Each post: `scheduled_time` (`publish_time`) | ✅ |
| Each post: `content` (hook, body, cta, full_text) | ✅ |
| Each post: `hashtags` | ✅ (inside `content.hashtags`) |
| Each post: `media` | ❌ **MISSING** — no media URLs in `GeneratedContent` |

### Gaps

- `client_id` is **not** on the `BatchResult` — it's on the manifest only.
- `media` (image/video URLs) not present in delivery package. The `GeneratedContent` type only has text fields.

---

## SECTION 6 — PUBLISHING QUEUE

### Status: ✅ EXISTS

File: `src/lib/publishing/publishQueue.ts`

### PublishJob Interface

```typescript
type PublishStatus = "queued" | "scheduled" | "published" | "failed";

interface PublishJob {
  job_id: string;
  post_id: string;
  platform: string;
  scheduled_time: string;
  content: GeneratedContent;
  status: PublishStatus;
  error?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}
```

### Feature Matrix

| Feature | Status | Details |
|---|---|---|
| Enqueue posts | ✅ | `enqueuePost()` — persists to `post_queue` table and local in-memory map |
| Schedule by datetime | ✅ | `schedulePosts()` — bulk insert with `scheduled_at` timestamp |
| Retry failed posts | ⚠️ PARTIAL | `post_queue` has `retry_count` column, but `processQueue()` doesn't implement retry logic |
| Track publish status | ✅ | Statuses: `queued`, `scheduled`, `published`, `failed` |
| Platform targets | ✅ | `post_platform_targets` tracks per-platform publish status |
| Dead-letter queue | ❌ MISSING | No handling for permanently failed posts |

### Database Tables Used

- `post_queue` — main lifecycle tracking
- `post_platform_targets` — per-platform status (pending/published/failed)
- `post_analytics` — post-publish metrics

---

## SECTION 7 — ANALYTICS PIPELINE

### Status: ✅ EXISTS

File: `src/lib/analytics/eventCollector.ts`

### Flow Verification

| Flow Step | Implemented? | Details |
|---|---|---|
| Platform events → `recordAnalyticsEvent()` | ✅ | Records via `record-post-analytics` edge function (service-role only) |
| `updateCampaignMetrics()` | ✅ | Aggregates from `post_analytics` with batched queries (batch size 50) |
| `comparePredictedVsActualPerformance()` | ✅ | Compares Social Agent predictions vs actuals with 15% variance threshold |

### Interfaces

```typescript
interface AnalyticsEvent {
  post_id: string;
  platform: string;
  impressions: number;
  clicks: number;
  engagement_rate: number;
  timestamp: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
}

interface CampaignMetricsSummary {
  campaign_id: string;
  total_posts: number;
  total_impressions: number;
  total_clicks: number;
  avg_engagement_rate: number;
  platform_breakdown: Record<string, PlatformMetrics>;
  updated_at: string;
}

interface PredictionComparison {
  post_id: string;
  platform: string;
  predicted_engagement: number;
  actual_engagement: number;
  delta: number;
  delta_percent: number;
  accuracy_label: "accurate" | "over" | "under";
}
```

### Stored Fields in `post_analytics`

| Field | Present? | Type |
|---|---|---|
| `impressions` | ✅ | integer (nullable) |
| `clicks` | ✅ | integer (nullable) |
| `engagement_rate` | ✅ | numeric (nullable) |
| `fetched_at` (timestamp) | ✅ | timestamp with time zone |
| `platform` | ✅ | text |
| `views` | ✅ | integer (nullable) |
| `likes` | ✅ | integer (nullable) |
| `comments` | ✅ | integer (nullable) |
| `shares` | ✅ | integer (nullable) |
| `saves` | ✅ | integer (nullable) |
| `reach` | ✅ | integer (nullable) |
| `raw_metrics` | ✅ | jsonb (nullable) |

---

## SECTION 8 — TOKEN COST CONTROL

### Status: ✅ EXISTS

File: `src/lib/agents/tokenMonitor.ts`

### Model Pricing Table

| Model | Input/1K tokens | Output/1K tokens |
|---|---|---|
| `google/gemini-3-flash-preview` | $0.00015 | $0.0006 |
| `google/gemini-2.5-flash` | $0.00015 | $0.0006 |
| `google/gemini-2.5-flash-lite` | $0.0001 | $0.0004 |
| `google/gemini-2.5-pro` | $0.00125 | $0.005 |
| `google/gemini-3-pro-preview` | $0.00125 | $0.005 |
| `openai/gpt-5` | $0.005 | $0.015 |
| `openai/gpt-5-mini` | $0.0004 | $0.0016 |
| `openai/gpt-5-nano` | $0.0001 | $0.0004 |
| `openai/gpt-5.2` | $0.005 | $0.015 |

### Agent Token Profiles

| Agent | Avg Input Tokens | Avg Output Tokens |
|---|---|---|
| Research | 2000 | 1500 |
| Social | 1500 | 800 |
| Image | 500 | 300 |
| Editor | 800 | 400 |
| Analytics | 1200 | 600 |

### Integration Points

| Integration Point | Status | Details |
|---|---|---|
| Campaign planner | ✅ | `campaignPlanner.ts` calls `estimateTokenCost()` and `enforceBudget()` |
| Batch generator | ✅ | `batchGenerator.ts` calls `estimateTokenCost()` |
| Agent execution | ⚠️ PARTIAL | Metrics agents don't use token monitor — only planner/batch do |
| $1/post enforcement | ✅ | Default `maxCostPerPost: 1.0` with automatic scale-back |

### Budget Enforcement Behavior

When budget is exceeded, the system automatically:
1. Reduces variation counts
2. Disables the Research Agent
3. Downgrades to cost-effective models (Gemini Flash Lite or GPT-5 Nano)

---

## SECTION 9 — AI ORCHESTRATOR

### Status: ⚠️ INCOMPLETE

File: `src/lib/agents/orchestrator.ts`

### Current Orchestrator Responsibilities

| Step | Status | Details |
|---|---|---|
| Load client brain | ❌ NOT DONE | Orchestrator doesn't call `loadClientBrain()` |
| Load campaign manifest | ❌ NOT DONE | Orchestrator doesn't create/load manifests |
| Call agents | ⚠️ PARTIAL | Only calls metric calculators, not generation agents |
| Collect delivery package | ❌ NOT DONE | No integration with `batchGenerator` |
| Send to scheduler | ❌ NOT DONE | No integration with `publishQueue` |

### What the Orchestrator Actually Does

The orchestrator currently:
1. `aggregateAgentMetrics()` — Runs metric calculators for research, social, image, editor, analytics agents and produces a unified report.
2. `queryAnalytics()` — Executes parameterized queries against `post_analytics` for engagement_rate, CTR, saves, shares, reach.
3. `generateDashboardSnapshot()` — Creates a 30-day dashboard snapshot with platform breakdowns and tag analysis.

### What the Orchestrator Should Do (Full Pipeline)

```
1. loadClientBrain(clientId)           → Get brand/voice/strategy context
2. runCampaignPlanner(plannerInput)    → Generate manifest + enforce budget
3. generateBatchContent(manifest)      → Create all posts from manifest
4. schedulePosts(batchResult.posts)    → Enqueue to publishing queue
5. processQueue()                      → Publish when scheduled_time arrives
6. recordAnalyticsEvent()              → Track performance post-publish
7. comparePredictedVsActual()          → Evaluate prediction accuracy
```

### Agent Files

| Agent | File | Purpose |
|---|---|---|
| Research | `src/lib/agents/researchAgent.ts` | Market research metrics |
| Social | `src/lib/agents/socialAgent.ts` | Social media engagement metrics |
| Image | `src/lib/agents/imageAgent.ts` | Image quality/compliance metrics |
| Editor | `src/lib/agents/editorAgent.ts` | Content editing quality metrics |
| Analytics | `src/lib/agents/analyticsAgent.ts` | Performance analytics metrics |
| Campaign Planner | `src/lib/agents/campaignPlanner.ts` | Campaign planning & manifest creation |
| Batch Generator | `src/lib/agents/batchGenerator.ts` | Bulk content generation |
| Token Monitor | `src/lib/agents/tokenMonitor.ts` | Cost estimation & budget enforcement |
| Platform Templates | `src/lib/agents/platformTemplates.ts` | Platform-specific content structures |

---

## SECTION 10 — SECURITY

### Security Matrix

| Check | Status | Details |
|---|---|---|
| AI agents cannot access tokens | ✅ | No imports of `social_connections` in agent code |
| Clients can't access other clients | ✅ | RLS enforced on all tables via `auth.uid() = user_id` |
| Platform APIs require auth | ✅ | All edge functions verify JWT via `supabase.auth.getUser()` |
| Edge functions enforce RLS | ✅ | Service-role used only for admin/scheduled tasks |
| `post_analytics` write-protected | ✅ | INSERT/UPDATE restricted to service role only |
| Token encryption | ✅ | AES-256-GCM with `ENC:v1:` prefix versioning |
| PKCE OAuth state management | ✅ | `oauth_pkce_states` with 15-minute expiry |
| Admin actions secured | ✅ | `admin-list-users` verifies JWT + checks `user_roles` |
| CRON jobs authenticated | ✅ | `CRON_SECRET` validation for scheduled tasks |

### Security Gaps

| # | Risk | Severity | Details |
|---|---|---|---|
| 1 | ProtectedRoute uses JWT metadata instead of `user_roles` table | **HIGH** | Roles stored in `user_metadata` can be set during signup, allowing privilege escalation |
| 2 | No rate limiting on campaign generation or publishing | MEDIUM | Could allow resource exhaustion attacks |
| 3 | `zapier_automation_results` orphaned table | LOW | May lack proper RLS — remnant from removed Zapier integration |
| 4 | `marketer_clients` allows multi-marketer clients | LOW | No unique constraint on `client_id` — a client can be linked to multiple marketers |

### RLS Policy Summary by Table

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `airtable_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `airtable_synced_records` | ✅ own | ✅ own | ✅ own | ✅ own |
| `airtable_table_mappings` | ✅ own | ✅ own | ✅ own | ✅ own |
| `brand_assets` | ✅ own | ✅ own | ✅ own | ✅ own |
| `brand_imports` | ✅ own | ✅ own | ✅ own | ✅ own |
| `campaign_approvals` | ✅ marketer+client | ✅ marketer | ✅ marketer+client | ✅ marketer |
| `campaign_drafts` | ✅ own | ✅ own | ✅ own | ✅ own |
| `clickup_attachments` | ✅ own | ✅ own | ✅ own | ✅ own |
| `clickup_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `clickup_lists` | ✅ own | ✅ own | ✅ own | ✅ own |
| `clickup_tasks` | ✅ own | ✅ own | ✅ own | ✅ own |
| `client_brain` | ✅ own | ✅ own | ✅ own | ✅ own |
| `client_profiles` | ✅ own+marketer | ✅ own | ✅ own | ✅ own |
| `competitor_analyses` | ✅ own | ✅ own | ✅ own | ✅ own |
| `crm_companies` | ✅ own | ✅ own | ✅ own | ✅ own |
| `crm_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `crm_contacts` | ✅ own | ✅ own | ✅ own | ✅ own |
| `crm_deals` | ✅ own | ✅ own | ✅ own | ✅ own |
| `crm_orders` | ✅ own | ✅ own | ✅ own | ✅ own |
| `crm_sync_logs` | — | — | — | — |
| `dropbox_assets` | ✅ own | ✅ own | ✅ own | ✅ own |
| `dropbox_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `google_drive_assets` | ✅ own | ✅ own | ✅ own | ✅ own |
| `google_drive_connections` | ✅ own+marketer | ✅ own | ✅ own | ✅ own |
| `loom_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `marketer_clients` | ✅ marketer+client | ✅ marketer | ✅ marketer | ✅ marketer |
| `messages` | ✅ sender+receiver | ✅ sender | ✅ receiver | ❌ none |
| `oauth_pkce_states` | ✅ own | ✅ own | ❌ none | ✅ own |
| `post_analytics` | ✅ via post_queue | ❌ service only | ❌ service only | ❌ service only |
| `post_platform_targets` | ✅ via post_queue | ✅ via post_queue | ✅ via post_queue | ✅ via post_queue |
| `post_queue` | ✅ own+client | ✅ own | ✅ own+client | ✅ own |
| `product_assets` | ✅ own | ✅ own | ✅ own | ✅ own |
| `product_lines` | ✅ own | ✅ own | ✅ own | ✅ own |
| `products` | ✅ own | ✅ own | ✅ own | ✅ own |
| `projects` | ✅ own | ✅ own | ✅ own | ✅ own |
| `report_results` | ✅ own | ✅ own | ❌ none | ✅ own |
| `riverside_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `scheduled_campaigns` | ✅ own | ✅ own | ✅ own | ✅ own |
| `scheduled_reports` | ✅ own | ✅ own | ✅ own | ✅ own |
| `segments` | ✅ via project | ✅ via project | ✅ via project | ✅ via project |
| `social_connections` | ✅ own | ✅ own | ✅ own | ✅ own |
| `social_trends` | ✅ own | ✅ own | ❌ none | ✅ own |
| `user_roles` | ✅ admin only | ❌ blocked | ❌ blocked | ❌ blocked |
| `user_settings` | ✅ own | ✅ own | ✅ own | ✅ own |

---

## COMPLETE DATABASE SCHEMA

### Table: `airtable_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `api_token` | text | NO | — |
| `display_name` | text | YES | `'Airtable'` |
| `connection_status` | text | YES | `'connected'` |
| `last_sync_at` | timestamptz | YES | — |
| `sync_frequency` | text | YES | `'manual'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `airtable_synced_records`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `mapping_id` | uuid | NO | — (FK → `airtable_table_mappings.id`) |
| `airtable_base_id` | text | NO | — |
| `airtable_table_id` | text | NO | — |
| `airtable_record_id` | text | NO | — |
| `table_type` | text | NO | — |
| `mapped_data` | jsonb | NO | `'{}'` |
| `raw_record` | jsonb | YES | — |
| `synced_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `airtable_table_mappings`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `airtable_connections.id`) |
| `airtable_base_id` | text | NO | — |
| `airtable_base_name` | text | YES | — |
| `airtable_table_id` | text | NO | — |
| `airtable_table_name` | text | YES | — |
| `table_type` | text | NO | `'other'` |
| `column_mappings` | jsonb | NO | `'{}'` |
| `is_synced` | boolean | YES | `true` |
| `last_sync_at` | timestamptz | YES | — |
| `synced_record_count` | integer | YES | `0` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `brand_assets`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `brand_import_id` | uuid | YES | — (FK → `brand_imports.id`) |
| `asset_type` | text | NO | — |
| `name` | text | YES | — |
| `value` | text | NO | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `brand_imports`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `website_url` | text | NO | — |
| `status` | text | NO | `'pending'` |
| `metadata` | jsonb | YES | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `campaign_approvals`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `campaign_draft_id` | uuid | YES | — (FK → `campaign_drafts.id`) |
| `scheduled_campaign_id` | uuid | YES | — (FK → `scheduled_campaigns.id`) |
| `marketer_id` | uuid | NO | — |
| `client_id` | uuid | NO | — |
| `status` | text | NO | `'pending'` |
| `notes` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `campaign_drafts`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `content_type` | text | YES | — |
| `prompt` | text | YES | — |
| `campaign_idea` | text | YES | — |
| `post_caption` | text | YES | — |
| `image_prompt` | text | YES | — |
| `video_script` | text | YES | — |
| `article_outline` | text | YES | — |
| `scene_prompts` | text | YES | — |
| `tags` | text[] | YES | — |
| `target_audience` | text | YES | — |
| `target_audience_description` | text | YES | — |
| `campaign_goals` | text | YES | — |
| `campaign_objective` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `clickup_attachments`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `clickup_connections.id`) |
| `clickup_task_id` | text | NO | — |
| `task_title` | text | YES | — |
| `list_name` | text | YES | — |
| `file_name` | text | NO | — |
| `file_url` | text | NO | — |
| `mime_type` | text | YES | — |
| `size` | integer | YES | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `clickup_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `api_token` | text | NO | — |
| `team_id` | text | YES | — |
| `team_name` | text | YES | — |
| `user_email` | text | YES | — |
| `connection_status` | text | YES | `'connected'` |
| `last_sync_at` | timestamptz | YES | — |
| `sync_frequency` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `clickup_lists`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `clickup_connections.id`) |
| `clickup_list_id` | text | NO | — |
| `name` | text | NO | — |
| `space_name` | text | YES | — |
| `folder_name` | text | YES | — |
| `is_marketing_suggested` | boolean | YES | `false` |
| `is_selected_for_sync` | boolean | YES | `false` |
| `task_count` | integer | YES | `0` |
| `last_sync_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `clickup_tasks`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `clickup_connections.id`) |
| `clickup_task_id` | text | NO | — |
| `clickup_list_id` | text | NO | — |
| `list_name` | text | YES | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `status` | text | YES | — |
| `priority` | text | YES | — |
| `due_date` | timestamptz | YES | — |
| `start_date` | timestamptz | YES | — |
| `date_created` | timestamptz | YES | — |
| `assignees` | jsonb | YES | `'[]'` |
| `tags` | jsonb | YES | `'[]'` |
| `raw` | jsonb | YES | — |
| `url` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `client_brain`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `client_id` | text | NO | — |
| `document_type` | text | NO | — |
| `data` | jsonb | NO | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `client_profiles`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `business_name` | text | YES | — |
| `website` | text | YES | — |
| `description` | text | YES | — |
| `industry` | text | YES | — |
| `target_audience` | text | YES | — |
| `value_proposition` | text | YES | — |
| `logo_url` | text | YES | — |
| `brand_colors` | text[] | YES | — |
| `product_category` | text | YES | — |
| `geography_markets` | text | YES | — |
| `marketing_goals` | text | YES | — |
| `main_competitors` | text | YES | — |
| `audience_data` | jsonb | YES | `'{}'` |
| `value_data` | jsonb | YES | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `competitor_analyses`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `competitor_name` | text | NO | — |
| `competitor_url` | text | YES | — |
| `company_description` | text | YES | — |
| `target_audience` | text | YES | — |
| `value_proposition` | text | YES | — |
| `key_products` | text | YES | — |
| `pricing_strategy` | text | YES | — |
| `marketing_channels` | text | YES | — |
| `strengths` | text | YES | — |
| `weaknesses` | text | YES | — |
| `opportunities` | text | YES | — |
| `threats` | text | YES | — |
| `raw_data` | jsonb | YES | — |
| `analyzed_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |

### Table: `crm_companies`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `crm_connections.id`) |
| `external_id` | text | NO | — |
| `name` | text | NO | — |
| `domain` | text | YES | — |
| `industry` | text | YES | — |
| `size` | text | YES | — |
| `contact_count` | integer | YES | `0` |
| `raw_data` | jsonb | YES | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `crm_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `provider` | text | NO | — |
| `display_name` | text | NO | — |
| `access_token` | text | YES | — |
| `refresh_token` | text | YES | — |
| `token_expires_at` | timestamptz | YES | — |
| `status` | text | NO | `'active'` |
| `sync_frequency_minutes` | integer | NO | `60` |
| `last_sync_at` | timestamptz | YES | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `crm_contacts`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `crm_connections.id`) |
| `external_id` | text | NO | — |
| `email` | text | YES | — |
| `first_name` | text | YES | — |
| `last_name` | text | YES | — |
| `phone` | text | YES | — |
| `company_name` | text | YES | — |
| `lifecycle_stage` | text | YES | — |
| `source` | text | NO | — |
| `tags` | jsonb | YES | `'[]'` |
| `raw_data` | jsonb | YES | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `crm_deals`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `crm_connections.id`) |
| `external_id` | text | NO | — |
| `name` | text | NO | — |
| `value` | numeric | YES | — |
| `currency` | text | YES | — |
| `stage` | text | YES | — |
| `status` | text | YES | — |
| `close_date` | timestamptz | YES | — |
| `owner` | text | YES | — |
| `associated_contact_external_id` | text | YES | — |
| `raw_data` | jsonb | YES | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `crm_orders`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `connection_id` | uuid | NO | — (FK → `crm_connections.id`) |
| `external_id` | text | NO | — |
| `order_number` | text | NO | — |
| `customer_email` | text | YES | — |
| `customer_name` | text | YES | — |
| `total_amount` | numeric | YES | — |
| `currency` | text | YES | `'USD'` |
| `status` | text | YES | — |
| `items` | jsonb | YES | `'[]'` |
| `order_date` | timestamptz | YES | — |
| `associated_contact_external_id` | text | YES | — |
| `raw_data` | jsonb | YES | `'{}'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `crm_sync_logs`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `connection_id` | uuid | NO | — (FK → `crm_connections.id`) |
| `status` | text | NO | `'pending'` |
| `started_at` | timestamptz | NO | — |
| `finished_at` | timestamptz | YES | — |
| `summary` | text | YES | — |
| `error_message` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `dropbox_assets`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `dropbox_connection_id` | uuid | YES | — (FK → `dropbox_connections.id`) |
| `dropbox_file_id` | text | NO | — |
| `dropbox_path` | text | NO | — |
| `asset_name` | text | NO | — |
| `asset_type` | text | YES | — |
| `mime_type` | text | YES | — |
| `file_size` | bigint | YES | — |
| `thumbnail_url` | text | YES | — |
| `local_storage_path` | text | YES | — |
| `parent_folder_path` | text | YES | — |
| `is_folder` | boolean | YES | `false` |
| `tags` | text[] | YES | `'{}'` |
| `metadata` | jsonb | YES | `'{}'` |
| `dropbox_modified_at` | timestamptz | YES | — |
| `dropbox_created_at` | timestamptz | YES | — |
| `synced_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `dropbox_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `access_token` | text | NO | — |
| `refresh_token` | text | YES | — |
| `account_id` | text | YES | — |
| `account_email` | text | YES | — |
| `account_display_name` | text | YES | — |
| `root_folder_path` | text | YES | `'/'` |
| `auto_sync_folder_path` | text | YES | — |
| `connection_status` | text | YES | `'connected'` |
| `auto_sync_enabled` | boolean | YES | `false` |
| `token_expires_at` | timestamptz | YES | — |
| `last_sync_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `google_drive_assets`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `drive_connection_id` | uuid | YES | — (FK → `google_drive_connections.id`) |
| `drive_file_id` | text | YES | — |
| `drive_url` | text | YES | — |
| `asset_name` | text | NO | — |
| `asset_type` | text | YES | — |
| `description` | text | YES | — |
| `content_extracted` | text | YES | — |
| `is_priority` | boolean | YES | — |
| `tags` | text[] | YES | — |
| `metadata` | jsonb | YES | — |
| `synced_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |

### Table: `google_drive_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `folder_id` | text | NO | — |
| `folder_url` | text | YES | — |
| `assets_sheet_id` | text | YES | — |
| `assets_sheet_url` | text | YES | — |
| `brand_guidelines_sheet_id` | text | YES | — |
| `brand_guidelines_sheet_url` | text | YES | — |
| `zapier_webhook_url` | text | YES | — |
| `connection_status` | text | NO | `'pending'` |
| `metadata` | jsonb | YES | `'{}'` |
| `last_sync_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `loom_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `api_token` | text | NO | — |
| `display_name` | text | YES | `'Loom'` |
| `connection_status` | text | YES | `'connected'` |
| `last_sync_at` | timestamptz | YES | — |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### Table: `marketer_clients`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `marketer_id` | uuid | NO | — |
| `client_id` | uuid | NO | — |
| `client_name` | text | NO | — |
| `client_email` | text | YES | — |
| `status` | text | NO | `'active'` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `messages`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `sender_id` | uuid | NO | — |
| `receiver_id` | uuid | NO | — |
| `marketer_client_id` | uuid | YES | — (FK → `marketer_clients.id`) |
| `content` | text | NO | — |
| `is_read` | boolean | NO | `false` |
| `created_at` | timestamptz | NO | `now()` |

### Table: `oauth_pkce_states`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `provider` | text | NO | — |
| `state` | text | NO | — |
| `display_name` | text | NO | — |
| `code_verifier` | text | NO | — |
| `created_at` | timestamptz | NO | `now()` |
| `expires_at` | timestamptz | NO | `now() + 15 min` |

### Table: `post_analytics`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `post_queue_id` | uuid | NO | — (FK → `post_queue.id`) |
| `platform` | text | NO | — |
| `platform_post_id` | text | YES | — |
| `views` | integer | YES | — |
| `likes` | integer | YES | — |
| `comments` | integer | YES | — |
| `shares` | integer | YES | — |
| `saves` | integer | YES | — |
| `clicks` | integer | YES | — |
| `impressions` | integer | YES | — |
| `reach` | integer | YES | — |
| `engagement_rate` | numeric | YES | — |
| `raw_metrics` | jsonb | YES | — |
| `fetched_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |

### Table: `post_platform_targets`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `post_queue_id` | uuid | NO | — (FK → `post_queue.id`) |
| `platform` | text | NO | — |
| `platform_post_id` | text | YES | — |
| `status` | text | NO | `'pending'` |
| `error_message` | text | YES | — |
| `published_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `post_queue`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `client_id` | uuid | YES | — |
| `campaign_draft_id` | uuid | YES | — (FK → `campaign_drafts.id`) |
| `content_type` | text | NO | `'text'` |
| `post_text` | text | YES | — |
| `media_urls` | text[] | YES | `'{}'` |
| `video_url` | text | YES | — |
| `image_url` | text | YES | — |
| `status` | text | NO | `'draft'` |
| `scheduled_at` | timestamptz | YES | — |
| `published_at` | timestamptz | YES | — |
| `approved_by` | uuid | YES | — |
| `approved_at` | timestamptz | YES | — |
| `approval_notes` | text | YES | — |
| `error_message` | text | YES | — |
| `retry_count` | integer | YES | `0` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `product_assets`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `product_id` | uuid | NO | — (FK → `products.id`) |
| `user_id` | uuid | NO | — |
| `asset_name` | text | NO | — |
| `asset_url` | text | NO | — |
| `asset_type` | text | YES | `'image'` |
| `source` | text | YES | `'upload'` |
| `thumbnail_url` | text | YES | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `product_lines`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `products`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `name` | text | NO | — |
| `product_type` | text | NO | — |
| `short_description` | text | YES | — |
| `target_audience` | text | YES | — |
| `value_propositions` | text | YES | — |
| `product_line_id` | uuid | YES | — (FK → `product_lines.id`) |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `projects`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `owner_id` | uuid | NO | — |
| `title` | text | NO | `''` |
| `status` | text | NO | `'draft'` |
| `original_video_url` | text | YES | — |
| `final_video_url` | text | YES | — |
| `duration_seconds` | numeric | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `report_results`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `scheduled_report_id` | uuid | YES | — (FK → `scheduled_reports.id`) |
| `search_term` | text | NO | — |
| `sentiment` | text | YES | `'Mixed'` |
| `summary` | text | YES | — |
| `mentions` | integer | YES | `0` |
| `sources` | integer | YES | `0` |
| `positive_percent` | integer | YES | `0` |
| `neutral_percent` | integer | YES | `0` |
| `negative_percent` | integer | YES | `0` |
| `raw_results` | jsonb | YES | — |
| `generated_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |

### Table: `riverside_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `api_token` | text | NO | — |
| `display_name` | text | YES | `'Riverside'` |
| `connection_status` | text | YES | `'connected'` |
| `last_sync_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `scheduled_campaigns`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `campaign_name` | text | NO | — |
| `platforms` | text[] | NO | — |
| `scheduled_date` | text | NO | — |
| `scheduled_time` | text | NO | — |
| `status` | text | NO | `'scheduled'` |
| `post_caption` | text | YES | — |
| `image_url` | text | YES | — |
| `video_url` | text | YES | — |
| `media_urls` | text[] | YES | — |
| `product` | text | YES | — |
| `tags` | text[] | YES | — |
| `links` | text[] | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `scheduled_reports`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `search_term` | text | NO | — |
| `schedule_frequency` | text | NO | `'daily'` |
| `schedule_time` | time | NO | — |
| `is_active` | boolean | NO | `true` |
| `last_run_at` | timestamptz | YES | — |
| `next_run_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `segments`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `project_id` | uuid | NO | — (FK → `projects.id`) |
| `index` | integer | NO | — |
| `start_seconds` | numeric | NO | — |
| `end_seconds` | numeric | NO | — |
| `transcript_snippet` | text | YES | — |
| `visual_prompt` | text | YES | — |
| `use_broll` | boolean | NO | `false` |
| `broll_status` | text | NO | `'not_generated'` |
| `broll_video_url` | text | YES | — |
| `words_json` | jsonb | YES | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `social_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `platform` | text | NO | — |
| `access_token` | text | NO | — |
| `refresh_token` | text | YES | — |
| `platform_user_id` | text | YES | — |
| `platform_username` | text | YES | — |
| `scopes` | text[] | YES | — |
| `token_expires_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `social_trends`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `platform` | text | NO | — |
| `trend_name` | text | NO | — |
| `trend_category` | text | YES | — |
| `trend_volume` | text | YES | — |
| `trend_url` | text | YES | — |
| `trend_rank` | integer | YES | — |
| `scraped_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |

### Table: `trello_connections`
| Column | Type | Nullable | Default |
|---|---|---|---|
| (schema details not fully enumerated — exists in database) | | | |

### Table: `user_roles`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `role` | app_role (enum: admin, moderator, user) | NO | — |
| `created_at` | timestamptz | NO | `now()` |

### Table: `user_settings`
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `zapier_webhook_url` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### Table: `zapier_automation_results`
| Column | Type | Nullable | Default |
|---|---|---|---|
| (ORPHANED — Zapier integration removed. Recommended for deletion.) | | | |

---

## Database Functions

### `has_role(_user_id uuid, _role app_role) → boolean`
- **Type:** SECURITY DEFINER
- **Purpose:** Check if a user has a specific role without triggering recursive RLS
- **Used by:** RLS policies on `user_roles`

### `update_updated_at_column() → trigger`
- **Type:** SECURITY DEFINER
- **Purpose:** Automatically sets `updated_at = now()` on row updates
- **Note:** Trigger function exists but no triggers are currently attached

---

## Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `videos` | ❌ Private | Video project storage with signed URL access |
| `brand-assets` | ✅ Public | Brand media library (logos, images, etc.) |

---

## SUMMARY

### Architecture Status: `FUNCTIONAL WITH GAPS`

The core infrastructure supports campaign generation, publishing, and analytics. However, the orchestrator is incomplete and several tables lack proper client scoping.

### Missing Components (Priority Order)

| # | Component | Impact | Effort |
|---|---|---|---|
| 1 | `organizations` table | No multi-tenant agency support | HIGH |
| 2 | `client_id` on `campaign_drafts` | Campaigns can't be scoped to clients | MEDIUM |
| 3 | `client_id` on `scheduled_campaigns` | Scheduled campaigns can't be isolated | MEDIUM |
| 4 | Orchestrator end-to-end workflow | No unified campaign execution pipeline | HIGH |
| 5 | Media in delivery package | Generated posts have no image/video refs | MEDIUM |
| 6 | Publishing retry logic | Failed posts are permanently abandoned | LOW |
| 7 | Calendly integration | Not implemented | LOW |
| 8 | Cleanup `zapier_automation_results` | Dead table from removed feature | LOW |
| 9 | `update_updated_at` triggers not attached | `updated_at` columns not auto-updating | LOW |

### Security Risks

| # | Risk | Severity |
|---|---|---|
| 1 | ProtectedRoute reads role from `user_metadata` instead of `user_roles` table — roles can be set during signup | **HIGH** |
| 2 | No rate limiting on campaign generation or publishing | MEDIUM |
| 3 | `zapier_automation_results` orphaned table may lack proper RLS | LOW |
| 4 | `marketer_clients` allows a client to be linked to multiple marketers — no uniqueness on `client_id` | LOW |

### Recommended Fixes

1. **Create `organizations` table** → add `org_id` FK to `marketer_clients`, `campaign_drafts`, `scheduled_campaigns`
2. **Add `client_id` to `campaign_drafts` and `scheduled_campaigns`** → enforce client scoping with RLS
3. **Rewrite `ProtectedRoute`** to query `user_roles` table via a security-definer RPC instead of JWT metadata
4. **Extend orchestrator** to: load client brain → create manifest → call planner → batch generate → enqueue to publisher
5. **Add `media_urls` to `GeneratedContent`** type for image/video references
6. **Implement retry logic** in `processQueue()` with exponential backoff and max attempts
7. **Drop `zapier_automation_results`** table
8. **Add Calendly integration** edge functions
9. **Attach `update_updated_at_column` trigger** to all tables with `updated_at` columns

---

*Report generated: 2026-03-04*  
*Total tables: 45*  
*Total edge functions: 120+*  
*Total agent modules: 9*
