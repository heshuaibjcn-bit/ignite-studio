import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/projects/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repo = new ProjectsRepository();
    const project = await repo.findById(id);
    if (!project) return apiNotFound('Project', id);
    return apiSuccess({ project });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** PATCH /api/v1/projects/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const repo = new ProjectsRepository();
    const project = await repo.update(id, body);
    if (!project) return apiNotFound('Project', id);
    return apiSuccess({ project });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** DELETE /api/v1/projects/[id] — soft delete by setting status to 'deleted' */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(projects).where(eq(projects.id, id));
    if (!rows.length) return apiNotFound('Project', id);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await db.update(projects).set({ status: 'deleted', updatedAt: now }).where(eq(projects.id, id));
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
