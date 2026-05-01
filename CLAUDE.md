# KLYC — Shared Team Knowledge Base
> This file is read automatically by Claude in every Cowork session. Keep it updated. It is the single source of truth for the team.

---

## What KLYC Is
KLYC is a Click AI social media platform. It takes a brand brief and generates complete, platform-optimized content campaigns using a multi-submind AI pipeline. Core thesis: the KNP protocol compresses AI token usage 95.2x while producing 10x the output volume.

---

## Team
| Person | Email | GitHub | Role | Hours |
|---|---|---|---|---|
| Kitchens | kitchens@klyc.ai | kitchens-klyc | Founder, architect, all decisions | 36h/wk |
| Ethan K | — | — | Algorithms, data science, backend | 40h/wk |
| Ethan W | — | ethanw37 | Platform integration, UI/UX | 20h/wk |
| Rohil | — | — | Image quality, visual standards | 12h/wk |

Kitchens makes all architecture decisions. When in doubt, ask Kitchens.

---

## Infrastructure

### Frontend
- **Repo:** `github.com/Klyc-co/core` (main branch)
- **Framework:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Deployed to:** Vercel → `klyc.ai`
- **Auto-deploy:** Every push to `main` triggers `.github/workflows/deploy.yml` → Vercel production

### Supabase — KLYC (Primary)
- **Project ID:** `wkqiielsazzbxziqmgdb`
- **URL:** `https://wkqiielsazzbxziqmgdb.supabase.co`
- **Use:** All app data, auth, edge functions for klyc.ai
- **Anon key env var:** `VITE_SUPABASE_PUBLISHABLE_KEY` (set in Vercel)

### Supabase — Empyrean (KNP Clone)
- **Project ID:** `qfcvctkmgukxuugvbuxi`
- **URL:** `https://qfcvctkmgukxuugvbuxi.supabase.co`
- **Use:** Separate KNP testing/benchmarking environment — intentionally kept separate
- **Rule:** ALL edge function fixes deploy to BOTH KLYC and Empyrean until Empyrean cutover

### Vercel
- **Team:** Klyc (Pro Trial)
- **Project:** `core`
- **Domain:** `klyc.ai` + `www.klyc.ai`
- **Deploy command:** `npm run build` / output: `dist`

---

## Deployment Workflow
```
Claude edits code → pushes to Klyc-co/core main → GitHub Action triggers → Vercel builds → klyc.ai live (~60s)
```
No manual steps needed. Claude has direct GitHub push access.

---

## KNP Protocol (KLYC Neural Protocol)

### What It Is
KNP is KLYC's proprietary AI compression system. Instead of sending full prompts to every AI call, it compresses inputs into dense token packets that expand into full campaigns on the other end.

### Proven Metrics (Three-Test Suite, Apr 21 2026 — live with credit receipts)
| Metric | Value |
|---|---|
| Yield Efficiency Gain | **95.2x** |
| Input Token Reduction | 89.5% (476 → 50 tokens) |
| Output Multiplier | 10x (1 post → 10 posts) |
| Image Compression | 10x (1 credit → 10 images) |
| Image Cost Savings | 90% ($0.067 → $0.0067/img) |
| Run Cost Savings | 44% |
| Cost per Final Pair | $0.0018 |
| Latency (equal volume) | 9.1x faster |

### Image Generation Paths
- **Composite path:** 1 NB credit → 1 image → split into 2×2 grid → 4 tiles. Cost: $0.015/tile. USE THIS.
- **Individual path:** 4 NB credits → 4 separate images. Cost: $0.04/img. Use for benchmarking only.
- **RAW path:** Direct API call, no compression. Use for baseline comparison only.
- **NB outage window:** NB fails daily ~3–7 AM UTC (China peak hours). Test outside this window.
- **NB native multi-image:** DEFINITIVE — NB always returns 1 URL/credit regardless of params. Composite path is the correct 4x solution.

### Token Economics
- 1 token = 1 image = $0.067
- Composite = 10x compression → 1 token → 10 images → $0.0067/img

---

## Active Edge Functions

