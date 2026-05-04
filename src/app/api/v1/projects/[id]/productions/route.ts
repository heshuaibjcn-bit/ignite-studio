import { NextRequest } from 'next/server';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { ProductionsRepository } from '@/db/repositories/productions.repository';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/projects/[id]/productions */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const repo = new ProductionsRepository();
    const productions = await repo.listByProjectId(id, {
      status: searchParams.get('status') ?? undefined,
      mode: searchParams.get('mode') ?? undefined,
    });
    return apiSuccess({ productions, count: productions.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** POST /api/v1/projects/[id]/productions */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.mode || !body.name) {
      return apiError('VALIDATION_FAILED', 'mode and name are required', 400);
    }

    const projectsRepo = new ProjectsRepository();
    const project = await projectsRepo.findById(id);
    if (!project) return apiNotFound('Project', id);

    const productionsRepo = new ProductionsRepository();
    const production = await productionsRepo.create({
      projectId: id,
      mode: body.mode,
      name: body.name,
      description: body.description,
      configSnapshot: body.configSnapshot,
      templateIds: body.templateIds,
      defaultVoiceId: body.defaultVoiceId,
      ownerId: body.ownerId,
    });

    return apiSuccess({ production }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
