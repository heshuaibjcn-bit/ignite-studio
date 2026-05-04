/**
 * Video Generations API
 * GET — list video generation records, optionally filtered.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { videoGenerations } from '@/db/schema';
import { apiSuccess, apiInternalError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');
    const storyboardId = searchParams.get('storyboard_id');
    const status = searchParams.get('status');

    const db = getDb();
    const allRows = await db.select().from(videoGenerations);

    let filtered = allRows;
    if (episodeId) filtered = filtered.filter((r) => r.episodeId === episodeId);
    if (storyboardId) filtered = filtered.filter((r) => r.storyboardId === storyboardId);
    if (status) filtered = filtered.filter((r) => r.status === status);

    const results = filtered.slice(0, 200).map((r) => ({
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
      created_at: r.createdAt,
    }));

    return apiSuccess({ videos: results, count: results.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
