/**
 * Storyboard CRUD — PUT and DELETE
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards, storyboardCharacters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

interface Props {
  params: Promise<{ id: string }>;
}

/** PUT /api/v1/storyboards/[id] — update a storyboard */
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const rows = await db.select().from(storyboards).where(eq(storyboards.id, id));
    if (!rows.length) return apiError('NOT_FOUND', 'Storyboard not found', 404);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const updates: Record<string, unknown> = { updatedAt: now };

    // Map all updatable fields
    for (const [key, col] of Object.entries({
      title: storyboards.title,
      shotType: storyboards.shotType,
      visualDesc: storyboards.visualDesc,
      dialogue: storyboards.dialogue,
      actionDesc: storyboards.actionDesc,
      durationSec: storyboards.durationSec,
      sceneId: storyboards.sceneId,
      promptText: storyboards.promptText,
      selectedImageAssetId: storyboards.selectedImageAssetId,
      selectedVideoAssetId: storyboards.selectedVideoAssetId,
      composedVideoAssetId: storyboards.composedVideoAssetId,
      status: storyboards.status,
    })) {
      if (key in body) updates[key] = body[key];
    }

    // Reset TTS audio if dialogue changed
    if ('dialogue' in body) {
      updates.ttsAudioAssetId = null;
    }

    // Handle image/video candidate arrays
    if (body.image_candidate_asset_ids !== undefined) {
      updates.imageCandidateAssetIds = JSON.stringify(body.image_candidate_asset_ids);
    }
    if (body.video_candidate_asset_ids !== undefined) {
      updates.videoCandidateAssetIds = JSON.stringify(body.video_candidate_asset_ids);
    }

    await db.update(storyboards).set(updates).where(eq(storyboards.id, id));

    // Sync character associations if provided
    if (Array.isArray(body.character_ids)) {
      await db.delete(storyboardCharacters).where(eq(storyboardCharacters.storyboardId, id));
      const charIds = (body.character_ids as unknown[]).filter((v): v is string => typeof v === 'string' && !!v);
      const uniqueIds = [...new Set(charIds)];
      for (const characterId of uniqueIds) {
        await db.insert(storyboardCharacters).values({ storyboardId: id, characterId });
      }
    }

    logger.info({ storyboardId: id }, 'Storyboard updated');
    return apiSuccess({ updated: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** DELETE /api/v1/storyboards/[id] — delete a storyboard */
export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = await db.select().from(storyboards).where(eq(storyboards.id, id));
    if (!rows.length) return apiError('NOT_FOUND', 'Storyboard not found', 404);

    // Delete character links first
    await db.delete(storyboardCharacters).where(eq(storyboardCharacters.storyboardId, id));
    // Delete storyboard
    await db.delete(storyboards).where(eq(storyboards.id, id));

    logger.info({ storyboardId: id }, 'Storyboard deleted');
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
