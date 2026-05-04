import { and, desc, eq } from 'drizzle-orm';
import { productions } from '@/db/schema';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class ProductionsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async create(input: {
    projectId: string;
    mode: string;
    name: string;
    description?: string;
    configSnapshot?: unknown;
    templateIds?: string[];
    defaultVoiceId?: string;
    ownerId?: string;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `prod_${nanoid(21)}`;
    await this.db.insert(productions).values({
      id,
      projectId: input.projectId,
      mode: input.mode,
      name: input.name,
      description: input.description ?? null,
      configSnapshot: input.configSnapshot ? JSON.stringify(input.configSnapshot) : null,
      templateIds: input.templateIds ? JSON.stringify(input.templateIds) : null,
      defaultVoiceId: input.defaultVoiceId ?? null,
      ownerId: input.ownerId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(productions).where(eq(productions.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listByProjectId(projectId: string, params?: {
    status?: string;
    mode?: string;
  }) {
    const conditions: any[] = [eq(productions.projectId, projectId)];
    if (params?.status) conditions.push(eq(productions.status, params.status));
    if (params?.mode) conditions.push(eq(productions.mode, params.mode));

    return this.db
      .select()
      .from(productions)
      .where(and(...conditions))
      .orderBy(desc(productions.createdAt));
  }

  async update(id: string, fields: {
    name?: string;
    description?: string;
    status?: string;
    configSnapshot?: unknown;
    templateIds?: string[];
    defaultVoiceId?: string;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const set: any = { updatedAt: now };
    if (fields.name !== undefined) set.name = fields.name;
    if (fields.description !== undefined) set.description = fields.description;
    if (fields.status !== undefined) set.status = fields.status;
    if (fields.configSnapshot !== undefined) set.configSnapshot = JSON.stringify(fields.configSnapshot);
    if (fields.templateIds !== undefined) set.templateIds = JSON.stringify(fields.templateIds);
    if (fields.defaultVoiceId !== undefined) set.defaultVoiceId = fields.defaultVoiceId;

    await this.db.update(productions).set(set).where(eq(productions.id, id));
    return this.findById(id);
  }

  async softDelete(id: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(productions).set({ status: 'archived', updatedAt: now }).where(eq(productions.id, id));
    return this.findById(id);
  }
}
