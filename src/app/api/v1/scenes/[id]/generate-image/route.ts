/**
 * Scene Image Generation API
 * POST — generate a scene image using configured image provider.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { scenes, imageGenerations } from '@/db/schema';
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
    const rows = await db.select().from(scenes).where(eq(scenes.id, id));
    if (!rows.length) return apiError('NOT_FOUND', 'Scene not found', 404);

    const scene = rows[0];
    const prompt = body.prompt ||
      scene.styleDesc ||
      `${scene.locationDesc || scene.name}, ${scene.timeDesc || ''}, 高质量场景, 电影感`;

    logTaskStart('SceneImage', 'generate', {
      sceneId: id,
      sceneName: scene.name,
    });

    const genId = nanoid(12);
    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    await db.insert(imageGenerations).values({
      id: genId,
      projectId: scene.projectId,
      targetType: 'scene',
      targetId: scene.id,
      promptText: prompt,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    });

    logTaskSuccess('SceneImage', 'generate', { sceneId: id, generationId: genId });
    return apiSuccess({ image_generation_id: genId });
  } catch (err) {
    logTaskError('SceneImage', 'generate', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
