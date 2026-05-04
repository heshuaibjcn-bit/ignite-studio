/**
 * Episode Video Merge API
 * POST — merge all storyboard videos for an episode into a single video.
 * GET  — get merge status for an episode.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { episodes, videoMerges } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { logTaskStart, logTaskSuccess, logTaskError } from '@/lib/task-logger';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = await db.select().from(episodes).where(eq(episodes.id, id));
    if (!rows.length) return apiError('NOT_FOUND', 'Episode not found', 404);

    const ep = rows[0];

    logTaskStart('MergeAPI', 'episode-merge', { episodeId: id });

    // Create merge record
    const mergeId = nanoid(12);
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    await db.insert(videoMerges).values({
      id: mergeId,
      episodeId: id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    logTaskSuccess('MergeAPI', 'episode-merge', { episodeId: id, mergeId });
    return apiSuccess({ merge_id: mergeId, status: 'pending' });
  } catch (err) {
    logTaskError('MergeAPI', 'episode-merge', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const merges = await db
      .select()
      .from(videoMerges)
      .where(eq(videoMerges.episodeId, id));

    if (!merges.length) {
      return apiSuccess(null);
    }

    const latest = merges[merges.length - 1];
    return apiSuccess({
      id: latest.id,
      episode_id: latest.episodeId,
      input_asset_ids: latest.inputAssetIds,
      output_asset_id: latest.outputAssetId,
      status: latest.status,
      error_code: latest.errorCode,
      error_message: latest.errorMessage,
      created_at: latest.createdAt,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
