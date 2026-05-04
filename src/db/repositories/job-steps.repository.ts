import { and, asc, eq, inArray } from 'drizzle-orm';
import { jobSteps } from '@/db/schema';
import { EXECUTION_STATE, STEP_STATUS } from '@/constants/step';
import type { CreateJobStepInput, StepStatus, ExecutionState } from '@/types';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class JobStepsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async createMany(inputs: CreateJobStepInput[]) {
    if (!inputs.length) return [];
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const rows = inputs.map((input) => ({
      id: `step_${nanoid(21)}`,
      jobId: input.jobId,
      stepCode: input.stepCode,
      stepName: input.stepName,
      stepOrder: input.stepOrder,
      required: input.required,
      status: STEP_STATUS.QUEUED as string,
      executionState: EXECUTION_STATE.NORMAL as string,
      providerName: null,
      providerTaskId: null,
      inputSnapshot: null,
      outputSnapshot: null,
      errorCode: null,
      errorMessage: null,
      retryCount: 0,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    }));
    await this.db.insert(jobSteps).values(rows);
    return this.listByJobId(inputs[0].jobId);
  }

  async listByJobId(jobId: string) {
    return this.db
      .select()
      .from(jobSteps)
      .where(eq(jobSteps.jobId, jobId))
      .orderBy(asc(jobSteps.stepOrder));
  }

  async findById(id: string) {
    const rows = await this.db.select().from(jobSteps).where(eq(jobSteps.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getNextExecutableStep(jobId: string) {
    const steps = await this.listByJobId(jobId);
    for (const step of steps) {
      if (step.status === STEP_STATUS.QUEUED) {
        return step;
      }
    }
    return null;
  }

  async markRunning(stepId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.RUNNING, executionState: EXECUTION_STATE.NORMAL, startedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markSucceeded(stepId: string, outputSnapshot?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.SUCCEEDED, executionState: EXECUTION_STATE.NORMAL, outputSnapshot: outputSnapshot ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markFailed(stepId: string, errorCode?: string | null, errorMessage?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.FAILED, executionState: EXECUTION_STATE.NORMAL, errorCode: errorCode ?? null, errorMessage: errorMessage ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markSkipped(stepId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.SKIPPED, executionState: EXECUTION_STATE.NORMAL, finishedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markCancelled(stepId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.CANCELLED, finishedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markWaitingCallback(stepId: string, providerName: string, providerTaskId: string, inputSnapshot?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.RUNNING, executionState: EXECUTION_STATE.WAITING_CALLBACK, providerName, providerTaskId, inputSnapshot: inputSnapshot ?? null, startedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markWaitingPolling(stepId: string, providerName: string, providerTaskId: string, inputSnapshot?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.RUNNING, executionState: EXECUTION_STATE.WAITING_POLLING, providerName, providerTaskId, inputSnapshot: inputSnapshot ?? null, startedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async markWaitingReview(stepId: string, outputSnapshot?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.RUNNING, executionState: EXECUTION_STATE.WAITING_REVIEW, outputSnapshot: outputSnapshot ?? null, startedAt: now, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async bumpRetryCount(stepId: string) {
    const step = await this.findById(stepId);
    if (!step) return null;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ retryCount: step.retryCount + 1, updatedAt: now })
      .where(eq(jobSteps.id, stepId));
    return this.findById(stepId);
  }

  async cancelPendingOrQueuedSteps(jobId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobSteps)
      .set({ status: STEP_STATUS.CANCELLED, finishedAt: now, updatedAt: now })
      .where(and(eq(jobSteps.jobId, jobId), inArray(jobSteps.status, [STEP_STATUS.PENDING, STEP_STATUS.QUEUED])));
    return this.listByJobId(jobId);
  }

  async findByProviderTaskId(providerTaskId: string) {
    const rows = await this.db.select().from(jobSteps).where(eq(jobSteps.providerTaskId, providerTaskId)).limit(1);
    return rows[0] ?? null;
  }
}
