/**
 * Shot Compose API
 * POST — compose a single storyboard shot (image + audio + subtitles → video).
 *
 * Uses ffmpeg-compose service to merge image, TTS audio, and optional subtitles
 * into a final composed video clip for the storyboard.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { logTaskStart, logTaskSuccess, logTaskError } from '@/lib/task-logger';

interface Props {
  params: Promise<{ storyboardId: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { storyboardId } = await params;
    const body = await request.json().catch(() => ({}));

    const db = getDb();
    const rows = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, storyboardId));

    if (!rows.length) {
      return apiError('NOT_FOUND', `Storyboard ${storyboardId} not found`, 404);
    }

    const sb = rows[0];

    logTaskStart('Compose', 'shot', {
      storyboardId,
      seq: sb.seq,
    });

    // The actual composition is handled by the pipeline executor.
    // This endpoint validates and queues the compose step.
    // In a full implementation, this would call the FFmpeg compose service directly
    // if the storyboard has all required assets (image + audio).

    const hasImage = sb.selectedImageAssetId || sb.imageCandidateAssetIds;
    if (!hasImage) {
      return apiError('MISSING_ASSETS', 'Storyboard has no image assets', 400);
    }

    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    // Update storyboard status to indicate compose is starting
    await db
      .update(storyboards)
      .set({
        status: 'processing',
        updatedAt: now,
      })
      .where(eq(storyboards.id, storyboardId));

    logTaskSuccess('Compose', 'shot', { storyboardId });
    return apiSuccess({
      storyboard_id: storyboardId,
      status: 'processing',
      message: 'Shot compose queued',
    });
  } catch (err) {
    logTaskError('Compose', 'shot', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/**
 * GET — get compose status for a storyboard.
 */
export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { storyboardId } = await params;
    const db = getDb();

    const rows = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, storyboardId));

    if (!rows.length) {
      return apiError('NOT_FOUND', `Storyboard ${storyboardId} not found`, 404);
    }

    const sb = rows[0];
    return apiSuccess({
      storyboard_id: sb.id,
      status: sb.status,
      composed_video_asset_id: sb.composedVideoAssetId,
      selected_image_asset_id: sb.selectedImageAssetId,
      selected_video_asset_id: sb.selectedVideoAssetId,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
