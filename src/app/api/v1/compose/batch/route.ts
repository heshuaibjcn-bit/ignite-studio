/**
 * Batch Compose API
 * POST — compose multiple storyboard shots in sequence.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { logTaskStart, logTaskSuccess } from '@/lib/task-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboard_ids } = body;

    if (!storyboard_ids?.length) {
      return apiError('MISSING_PARAMS', 'storyboard_ids required', 400);
    }

    const db = getDb();
    const shots = await db
      .select()
      .from(storyboards)
      .where(inArray(storyboards.id, storyboard_ids));

    if (!shots.length) {
      return apiError('NOT_FOUND', 'No storyboards found', 404);
    }

    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    // Queue all valid storyboards for composition
    const validShots = shots.filter(
      (sb) => sb.selectedImageAssetId || sb.imageCandidateAssetIds,
    );

    for (const sb of validShots) {
      await db
        .update(storyboards)
        .set({ status: 'processing', updatedAt: now })
        .where(eq(storyboards.id, sb.id));
    }

    logTaskStart('Compose', 'batch', {
      requested: storyboard_ids.length,
      valid: validShots.length,
    });

    logTaskSuccess('Compose', 'batch', {
      requested: storyboard_ids.length,
      queued: validShots.length,
    });

    return apiSuccess({
      total: storyboard_ids.length,
      queued: validShots.length,
      skipped: shots.length - validShots.length,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

