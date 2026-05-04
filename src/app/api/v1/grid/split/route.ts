/**
 * Grid Split API
 * POST — split a completed grid image into individual cells and assign to storyboards.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { imageGenerations, storyboards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { splitGridImage } from '@/services/grid-split';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      image_generation_id,
      rows,
      cols,
      assignments, // [{storyboard_id, frame_type: 'first_frame'|'last_frame'|'reference'}]
    } = body;

    if (!image_generation_id) {
      return apiError('MISSING_PARAMS', 'image_generation_id required', 400);
    }
    if (!rows || !cols) return apiError('MISSING_PARAMS', 'rows and cols required', 400);
    if (!assignments?.length) {
      return apiError('MISSING_PARAMS', 'assignments required', 400);
    }

    const db = getDb();

    // Fetch image generation record
    const imgRows = await db
      .select()
      .from(imageGenerations)
      .where(eq(imageGenerations.id, image_generation_id));

    if (!imgRows.length) {
      return apiError('NOT_FOUND', 'Image generation not found', 404);
    }

    const imgRecord = imgRows[0];
    if (imgRecord.status !== 'completed') {
      return apiError('INVALID_STATE', `Image status: ${imgRecord.status}, expected completed`, 400);
    }
    if (!imgRecord.assetId) {
      return apiError('INVALID_STATE', 'No asset path for this image generation', 400);
    }

    // Split the grid image
    const cells = await splitGridImage(imgRecord.assetId, rows, cols);

    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    const results: Array<{
      storyboard_id: string;
      frame_type: string;
      local_path: string;
    }> = [];

    for (let i = 0; i < assignments.length && i < cells.length; i++) {
      const { storyboard_id, frame_type } = assignments[i];
      const cell = cells[i];
      if (!storyboard_id) continue;

      const updateData: Record<string, unknown> = { updatedAt: now };

      if (frame_type === 'first_frame' || frame_type === 'reference') {
        updateData.selectedImageAssetId = cell.localPath;
      }

      // For last_frame, could store as a separate asset
      if (frame_type === 'last_frame') {
        // Add to image candidates
        const sbRows = await db
          .select()
          .from(storyboards)
          .where(eq(storyboards.id, storyboard_id));
        const existing = sbRows[0]?.imageCandidateAssetIds as string[] | null;
        const candidates = Array.isArray(existing) ? [...existing] : [];
        candidates.push(cell.localPath);
        updateData.imageCandidateAssetIds = JSON.stringify(candidates);
      }

      await db
        .update(storyboards)
        .set(updateData)
        .where(eq(storyboards.id, storyboard_id));

      results.push({
        storyboard_id,
        frame_type: frame_type || 'first_frame',
        local_path: cell.localPath,
      });
    }

    logger.info(
      {
        image_generation_id,
        rows,
        cols,
        assignedCount: results.length,
      },
      'Grid image split and assigned',
    );

    return apiSuccess({ cells: results });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : 'Unknown' }, 'Grid split error');
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
