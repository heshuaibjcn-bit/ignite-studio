import { asc, eq } from 'drizzle-orm';
import { jobStepItems } from '@/db/schema';
import { STEP_STATUS, EXECUTION_STATE } from '@/constants/step';
import type { StepStatus } from '@/types';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class JobStepItemsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async createMany(inputs: Array<{ jobId: string; stepId: string; itemId: string }>) {
    if (!inputs.length) return [];
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const rows = inputs.map((input) => ({
      id: `jsi_${nanoid(21)}`,
      jobId: input.jobId,
      stepId: input.stepId,
      itemId: input.itemId,
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
    await this.db.insert(jobStepItems).values(rows);
    return this.listByStepId(inputs[0].stepId);
  }

  async listByStepId(stepId: string) {
    return this.db.select().from(jobStepItems).where(eq(jobStepItems.stepId, stepId)).orderBy(asc(jobStepItems.itemId));
  }

  async listByJobId(jobId: string) {
    return this.db.select().from(jobStepItems).where(eq(jobStepItems.jobId, jobId));
  }

  async findById(id: string) {
    const rows = await this.db.select().from(jobStepItems).where(eq(jobStepItems.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async markRunning(itemId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobStepItems)
      .set({ status: STEP_STATUS.RUNNING, startedAt: now, updatedAt: now })
      .where(eq(jobStepItems.id, itemId));
    return this.findById(itemId);
  }

  async markSucceeded(itemId: string, outputSnapshot?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobStepItems)
      .set({ status: STEP_STATUS.SUCCEEDED, outputSnapshot: outputSnapshot ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobStepItems.id, itemId));
    return this.findById(itemId);
  }

  async markFailed(itemId: string, errorCode?: string | null, errorMessage?: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(jobStepItems)
      .set({ status: STEP_STATUS.FAILED, errorCode: errorCode ?? null, errorMessage: errorMessage ?? null, finishedAt: now, updatedAt: now })
      .where(eq(jobStepItems.id, itemId));
    return this.findById(itemId);
  }

  /** Count items by status for a given step. */
  async countByStatus(stepId: string) {
    const items = await this.listByStepId(stepId);
    const counts = { total: items.length, succeeded: 0, failed: 0, running: 0, queued: 0, pending: 0, cancelled: 0, skipped: 0 };
    for (const item of items) {
      const s = item.status as StepStatus;
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    return counts;
  }

  /** Check if all items for a step are in a terminal state. */
  async allItemsCompleted(stepId: string): Promise<boolean> {
    const counts = await this.countByStatus(stepId);
    return counts.total > 0 && (counts.succeeded + counts.failed + counts.cancelled + counts.skipped) === counts.total;
  }

  /** Check if all items for a step succeeded. */
  async allItemsSucceeded(stepId: string): Promise<boolean> {
    const counts = await this.countByStatus(stepId);
    return counts.total > 0 && counts.succeeded === counts.total;
  }
}
