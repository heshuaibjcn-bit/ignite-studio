/**
 * Image Generation Detail API
 * GET — get a specific image generation record.
 * DELETE — delete a specific image generation record.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { imageGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(imageGenerations).where(eq(imageGenerations.id, id));
    if (!rows.length) return apiError('NOT_FOUND', `Image generation ${id} not found`, 404);
    const r = rows[0];
    return apiSuccess({
      id: r.id,
      episode_id: r.episodeId,
      storyboard_id: r.storyboardId,
      target_type: r.targetType,
      target_id: r.targetId,
      prompt_text: r.promptText,
      provider: r.provider,
      model: r.model,
      asset_id: r.assetId,
      status: r.status,
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
    const rows = await db.select().from(imageGenerations).where(eq(imageGenerations.id, id));
    if (!rows.length) return apiError('NOT_FOUND', `Image generation ${id} not found`, 404);
    await db.delete(imageGenerations).where(eq(imageGenerations.id, id));
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
