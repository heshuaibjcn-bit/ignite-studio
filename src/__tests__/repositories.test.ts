/**
 * Repository + Job Runner integration tests.
 * Uses in-memory SQLite with the full Drizzle schema.
 * Each describe block gets its own temp DB to avoid migration collisions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { JobsRepository } from '@/db/repositories/jobs.repository';
import { JobStepItemsRepository } from '@/db/repositories/job-step-items.repository';
import { JobRunner } from '@/services/job-runner';
import { NoopExecutor } from '@/services/executors/noop-executor';
import { DRAMA_PIPELINE_DEFINITIONS } from '@/constants/step';
import { JOB_STATUS } from '@/constants/job';
import { STEP_STATUS } from '@/constants/step';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import os from 'os';

/** Create a fresh temp directory and DB path for an isolated test suite. */
function createTempDbPath(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignite-repo-test-'));
  return path.join(tmpDir, 'test.db');
}

/** Create a Drizzle instance pointing at the given DB path. */
function createTestDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

/** Apply migrations to a DB path. */
function migrateDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const migrationDir = path.resolve(__dirname, '../../drizzle');
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
    sqlite.exec(sql);
  }
  sqlite.close();
}

/** Helper: create an isolated DB, migrate it, return Drizzle instance + cleanup. */
function setupIsolatedDb() {
  const dbPath = createTempDbPath();
  const tmpDir = path.dirname(dbPath);
  migrateDb(dbPath);
  const db = createTestDb(dbPath);
  const cleanup = () => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  };
  return { db, dbPath, cleanup };
}

describe('TaskCenterRepository — Pipeline Job', () => {
  let taskCenter: TaskCenterRepository;
  let cleanup: () => void;

  beforeAll(() => {
    const env = setupIsolatedDb();
    taskCenter = new TaskCenterRepository(env.db);
    cleanup = env.cleanup;
  });

  afterAll(() => cleanup());

  it('creates a 14-step drama pipeline job', async () => {
    const jobId = `job_${nanoid(10)}`;
    const detail = await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    expect(detail).not.toBeNull();
    expect(detail!.job.id).toBe(jobId);
    expect(detail!.job.status).toBe(JOB_STATUS.QUEUED);
    expect(detail!.steps).toHaveLength(14);
    expect(detail!.steps[0].stepCode).toBe('source_validate');
    expect(detail!.steps[13].stepCode).toBe('export_finalize');
    expect(detail!.events.length).toBeGreaterThanOrEqual(2); // created + queued
  });

  it('claims a queued job for a worker', async () => {
    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    const detail = await taskCenter.claimJobForWorker(jobId);
    expect(detail).not.toBeNull();
    expect(detail!.job.status).toBe(JOB_STATUS.RUNNING);
    expect(detail!.job.startedAt).not.toBeNull();
  });

  it('returns null when claiming already-running job', async () => {
    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    const first = await taskCenter.claimJobForWorker(jobId);
    expect(first).not.toBeNull();

    const second = await taskCenter.claimJobForWorker(jobId);
    expect(second).toBeNull();
  });
});

describe('TaskCenterRepository — Step Execution', () => {
  let taskCenter: TaskCenterRepository;
  let jobId: string;
  let cleanup: () => void;

  beforeAll(async () => {
    const env = setupIsolatedDb();
    taskCenter = new TaskCenterRepository(env.db);
    cleanup = env.cleanup;
    jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });
    await taskCenter.claimJobForWorker(jobId);
  });

  afterAll(() => cleanup());

  it('gets next executable step', async () => {
    const step = await taskCenter.getNextExecutableStep(jobId);
    expect(step).not.toBeNull();
    expect(step!.stepCode).toBe('source_validate');
    expect(step!.status).toBe('queued');
  });

  it('marks step started, then succeeded', async () => {
    const step = await taskCenter.getNextExecutableStep(jobId);
    expect(step).not.toBeNull();

    const started = await taskCenter.markStepStarted(jobId, step!.id, step!.stepCode);
    expect(started!.status).toBe(STEP_STATUS.RUNNING);

    const succeeded = await taskCenter.markStepSucceeded(jobId, step!.id, { result: 'ok' });
    expect(succeeded!.status).toBe(STEP_STATUS.SUCCEEDED);
  });

  it('progresses through steps in order', async () => {
    const step = await taskCenter.getNextExecutableStep(jobId);
    expect(step!.stepCode).toBe('script_rewrite');
  });
});

