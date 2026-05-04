import { NextRequest } from 'next/server';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';

/** POST /api/v1/projects — create project */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return apiError('VALIDATION_FAILED', 'name is required', 400);
    }

    const repo = new ProjectsRepository();
    const project = await repo.create({
      name: body.name,
      description: body.description,
      category: body.category,
      coverAssetId: body.coverAssetId,
      defaultVoiceId: body.defaultVoiceId,
      ownerId: body.ownerId,
    });

    return apiSuccess({ project }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** GET /api/v1/projects — list projects */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const repo = new ProjectsRepository();
    const projects = await repo.list({
      status: searchParams.get('status') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? '20', 10),
      offset: parseInt(searchParams.get('offset') ?? '0', 10),
    });

    return apiSuccess({ projects, count: projects.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
