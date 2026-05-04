import { NextRequest } from 'next/server';
import { ProductionsRepository } from '@/db/repositories/productions.repository';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/productions/[id]/episodes */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const repo = new EpisodesRepository();
    const episodes = await repo.listByProductionId(id, {
      status: searchParams.get('status') ?? undefined,
    });
    return apiSuccess({ episodes, count: episodes.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** POST /api/v1/productions/[id]/episodes */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.episodeNo || !body.title || !body.content) {
      return apiError('VALIDATION_FAILED', 'episodeNo, title, and content are required', 400);
    }

    const productionsRepo = new ProductionsRepository();
    const production = await productionsRepo.findById(id);
    if (!production) return apiNotFound('Production', id);

    const episodesRepo = new EpisodesRepository();
    const episode = await episodesRepo.create({
      projectId: production.projectId,
      productionId: id,
      episodeNo: body.episodeNo,
      title: body.title,
      content: body.content,
      scriptContent: body.scriptContent,
      configSnapshot: body.configSnapshot,
    });

    return apiSuccess({ episode }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
