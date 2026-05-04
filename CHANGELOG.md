# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.2.0] — 2025-05-04

### Added

**Frontend Dashboard (Phase 3)**
- shadcn/ui component library with Tailwind CSS v4 (button, card, badge, dialog, table, tabs, etc.)
- Sidebar navigation with "工作台" and "创作" sections (Chinese labels)
- Mobile-responsive layout with sheet-based hamburger menu
- Breadcrumb navigation derived from route segments

**Pages:**
- `/dashboard` — Stats overview (project count, active jobs, pending reviews) + recent jobs table with auto-polling
- `/projects` — Project list with status badges and creation date
- `/projects/new` — Create project form (name, description, category)
- `/productions/[id]` — Project detail showing productions with episode lists
- `/episodes/[id]` — Episode detail with 14-step pipeline visualization, content viewer, run pipeline button
- `/episodes/[id]/storyboards` — Storyboard grid viewer with image thumbnails and shot type badges
- `/jobs` — Job monitor with status filter tabs (全部/运行中/已完成/失败/已取消) and auto-polling
- `/jobs/[id]` — Job detail: summary cards, step timeline, fan-out item grids, event log, review actions
- `/assets` — Asset browser with type filters and preview

**Pipeline Visualization:**
- 14-step horizontal stepper (2 rows × 7 steps) with status-colored nodes
- Status icon mapping: green check (succeeded), red X (failed), blue spinner (running), amber pause (waiting_review), grey clock (pending)
- Required/optional and fan-out (parallel) step tags
- Clickable step detail panel with timing, error info, provider details
- Fan-out item grid for storyboard-level parallel steps (colored squares)
- Inline review actions (approve/reject with reason) for waiting_review steps
- Run Pipeline button with status-aware disable logic

**Backend Additions:**
- `GET /api/v1/dashboard/stats` — Aggregate stats for dashboard
- `GET /api/v1/assets/[id]/file` — Serves actual asset files for browser preview
- Extended `GET /api/v1/jobs/[id]` response to include `stepItems` for fan-out visualization

**Utilities:**
- `src/lib/api-client.ts` — Typed REST API client for Client Components
- `src/lib/constants.ts` — Chinese label maps for all status types and pipeline step groups
- `src/lib/formatters.ts` — Date, duration, file size, and relative time formatters
- `src/hooks/use-polling.ts` — Polling hook with auto-stop on terminal states

### Technical Details
- shadcn/ui v4 with @base-ui/react primitives
- Server Components with direct DB access for page loads
- Client Components with REST API for mutations and polling
- All UI text in Chinese (zh-CN)
- 72 tests passing (no regressions)

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
