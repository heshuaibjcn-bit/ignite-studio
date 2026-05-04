/**
 * Episode Compose Status API
 * GET — returns compose progress for all storyboards in an episode.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';

interface Props {
  params: Promise<{ episodeId: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { episodeId } = await params;
    const db = getDb();

    const shots = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.episodeId, episodeId));

    const total = shots.length;
    const completed = shots.filter((s) => s.composedVideoAssetId).length;
    const failed = shots.filter((s) => s.status === 'failed').length;
    const processing = shots.filter((s) => s.status === 'processing').length;
    const idle = total - completed - failed - processing;

    const details = shots.map((s) => ({
      id: s.id,
      seq: s.seq,
      title: s.title,
      status: s.status,
      has_composed_video: !!s.composedVideoAssetId,
      has_image: !!s.selectedImageAssetId,
      has_video: !!s.selectedVideoAssetId,
      error_message: s.errorMessage,
    }));

    return apiSuccess({
      total,
      completed,
      failed,
      processing,
      idle,
      details,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
