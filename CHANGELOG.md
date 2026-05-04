# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.1.1] — 2025-05-04

### Added

**Pipeline Engine (Phase 1)**
- Full Drizzle ORM schema with 35 tables: projects, productions, episodes, storyboards, assets, jobs, job_steps, job_step_items, job_events, and domain-specific tables
- Database client (`src/db/client.ts`) with `getDb()` singleton, WAL mode, foreign keys
- 10 repositories: Jobs, JobSteps, JobEvents, JobStepItems, Projects, Productions, Episodes, Storyboards, Assets, TaskCenter
- TaskCenterRepository as composition layer over sub-repositories
- JobRunner service with DB-polling tick loop, claim/execute/complete lifecycle
- 14-step drama pipeline definition (`DRAMA_PIPELINE_DEFINITIONS`)
- State machine for step execution (queued → running → succeeded/failed/waiting_callback/waiting_polling/waiting_review)
- Fan-out support via JobStepItems for storyboard-level parallel steps
- 72 integration tests covering all repositories, job runner, and executor logic

**API Surface (Phase 1.5)**
- `POST /api/v1/drama/run` — start drama pipeline for an episode
- `GET /api/v1/jobs` — list jobs with status/bizType/bizId filters
- `GET /api/v1/jobs/[id]` — job detail with steps and events
- `POST /api/v1/jobs/[id]/cancel` — cancel queued/running jobs
- `POST /api/v1/jobs/[id]/retry` — retry terminal jobs
- `POST /api/v1/jobs/[id]/steps/[stepId]/review` — approve/reject human review steps
- `POST /api/v1/callbacks/[provider]` — receive provider callbacks
- Standard API response helpers (`apiSuccess`, `apiError`, `apiNotFound`, `apiInternalError`)

**Step Executors (Phase 1.5)**
- BaseStepExecutor abstract class with timeout wrapping + error boundary
- SourceValidateExecutor — validates episode exists and has content
- ScriptRewriteExecutor — returns waiting_callback for AI text processing
- StubWaitingCallbackExecutor — generic stub for AI/provider callback steps
- StubWaitingReviewExecutor — generic stub for human review steps
- NoopExecutor — succeeds immediately, used for testing
- `createDramaExecutors()` registry wiring all 14 step codes

**CRUD API (Phase 2)**
- `POST/GET /api/v1/projects` — create/list projects
- `GET/PATCH /api/v1/projects/[id]` — get/update project
- `POST/GET /api/v1/projects/[id]/productions` — create/list productions
- `GET /api/v1/productions/[id]` — get production detail
- `POST/GET /api/v1/productions/[id]/episodes` — create/list episodes
- `GET /api/v1/episodes/[id]` — get episode with storyboards
- `POST/GET /api/v1/episodes/[id]/storyboards` — create/list storyboards
- `POST/GET /api/v1/assets` — register/list assets with reference tracking

**Pipeline Integration (Phase 2)**
- Episode step status sync: pipeline step transitions automatically update 14 episode status columns
- SourceValidateExecutor now validates against real episode data
- drama/run validates episode exists, checks runnable state, sets processing status
- Job completion syncs episode status (completed/failed) and clears currentJobId
- Waiting review syncs episode.waitingReviewStep for UI display
- Instrumentation hook starts JobRunner on Next.js server startup

### Technical Details
- Next.js 16.2.4 with Route Handlers, Promise-based params
- Drizzle ORM + better-sqlite3 for SQLite persistence
- Pino structured logging
- Vitest for testing with isolated temp DB per test suite
- Zod for request validation
