import { and, asc, eq } from 'drizzle-orm';
import { storyboards } from '@/db/schema';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';

export class StoryboardsRepository {
  constructor(private readonly db: Db = getDb()) {}

  async create(input: {
    episodeId: string;
    seq: number;
    title?: string;
    shotType?: string;
    visualDesc: string;
    dialogue?: string;
    actionDesc?: string;
    durationSec?: number;
    sceneId?: string;
    promptText?: string;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `sb_${nanoid(21)}`;
    await this.db.insert(storyboards).values({
      id,
      episodeId: input.episodeId,
      seq: input.seq,
      title: input.title ?? null,
      shotType: input.shotType ?? null,
      visualDesc: input.visualDesc,
      dialogue: input.dialogue ?? null,
      actionDesc: input.actionDesc ?? null,
      durationSec: input.durationSec ?? null,
      sceneId: input.sceneId ?? null,
      promptText: input.promptText ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(storyboards).where(eq(storyboards.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listByEpisodeId(episodeId: string) {
    return this.db
      .select()
      .from(storyboards)
      .where(eq(storyboards.episodeId, episodeId))
      .orderBy(asc(storyboards.seq));
  }

  async countByEpisodeId(episodeId: string) {
    const items = await this.listByEpisodeId(episodeId);
    return items.length;
  }

  async update(id: string, fields: {
    title?: string;
    shotType?: string;
    visualDesc?: string;
    dialogue?: string;
    actionDesc?: string;
    durationSec?: number;
    sceneId?: string;
    promptText?: string;
    selectedImageAssetId?: string | null;
    selectedVideoAssetId?: string | null;
    composedVideoAssetId?: string | null;
    imageCandidateAssetIds?: string[];
    videoCandidateAssetIds?: string[];
    status?: string;
  }) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const set: any = { updatedAt: now };
    if (fields.title !== undefined) set.title = fields.title;
    if (fields.shotType !== undefined) set.shotType = fields.shotType;
    if (fields.visualDesc !== undefined) set.visualDesc = fields.visualDesc;
    if (fields.dialogue !== undefined) set.dialogue = fields.dialogue;
    if (fields.actionDesc !== undefined) set.actionDesc = fields.actionDesc;
    if (fields.durationSec !== undefined) set.durationSec = fields.durationSec;
    if (fields.sceneId !== undefined) set.sceneId = fields.sceneId;
    if (fields.promptText !== undefined) set.promptText = fields.promptText;
    if (fields.selectedImageAssetId !== undefined) set.selectedImageAssetId = fields.selectedImageAssetId;
    if (fields.selectedVideoAssetId !== undefined) set.selectedVideoAssetId = fields.selectedVideoAssetId;
    if (fields.composedVideoAssetId !== undefined) set.composedVideoAssetId = fields.composedVideoAssetId;
    if (fields.imageCandidateAssetIds !== undefined) set.imageCandidateAssetIds = JSON.stringify(fields.imageCandidateAssetIds);
    if (fields.videoCandidateAssetIds !== undefined) set.videoCandidateAssetIds = JSON.stringify(fields.videoCandidateAssetIds);
    if (fields.status !== undefined) set.status = fields.status;

    await this.db.update(storyboards).set(set).where(eq(storyboards.id, id));
    return this.findById(id);
  }

  /** Reorder storyboards by updating seq for each id in order. */
  async reorder(episodeId: string, orderedIds: string[]) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .update(storyboards)
        .set({ seq: i + 1, updatedAt: now })
        .where(and(eq(storyboards.id, orderedIds[i]), eq(storyboards.episodeId, episodeId)));
    }
    return this.listByEpisodeId(episodeId);
  }

  async softDelete(id: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this.db.update(storyboards).set({ status: 'archived', updatedAt: now }).where(eq(storyboards.id, id));
    return this.findById(id);
  }
}
