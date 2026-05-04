/**
 * Grid Generate API
 * POST — generate a grid image using configured image provider.
 *
 * Creates an image generation record and triggers async generation.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards, imageGenerations } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import {
  collectGridReferenceAssets,
  buildReferenceLegend,
} from '@/lib/storyboard-references';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storyboard_ids,
      episode_id,
      project_id,
      rows,
      cols,
      mode = 'first_frame',
      custom_prompt,
    } = body;

    if (!storyboard_ids?.length) {
      return apiError('MISSING_PARAMS', 'storyboard_ids required', 400);
    }
    if (!rows || !cols) return apiError('MISSING_PARAMS', 'rows and cols required', 400);
    if (!episode_id) return apiError('MISSING_PARAMS', 'episode_id required', 400);

    const db = getDb();

    // Fetch storyboards
    const shotRows = await db
      .select()
      .from(storyboards)
      .where(inArray(storyboards.id, storyboard_ids));

    if (!shotRows.length) {
      return apiError('NOT_FOUND', 'No storyboards found', 404);
    }

    // Build prompt (custom or auto)
    const referenceAssets = await collectGridReferenceAssets(shotRows);
    const referenceImages = referenceAssets.map((a) => a.path);

    let prompt = custom_prompt;
    if (!prompt) {
      const totalCells = rows * cols;
      const legend = buildReferenceLegend(referenceAssets);
      const descriptions = shotRows.map((sb) => sb.visualDesc).join(' | ');
      prompt = [
        `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality,`,
        legend ? `参考图映射：${legend}` : '',
        descriptions,
        'high quality, cinematic lighting, same color palette, no merged panels, no missing panels, no text, no watermark',
      ].filter(Boolean).join('\n');
    }

    // Calculate grid image size
    const cellW = 960;
    const cellH = 540;
    const width = cellW * cols;
    const height = cellH * rows;

    // Create image generation record
    const genId = nanoid(12);
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    await db.insert(imageGenerations).values({
      id: genId,
      projectId: project_id || null,
      episodeId: episode_id,
      targetType: 'grid',
      promptText: prompt,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    });

    logger.info(
      {
        genId,
        episode_id,
        mode,
        rows,
        cols,
        referenceCount: referenceImages.length,
      },
      'Grid image generation queued',
    );

    return apiSuccess({
      image_generation_id: genId,
      grid: { rows, cols },
      mode,
      storyboard_ids,
      prompt,
      reference_images: referenceImages,
      width,
      height,
    });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : 'Unknown' }, 'Grid generate error');
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
