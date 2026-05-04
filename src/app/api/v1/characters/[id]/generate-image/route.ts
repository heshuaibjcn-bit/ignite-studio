/**
 * Character Image Generation API
 * POST — generate a character portrait image.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { characters, imageGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { logTaskStart, logTaskSuccess, logTaskError } from '@/lib/task-logger';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const db = getDb();
    const rows = await db.select().from(characters).where(eq(characters.id, id));
    if (!rows.length) return apiError('NOT_FOUND', 'Character not found', 404);

    const char = rows[0];
    const prompt = body.prompt ||
      `${char.name}, ${char.appearancePrompt || char.description || '人物立绘'}, 高质量, 正面, 白色背景`;

    logTaskStart('CharacterImage', 'generate', {
      characterId: id,
      characterName: char.name,
    });

    // Create image generation record
    const genId = nanoid(12);
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

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

    logTaskSuccess('CharacterImage', 'generate', { characterId: id, generationId: genId });
    return apiSuccess({ image_generation_id: genId });
  } catch (err) {
    logTaskError('CharacterImage', 'generate', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
