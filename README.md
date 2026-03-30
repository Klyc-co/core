# KLYC Social Marketing at Scale

AI marketing intelligence platform — multi-agent orchestration powered by Claude API.

## Repository Structure

- `backend/` — AI orchestration engine (KLYCAgent, 9 submind profiles, Claude API)
- `src/` — React frontend (development UI, Lovable-connected)
- `supabase/` — Database layer (37+ migrations, edge functions)

## Lovable Project

**URL**: https://lovable.dev/projects/12a99886-b5e5-4828-985b-30192faff5ae

Changes made via Lovable will be committed automatically to this repo.

## Backend Architecture

Singular agent (`KLYCAgent`) with 9 submind personality profiles, driven by `KLYCOrchestratorV2`. Pipeline: normalizer → research → product → narrative → social → image → editor → approval → analytics.

See `backend/README.md` for full architecture documentation.

## Tech Stack

- **AI**: Claude API (Sonnet + Haiku) via raw fetch
- **Frontend**: Vite + TypeScript + React + shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL + Edge Functions)
- **Deployment**: Lovable (frontend) + Supabase (backend)

## Development

```sh
npm i
npm run dev
```

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...
```
