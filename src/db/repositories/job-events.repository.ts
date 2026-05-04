import { asc, eq } from 'drizzle-orm';
import { jobEvents } from '@/db/schema';
import type { CreateJobEventInput } from '@/types';
import { getDb, type Db } from '@/db/client';

export class JobEventsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async append(input: CreateJobEventInput) {
    await this.db.insert(jobEvents).values({
      id: input.id,
      jobId: input.jobId,
      stepId: input.stepId ?? null,
      eventType: input.eventType,
      payload: input.payload ?? null,
      createdAt: input.createdAt,
    });
    return this.findById(input.id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(jobEvents).where(eq(jobEvents.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listByJobId(jobId: string) {
    return this.db
      .select()
      .from(jobEvents)
      .where(eq(jobEvents.jobId, jobId))
      .orderBy(asc(jobEvents.createdAt));
  }
}
