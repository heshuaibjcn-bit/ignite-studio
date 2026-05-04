import { NextRequest } from 'next/server';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { StoryboardsRepository } from '@/db/repositories/storyboards.repository';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/episodes/[id]/storyboards */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repo = new StoryboardsRepository();
    const storyboards = await repo.listByEpisodeId(id);
    return apiSuccess({ storyboards, count: storyboards.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** POST /api/v1/episodes/[id]/storyboards */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.visualDesc) {
      return apiError('VALIDATION_FAILED', 'visualDesc is required', 400);
    }

    const episodesRepo = new EpisodesRepository();
    const episode = await episodesRepo.findById(id);
    if (!episode) return apiNotFound('Episode', id);

    const storyboardsRepo = new StoryboardsRepository();
    // Default seq to next available
    const existing = await storyboardsRepo.listByEpisodeId(id);
    const seq = body.seq ?? existing.length + 1;

    const storyboard = await storyboardsRepo.create({
      episodeId: id,
      seq,
      title: body.title,
      shotType: body.shotType,
      visualDesc: body.visualDesc,
      dialogue: body.dialogue,
      actionDesc: body.actionDesc,
      durationSec: body.durationSec,
      sceneId: body.sceneId,
      promptText: body.promptText,
    });

    return apiSuccess({ storyboard }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