### KLYC Supabase (`wkqiielsazzbxziqmgdb`)
| Function | Version | Purpose |
|---|---|---|
| `klyc-chat` | v50 | Main chat interface |
| `normalize-input` | v12 | Input normalization/KNP compression |
| `klyc-orchestrator` | v14 | Routes requests to subminds |
| `campaign-pipeline` | v19 | Full campaign generation |
| `generate-image` | v79 | Image generation (composite routing, σo KNP format) |
| `generate-image-composite` | v28 | Composite image splitting (mode: composite/individual/raw) |
| `knowledge-search` | v15 | RAG search (threshold: 0.35) |
| `knowledge-embed` | v11 | Embeds content into klyc_knowledge |
| `initialize-rag` | v15 | RAG initialization |
| `social` | v26 | Social submind |
| `creative` | v22 | Creative submind |
| `approval` | v21 | Approval submind |
| `viral` | v21 | Viral submind |
| `platform` | v20 | Platform submind |
| `strategy-analysis` | v11 | Strategy submind |
| `raw-benchmark` | v10 | Raw benchmark testing |
| `ai-metrics` | v10 | AI metrics tracking |
| `research` | v21 | Research submind |
| `product` | v21 | Product submind |
| `narrative` | v21 | Narrative submind |
| `image` | v21 | Image submind |
| `analytics` | v18 | Analytics submind |

### Empyrean Supabase (`qfcvctkmgukxuugvbuxi`)
All functions deployed as v1 (synced Apr 21 2026). Empyrean lags KLYC on version numbers — check KLYC first for latest.

---

## RAG / Knowledge System
- 12/12 knowledge chunks embedded in `klyc_knowledge` table
- `knowledge-search` fires on every `campaign-pipeline` call
- RAG similarity threshold: 0.35

---

## Key Database Tables (KLYC Supabase)
- `social_connections` — OAuth connections to LinkedIn, Instagram, TikTok, etc.
- `post_queue` — queued posts waiting to go out
- `scheduled_posts` — posts scheduled for future delivery
- `campaign_drafts` — in-progress campaigns
- `ai_activity_log` — every AI call logged (1796+ rows)
- `submind_health_snapshots` — per-call health data (1738+ rows)
- `image_generation_jobs` — NB image job tracking (196+ rows)
- `klyc_knowledge` — RAG knowledge base (12 chunks)
- `loading_quotes` — UI loading messages (607)

---

## Known Issues / Pending Work
- **Social posting broken:** LinkedIn and Threads use dead/wrong table references. YouTube blocks mock path. Fix needed before beta. (Task #35 — diagnosed, not yet fixed)
- **OAuth edge functions:** Need to be deployed to KLYC Supabase — currently missing, blocking LinkedIn/Instagram connect flows (Task #36)
- **Empyrean generate-image:** Still at v9 — MCP deploy was broken Apr 21, needs redeploy to match KLYC v79

---

## Architecture: AI Pipeline Flow
```
User Input
  → normalize-input (KNP compression)
  → klyc-orchestrator (routes to subminds)
  → [social, creative, viral, narrative, product, research, platform, approval]
  → campaign-pipeline (assembles output)
  → generate-image (image lane, composite path)
  → Frontend display
```

---

## How Claude Works With This Repo
- Claude has direct push access to `Klyc-co/core` via GitHub MCP
- Claude has direct read/write access to both Supabase projects
- Every push to `main` auto-deploys via GitHub Actions
- Claude cannot directly call Vercel API (network blocked) — GitHub Action handles deploys
- To deploy a change: Claude pushes code → auto-deploys in ~60 seconds

---

## Rules for All Team Members Working With Claude
1. **Always update this file** when something significant changes (new function versions, architecture changes, resolved bugs)
2. **Kitchens approves all architecture decisions** — Claude should flag architectural choices for Kitchens
3. **Deploy to both Supabase projects** for any edge function change until Empyrean cutover
4. **Test image generation outside 3–7 AM UTC** to avoid NB outage window
5. **Check task list** at start of session — use TodoWrite to track work in progress
