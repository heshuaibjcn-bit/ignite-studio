import { and, desc, eq } from 'drizzle-orm';
import { projects } from '@/db/schema';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class ProjectsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async create(input: {
    name: string;
    description?: string;
    category?: string;
    coverAssetId?: string;
    defaultVoiceId?: string;
    ownerId?: string;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `proj_${nanoid(21)}`;
    await this.db.insert(projects).values({
      id,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      coverAssetId: input.coverAssetId ?? null,
      defaultVoiceId: input.defaultVoiceId ?? null,
      ownerId: input.ownerId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async list(params: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (params.status) conditions.push(eq(projects.status, params.status));
    if (params.category) conditions.push(eq(projects.category, params.category));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(params.limit ?? 20)
      .offset(params.offset ?? 0);
  }

  async update(id: string, fields: {
    name?: string;
    description?: string;
    category?: string;
    status?: string;
    coverAssetId?: string | null;
    defaultVoiceId?: string | null;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(projects).set({ ...fields, updatedAt: now }).where(eq(projects.id, id));
    return this.findById(id);
  }

  async softDelete(id: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(projects).set({ status: 'archived', updatedAt: now }).where(eq(projects.id, id));
    return this.findById(id);
  }
}
