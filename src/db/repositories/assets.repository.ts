import { and, desc, eq } from 'drizzle-orm';
import { assets, assetReferences } from '@/db/schema';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class AssetsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async create(input: {
    projectId?: string;
    productionId?: string;
    type: string;
    sourceType: string;
    sourceProvider?: string;
    originJobId?: string;
    title?: string;
    mimeType: string;
    sizeBytes?: number;
    checksum?: string;
    localPath: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    durationMs?: number;
    fps?: number;
    sampleRate?: number;
    channels?: number;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `asset_${nanoid(21)}`;
    await this.db.insert(assets).values({
      id,
      projectId: input.projectId ?? null,
      productionId: input.productionId ?? null,
      type: input.type,
      sourceType: input.sourceType,
      sourceProvider: input.sourceProvider ?? null,
      originJobId: input.originJobId ?? null,
      title: input.title ?? null,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes ?? 0,
      checksum: input.checksum ?? null,
      localPath: input.localPath,
      previewUrl: input.previewUrl ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      fps: input.fps ?? null,
      sampleRate: input.sampleRate ?? null,
      channels: input.channels ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async list(params: {
    projectId?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (params.projectId) conditions.push(eq(assets.projectId, params.projectId));
    if (params.type) conditions.push(eq(assets.type, params.type));
    if (params.status) conditions.push(eq(assets.status, params.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(assets)
      .where(where)
      .orderBy(desc(assets.createdAt))
      .limit(params.limit ?? 20)
      .offset(params.offset ?? 0);
  }

  async update(id: string, fields: {
    title?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    status?: string;
    localPath?: string;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(assets).set({ ...fields, updatedAt: now }).where(eq(assets.id, id));
    return this.findById(id);
  }

  async softDelete(id: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(assets).set({ status: 'soft_deleted', deletedAt: now, updatedAt: now }).where(eq(assets.id, id));
    return this.findById(id);
  }

  // --- Asset References ---

  async createReference(input: {
    assetId: string;
    refType: string;
    refId: string;
    refField: string;
    isCurrent?: boolean;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `ar_${nanoid(21)}`;
    await this.db.insert(assetReferences).values({
      id,
      assetId: input.assetId,
      refType: input.refType,
      refId: input.refId,
      refField: input.refField,
      isCurrent: input.isCurrent ?? true,
      createdAt: now,
    });
    const rows = await this.db.select().from(assetReferences).where(eq(assetReferences.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findCurrentReference(params: {
    refType: string;
    refId: string;
    refField: string;
  }) {
    const rows = await this.db
      .select()
      .from(assetReferences)
      .where(and(
        eq(assetReferences.refType, params.refType),
        eq(assetReferences.refId, params.refId),
        eq(assetReferences.refField, params.refField),
        eq(assetReferences.isCurrent, true),
      ))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Set a new current asset — unsets previous current for this ref slot, then creates new. */
  async setCurrentAsset(refType: string, refId: string, refField: string, assetId: string) {
    // Unset existing current
    await this.db
      .update(assetReferences)
      .set({ isCurrent: false })
      .where(and(
        eq(assetReferences.refType, refType),
        eq(assetReferences.refId, refId),
        eq(assetReferences.refField, refField),
        eq(assetReferences.isCurrent, true),
      ));

    // Create new current reference
    return this.createReference({ assetId, refType, refId, refField, isCurrent: true });
  }
}
