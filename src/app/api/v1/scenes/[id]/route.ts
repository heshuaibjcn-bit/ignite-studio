/**
 * Scene Detail API
 * GET — get a scene by ID.
 * PUT — update a scene.
 * DELETE — delete a scene and its episode links.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { scenes, episodeScenes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(scenes).where(eq(scenes.id, id));
    if (!rows.length) return apiNotFound('Scene', id);
    const s = rows[0];
    return apiSuccess({
      id: s.id,
      project_id: s.projectId,
      name: s.name,
      location_desc: s.locationDesc,
      time_desc: s.timeDesc,
      style_desc: s.styleDesc,
      image_asset_id: s.imageAssetId,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const rows = await db.select().from(scenes).where(eq(scenes.id, id));
    if (!rows.length) return apiNotFound('Scene', id);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const updates: Record<string, unknown> = { updatedAt: now };

    const fieldMap: Record<string, string> = {
      name: 'name',
      location_desc: 'locationDesc',
      time_desc: 'timeDesc',
      style_desc: 'styleDesc',
      image_asset_id: 'imageAssetId',
    };
    for (const [bodyKey, colKey] of Object.entries(fieldMap)) {
      if (bodyKey in body) updates[colKey] = body[bodyKey];
    }

    await db.update(scenes).set(updates).where(eq(scenes.id, id));
    return apiSuccess({ updated: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = await db.select().from(scenes).where(eq(scenes.id, id));
    if (!rows.length) return apiNotFound('Scene', id);

    // Remove episode links
    await db.delete(episodeScenes).where(eq(episodeScenes.sceneId, id));
    // Delete scene
    await db.delete(scenes).where(eq(scenes.id, id));

    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
