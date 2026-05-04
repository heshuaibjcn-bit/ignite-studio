/**
 * Batch Episodes Save API
 * PUT — batch save/update episodes for a project's production.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { episodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { nanoid } from 'nanoid';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { production_id, episodes: eps } = body;

    if (!production_id) return apiError('MISSING_PARAM', 'production_id is required', 400);
    if (!Array.isArray(eps)) return apiError('MISSING_PARAM', 'episodes array is required', 400);

    const db = getDb();
    const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    let created = 0;
    let updated = 0;

    for (const ep of eps) {
      if (ep.id) {
        // Update existing episode
        const rows = await db.select().from(episodes).where(eq(episodes.id, ep.id));
        if (rows.length > 0) {
          const updates: Record<string, unknown> = { updatedAt: ts };
          if (ep.title) updates.title = ep.title;
          if (ep.content) updates.content = ep.content;
          if (ep.script_content !== undefined) updates.scriptContent = ep.script_content;
          if (ep.status) updates.status = ep.status;
          await db.update(episodes).set(updates).where(eq(episodes.id, ep.id));
          updated++;
        }
      } else {
        // Create new episode
        const epId = `ep_${nanoid(21)}`;
        await db.insert(episodes).values({
          id: epId,
          projectId,
          productionId: production_id,
          episodeNo: ep.episode_no ?? ep.episodeNo ?? 1,
          title: ep.title ?? '未命名',
          content: ep.content ?? '',
          scriptContent: ep.script_content ?? null,
          status: 'draft',
          createdAt: ts,
          updatedAt: ts,
        });
        created++;
      }
    }

    return apiSuccess({ created, updated, total: eps.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
