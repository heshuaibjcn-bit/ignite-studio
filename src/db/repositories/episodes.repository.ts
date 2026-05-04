import { and, desc, eq } from 'drizzle-orm';
import { episodes } from '@/db/schema';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

/** Maps pipeline stepCode to the episode table's step status column name. */
export const STEP_CODE_TO_EPISODE_COL: Record<string, keyof typeof episodes> = {
  source_validate: 'sourceValidateStatus',
  script_rewrite: 'scriptRewriteStatus',
  character_scene_extract: 'characterSceneExtractStatus',
  voice_assign: 'voiceAssignStatus',
  storyboard_generate: 'storyboardGenerateStatus',
  storyboard_review: 'storyboardReviewStatus',
  character_image_generate: 'characterImageGenerateStatus',
  scene_image_generate: 'sceneImageGenerateStatus',
  frame_image_generate: 'frameImageGenerateStatus',
  video_generate: 'videoGenerateStatus',
  video_review: 'videoReviewStatus',
  shot_compose: 'shotComposeStatus',
  episode_merge: 'episodeMergeStatus',
  export_finalize: 'exportFinalizeStatus',
};

export class EpisodesRepository {
  constructor(private readonly db: Db = getDb()) {}

  async create(input: {
    projectId: string;
    productionId: string;
    episodeNo: number;
    title: string;
    content: string;
    scriptContent?: string;
    configSnapshot?: unknown;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `ep_${nanoid(21)}`;
    await this.db.insert(episodes).values({
      id,
      projectId: input.projectId,
      productionId: input.productionId,
      episodeNo: input.episodeNo,
      title: input.title,
      content: input.content,
      scriptContent: input.scriptContent ?? null,
      configSnapshot: input.configSnapshot ? JSON.stringify(input.configSnapshot) : null,
      createdAt: now,
      updatedAt: now,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(episodes).where(eq(episodes.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listByProductionId(productionId: string, params?: {
    status?: string;
  }) {
    const conditions: any[] = [eq(episodes.productionId, productionId)];
    if (params?.status) conditions.push(eq(episodes.status, params.status));

    return this.db
      .select()
      .from(episodes)
      .where(and(...conditions))
      .orderBy(episodes.episodeNo);
  }

  async update(id: string, fields: {
    title?: string;
    content?: string;
    scriptContent?: string;
    status?: string;
    finalVideoAssetId?: string | null;
    configSnapshot?: unknown;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const set: any = { updatedAt: now };
    if (fields.title !== undefined) set.title = fields.title;
    if (fields.content !== undefined) set.content = fields.content;
    if (fields.scriptContent !== undefined) set.scriptContent = fields.scriptContent;
    if (fields.status !== undefined) set.status = fields.status;
    if (fields.finalVideoAssetId !== undefined) set.finalVideoAssetId = fields.finalVideoAssetId;
    if (fields.configSnapshot !== undefined) set.configSnapshot = JSON.stringify(fields.configSnapshot);

    await this.db.update(episodes).set(set).where(eq(episodes.id, id));
    return this.findById(id);
  }

  /** Update one of the 14 step status columns. */
  async updateStepStatus(id: string, stepCode: string, stepStatus: string) {
    const col = STEP_CODE_TO_EPISODE_COL[stepCode];
    if (!col) return null;

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db
      .update(episodes)
      .set({ [col]: stepStatus, updatedAt: now } as any)
      .where(eq(episodes.id, id));
    return this.findById(id);
  }

  async setCurrentJob(id: string, jobId: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(episodes).set({ currentJobId: jobId, updatedAt: now }).where(eq(episodes.id, id));
    return this.findById(id);
  }

  async setError(id: string, errorCode: string | null, errorMessage: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(episodes).set({ errorCode, errorMessage, updatedAt: now }).where(eq(episodes.id, id));
    return this.findById(id);
  }

  async setWaitingReviewStep(id: string, stepCode: string | null) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(episodes).set({ waitingReviewStep: stepCode, updatedAt: now }).where(eq(episodes.id, id));
    return this.findById(id);
  }

  async softDelete(id: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(episodes).set({ status: 'archived', updatedAt: now }).where(eq(episodes.id, id));
    return this.findById(id);
  }
}
