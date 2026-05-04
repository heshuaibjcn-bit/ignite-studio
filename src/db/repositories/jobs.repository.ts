import { and, desc, eq } from 'drizzle-orm';
import { jobs } from '@/db/schema';
import { JOB_STATUS } from '@/constants/job';
import type { JobStatus } from '@/types';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class JobsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async create(input: {
    id?: string;
    bizType: string;
    bizId: string;
    runType: string;
    triggerSource: string;
    projectId?: string | null;
    productionId?: string | null;
    priority?: number;
    idempotencyKey?: string | null;
    parentBatchId?: string | null;
    createdBy?: string | null;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = input.id ?? `job_${nanoid(21)}`;
    await this.db.insert(jobs).values({
      id,
      projectId: input.projectId ?? null,
      productionId: input.productionId ?? null,
      bizType: input.bizType,
      bizId: input.bizId,
      runType: input.runType,
      triggerSource: input.triggerSource,
      status: JOB_STATUS.QUEUED,
      priority: input.priority ?? 100,
      idempotencyKey: input.idempotencyKey ?? null,
      parentBatchId: input.parentBatchId ?? null,
      createdBy: input.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findLatestByBiz(bizType: string, bizId: string) {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.bizType, bizType), eq(jobs.bizId, bizId)))
      .orderBy(desc(jobs.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.idempotencyKey, idempotencyKey))
      .limit(1);
    return rows[0] ?? null;
  }

  async listQueueCandidates(limit = 20) {
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, JOB_STATUS.QUEUED))
      .orderBy(jobs.priority, jobs.createdAt)
      .limit(limit);
  }

  /** Atomic claim — returns true if claimed successfully. */
  async claimQueuedJob(jobId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const result = await this.db
      .update(jobs)
      .set({ status: JOB_STATUS.RUNNING, startedAt: now, updatedAt: now })
      .where(and(eq(jobs.id, jobId), eq(jobs.status, JOB_STATUS.QUEUED)));
    return (result as any).changes > 0;
  }

  async updateStatus(
    jobId: string,
    status: JobStatus,
    extra?: {
      currentStep?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
      finishedAt?: string | null;
      retryCount?: number;
    },
  ) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({
        status,
        currentStep: extra?.currentStep,
        errorCode: extra?.errorCode,
        errorMessage: extra?.errorMessage,
        finishedAt: extra?.finishedAt,
        retryCount: extra?.retryCount,
        updatedAt: now,
      })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  async updateCurrentStep(jobId: string, currentStep: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({ currentStep, updatedAt: now })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  async requestCancel(jobId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({ cancelRequested: true, updatedAt: now })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  async finishAsSuccess(jobId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({ status: JOB_STATUS.SUCCESS, finishedAt: now, updatedAt: now })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  async finishAsPartialSuccess(jobId: string, errorMessage?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({ status: JOB_STATUS.PARTIAL_SUCCESS, errorMessage: errorMessage ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  async finishAsFailed(jobId: string, errorCode?: string | null, errorMessage?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({ status: JOB_STATUS.FAILED, errorCode: errorCode ?? null, errorMessage: errorMessage ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  async finishAsCancelled(jobId: string, errorMessage?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobs)
      .set({ status: JOB_STATUS.CANCELLED, errorMessage: errorMessage ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobs.id, jobId));
    return this.findById(jobId);
  }

  /** List jobs with optional filters. */
  async listByFilter(params: {
    status?: string;
    bizType?: string;
    bizId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (params.status) conditions.push(eq(jobs.status, params.status));
    if (params.bizType) conditions.push(eq(jobs.bizType, params.bizType));
    if (params.bizId) conditions.push(eq(jobs.bizId, params.bizId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    return this.db
      .select()
      .from(jobs)
      .where(where)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /** List running jobs — used by runner to resume paused pipelines. */
  async listRunningJobs(limit = 20) {
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, JOB_STATUS.RUNNING))
      .orderBy(jobs.priority, jobs.createdAt)
      .limit(limit);
  }
}
