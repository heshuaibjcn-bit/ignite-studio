/**
 * Scenes List API
 * GET — list scenes, optionally filtered by project_id.
 * POST — create a new scene.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { scenes, episodeScenes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const episodeId = searchParams.get('episode_id');

    const db = getDb();

    if (episodeId) {
      // Get scenes linked to an episode
      const links = await db.select().from(episodeScenes).where(eq(episodeScenes.episodeId, episodeId));
      const sceneIds = links.map(l => l.sceneId);
      if (sceneIds.length === 0) return apiSuccess({ scenes: [], count: 0 });
      // Batch fetch — for SQLite, simple loop
      const allScenes = await db.select().from(scenes);
      const filtered = allScenes.filter(s => sceneIds.includes(s.id));
      const results = filtered.map(s => ({
        id: s.id,
        project_id: s.projectId,
        name: s.name,
        location_desc: s.locationDesc,
        time_desc: s.timeDesc,
        style_desc: s.styleDesc,
        image_asset_id: s.imageAssetId,
        created_at: s.createdAt,
      }));
      return apiSuccess({ scenes: results, count: results.length });
    }

    if (!projectId) return apiError('MISSING_PARAM', 'project_id or episode_id is required', 400);

    const allScenes = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
    const results = allScenes.map(s => ({
      id: s.id,
      project_id: s.projectId,
      name: s.name,
      location_desc: s.locationDesc,
      time_desc: s.timeDesc,
      style_desc: s.styleDesc,
      image_asset_id: s.imageAssetId,
      created_at: s.createdAt,
    }));
    return apiSuccess({ scenes: results, count: results.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, episode_id, name, location_desc, time_desc, style_desc } = body;

    if (!project_id || !name) return apiError('MISSING_PARAM', 'project_id and name are required', 400);

    const db = getDb();
    const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const id = `scene_${nanoid(21)}`;

    await db.insert(scenes).values({
      id,
      projectId: project_id,
      name,
      locationDesc: location_desc ?? null,
      timeDesc: time_desc ?? null,
      styleDesc: style_desc ?? null,
      createdAt: ts,
      updatedAt: ts,
    });

    // Link to episode if provided
    if (episode_id) {
      await db.insert(episodeScenes).values({
        id: `es_${nanoid(21)}`,
        episodeId: episode_id,
        sceneId: id,
        createdAt: ts,
      });
    }

    return apiSuccess({ id, created: true }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
