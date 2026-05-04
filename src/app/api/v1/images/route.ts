/**
 * Image Generations API
 * GET — list image generation records, optionally filtered.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { imageGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiInternalError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');
    const storyboardId = searchParams.get('storyboard_id');
    const targetType = searchParams.get('target_type');
    const status = searchParams.get('status');

    const db = getDb();

    // Build query with filters
    let query = db.select().from(imageGenerations).$dynamic();

    // Apply filters — simple approach: fetch and filter in-memory for SQLite
    const allRows = await db.select().from(imageGenerations);

    let filtered = allRows;
    if (episodeId) filtered = filtered.filter((r) => r.episodeId === episodeId);
    if (storyboardId) filtered = filtered.filter((r) => r.storyboardId === storyboardId);
    if (targetType) filtered = filtered.filter((r) => r.targetType === targetType);
    if (status) filtered = filtered.filter((r) => r.status === status);

    // Limit to 200
    const results = filtered.slice(0, 200).map((r) => ({
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
      created_at: r.createdAt,
    }));

    return apiSuccess({ images: results, count: results.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
