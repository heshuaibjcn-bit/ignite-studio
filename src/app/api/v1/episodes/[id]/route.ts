import { NextRequest } from 'next/server';
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
