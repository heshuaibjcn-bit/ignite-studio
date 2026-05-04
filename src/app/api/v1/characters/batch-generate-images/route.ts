/**
 * Batch Character Image Generation API
 * POST — generate portrait images for multiple characters.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { characters, imageGenerations } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { logTaskSuccess } from '@/lib/task-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.character_ids || [];

    if (!ids.length) {
      return apiError('MISSING_PARAMS', 'character_ids required', 400);
    }

    const db = getDb();
    const charRows = await db
      .select()
      .from(characters)
      .where(inArray(characters.id, ids));

    const results: string[] = [];
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    for (const char of charRows) {
      const prompt = `${char.name}, ${char.appearancePrompt || char.description || '人物立绘'}, 高质量, 正面, 白色背景`;
      try {
        const genId = nanoid(12);
        await db.insert(imageGenerations).values({
          id: genId,
          projectId: char.projectId,
          targetType: 'character',
          targetId: char.id,
          promptText: prompt,
          status: 'queued',
          createdAt: now,
          updatedAt: now,
        });
        results.push(genId);
      } catch {
        // Skip failed individual generations
      }
    }

    logTaskSuccess('CharacterImage', 'batch-generate', {
      requested: ids.length,
      started: results.length,
    });

    return apiSuccess({ count: results.length, ids: results });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
