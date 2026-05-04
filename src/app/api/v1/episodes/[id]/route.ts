import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { episodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { StoryboardsRepository } from '@/db/repositories/storyboards.repository';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/episodes/[id] — returns episode with storyboards */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const episodesRepo = new EpisodesRepository();
    const episode = await episodesRepo.findById(id);
    if (!episode) return apiNotFound('Episode', id);

    const storyboardsRepo = new StoryboardsRepository();
    const storyboards = await storyboardsRepo.listByEpisodeId(id);

    return apiSuccess({ episode, storyboards });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** PUT /api/v1/episodes/[id] — update episode fields */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const rows = await db.select().from(episodes).where(eq(episodes.id, id));
    if (!rows.length) return apiNotFound('Episode', id);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const updates: Record<string, unknown> = { updatedAt: now };

    const fieldMap: Record<string, string> = {
      title: 'title',
      content: 'content',
      script_content: 'scriptContent',
      status: 'status',
    };
    for (const [bodyKey, colKey] of Object.entries(fieldMap)) {
      if (bodyKey in body) updates[colKey] = body[bodyKey];
    }

    await db.update(episodes).set(updates).where(eq(episodes.id, id));
    return apiSuccess({ updated: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
