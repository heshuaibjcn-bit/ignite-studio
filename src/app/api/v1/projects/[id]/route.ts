import { NextRequest } from 'next/server';
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