describe('TaskCenterRepository — Job Completion', () => {
  let cleanup: () => void;

  afterAll(() => cleanup());

  it('completes job as success when all required steps succeed', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const taskCenter = new TaskCenterRepository(env.db);

    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });
    await taskCenter.claimJobForWorker(jobId);

    // Execute all steps using noop (succeed immediately)
    const detail = await taskCenter.getJobDetail(jobId);
    for (const step of detail!.steps) {
      await taskCenter.markStepStarted(jobId, step.id, step.stepCode);
      await taskCenter.markStepSucceeded(jobId, step.id);
    }

    const summary = await taskCenter.summarizeJob(jobId);
    expect(summary!.summary.succeeded).toBe(14);
  });

  it('cancels a queued job', async () => {
    const env = setupIsolatedDb();
    const taskCenter = new TaskCenterRepository(env.db);

    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    const job = await taskCenter.cancelQueuedJob(jobId);
    expect(job!.status).toBe(JOB_STATUS.CANCELLED);
  });
});

describe('JobStepItemsRepository', () => {
  let cleanup: () => void;

  afterAll(() => cleanup());

  it('creates fan-out items and counts by status', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const { db } = env;

    const itemsRepo = new JobStepItemsRepository(db);
    const { JobStepsRepository } = await import('@/db/repositories/job-steps.repository');
    const stepsRepo = new JobStepsRepository(db);

    // Create a job and a step first
    const jobsRepo = new JobsRepository(db);
    const jobId = `job_${nanoid(10)}`;
    await jobsRepo.create({ id: jobId, bizType: 'episode', bizId: `ep_${nanoid(10)}`, runType: 'pipeline', triggerSource: 'user' });

    // Create steps via the steps repo's internal createMany
    const steps = await stepsRepo.createMany([
      { jobId, stepCode: 'frame_image_generate', stepName: '镜头图生成', stepOrder: 9, required: true },
    ]);
    const stepId = steps[0].id;

    // Create fan-out items (3 storyboards)
    const items = await itemsRepo.createMany([
      { jobId, stepId, itemId: 'sb_1' },
      { jobId, stepId, itemId: 'sb_2' },
      { jobId, stepId, itemId: 'sb_3' },
    ]);

    expect(items).toHaveLength(3);

    // Count by status
    const counts = await itemsRepo.countByStatus(stepId);
    expect(counts.total).toBe(3);
    expect(counts.queued).toBe(3);

    // Mark items as succeeded
    for (const item of items) {
      await itemsRepo.markSucceeded(item.id);
    }

    const allDone = await itemsRepo.allItemsSucceeded(stepId);
    expect(allDone).toBe(true);
  });
});

describe('JobRunner with NoopExecutor', () => {
  let cleanup: () => void;

  afterAll(() => cleanup());

  it('executes full pipeline end-to-end', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const taskCenter = new TaskCenterRepository(env.db);

    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    // Set up runner with noop executor
    const executors = new Map();
    executors.set('*', new NoopExecutor());
    const runner = new JobRunner(taskCenter, executors, { pollIntervalMs: 60000 });

    // Run one tick (should claim and execute the job)
    await runner.tick();

    // Verify all steps succeeded
    const summary = await taskCenter.summarizeJob(jobId);
    expect(summary).not.toBeNull();
    expect(summary!.job.status).toBe(JOB_STATUS.SUCCESS);
    expect(summary!.summary.succeeded).toBe(14);
    expect(summary!.summary.failed).toBe(0);

    runner.stop();
  });

  it('no-ops when no queued jobs', async () => {
    const env = setupIsolatedDb();
    const taskCenter = new TaskCenterRepository(env.db);

    const executors = new Map();
    executors.set('*', new NoopExecutor());
    const runner = new JobRunner(taskCenter, executors, { pollIntervalMs: 60000 });

    // Tick with no jobs — should not throw
    await runner.tick();
    runner.stop();
  });
});

