/**
 * Video Generation Detail API
 * GET — get a specific video generation record.
 * DELETE — delete a specific video generation record.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { videoGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(videoGenerations).where(eq(videoGenerations.id, id));
    if (!rows.length) return apiError('NOT_FOUND', `Video generation ${id} not found`, 404);
    const r = rows[0];
    return apiSuccess({
      id: r.id,
      episode_id: r.episodeId,
      storyboard_id: r.storyboardId,
      image_asset_id: r.imageAssetId,
      prompt_text: r.promptText,
      provider: r.provider,
      model: r.model,
      asset_id: r.assetId,
      status: r.status,
      duration_ms: r.durationMs,
      error_code: r.errorCode,
      error_message: r.errorMessage,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(videoGenerations).where(eq(videoGenerations.id, id));
    if (!rows.length) return apiError('NOT_FOUND', `Video generation ${id} not found`, 404);
    await db.delete(videoGenerations).where(eq(videoGenerations.id, id));
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