describe('TaskCenterRepository — Review Flow', () => {
  let cleanup: () => void;

  afterAll(() => cleanup());

  it('approves a waiting_review step', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const taskCenter = new TaskCenterRepository(env.db);

    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });
    await taskCenter.claimJobForWorker(jobId);

    // Get first step and mark it as waiting_review
    const step = await taskCenter.getNextExecutableStep(jobId);
    expect(step).not.toBeNull();
    await taskCenter.markWaitingReview({ jobId, stepId: step!.id });

    // Approve it
    const approved = await taskCenter.approveStep({ jobId, stepId: step!.id });
    expect(approved).not.toBeNull();
    expect(approved!.status).toBe(STEP_STATUS.SUCCEEDED);
  });

  it('rejects a waiting_review step and fails the job', async () => {
    const env = setupIsolatedDb();
    const taskCenter = new TaskCenterRepository(env.db);

    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });
    await taskCenter.claimJobForWorker(jobId);

    const step = await taskCenter.getNextExecutableStep(jobId);
    await taskCenter.markWaitingReview({ jobId, stepId: step!.id });

    // Reject it
    const rejected = await taskCenter.rejectStep({ jobId, stepId: step!.id, reason: 'Bad quality' });
    expect(rejected).not.toBeNull();
    expect(rejected!.status).toBe(STEP_STATUS.FAILED);

    // Job should be failed
    const summary = await taskCenter.summarizeJob(jobId);
    expect(summary!.job.status).toBe(JOB_STATUS.FAILED);
  });

  it('returns null when approving non-review step', async () => {
    const env = setupIsolatedDb();
    const taskCenter = new TaskCenterRepository(env.db);

    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: `ep_${nanoid(10)}`,
      runType: 'pipeline',
      triggerSource: 'user',
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });
    await taskCenter.claimJobForWorker(jobId);

    // Try to approve a queued step (not waiting_review)
    const step = await taskCenter.getNextExecutableStep(jobId);
    const result = await taskCenter.approveStep({ jobId, stepId: step!.id });
    expect(result).toBeNull();
  });
});

describe('TaskCenterRepository — List Jobs', () => {
  let cleanup: () => void;

  afterAll(() => cleanup());

  it('lists jobs with status filter', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const taskCenter = new TaskCenterRepository(env.db);

    // Create 3 jobs
    const bizId1 = `ep_${nanoid(10)}`;
    const bizId2 = `ep_${nanoid(10)}`;
    const bizId3 = `ep_${nanoid(10)}`;

    await taskCenter.createPipelineJob({ jobId: `job_a${nanoid(5)}`, bizType: 'episode', bizId: bizId1, runType: 'pipeline', triggerSource: 'user', steps: DRAMA_PIPELINE_DEFINITIONS });
    await taskCenter.createPipelineJob({ jobId: `job_b${nanoid(5)}`, bizType: 'episode', bizId: bizId2, runType: 'pipeline', triggerSource: 'user', steps: DRAMA_PIPELINE_DEFINITIONS });

    const jobId3 = `job_c${nanoid(5)}`;
    await taskCenter.createPipelineJob({ jobId: jobId3, bizType: 'talking_head', bizId: bizId3, runType: 'pipeline', triggerSource: 'user', steps: DRAMA_PIPELINE_DEFINITIONS });

    // Cancel one
    await taskCenter.cancelQueuedJob(jobId3);

    // Filter by status
    const queued = await taskCenter.listJobs({ status: JOB_STATUS.QUEUED });
    expect(queued.length).toBe(2);

    const cancelled = await taskCenter.listJobs({ status: JOB_STATUS.CANCELLED });
    expect(cancelled.length).toBe(1);

    // Filter by bizType
    const episodes = await taskCenter.listJobs({ bizType: 'episode' });
    expect(episodes.length).toBe(2);
  });
});

describe('JobRunner with Drama Executors', () => {
  it.skip('pauses at script_rewrite waiting_callback - now uses real AI agent', async () => {
    // ScriptRewriteExecutor now makes real LLM calls via AI SDK
    // Test requires active text/LLM provider configuration
    // Run integration tests separately with real AI config
  });
});
