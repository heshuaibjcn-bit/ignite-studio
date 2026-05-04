import { NextRequest } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { DRAMA_PIPELINE_DEFINITIONS } from '@/constants/step';
import { apiError, apiInternalError, apiSuccess } from '@/lib/api-response';
import { nanoid } from 'nanoid';

/**
 * POST /api/v1/drama/run
 * Creates a drama pipeline job for an episode.
 *
 * Body: { episodeId: string }
 * Validates episode exists and is in a runnable state.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId } = body;

    if (!episodeId) {
      return apiError('VALIDATION_FAILED', 'episodeId is required', 400);
    }

    // Validate episode exists
    const episodesRepo = new EpisodesRepository();
    const episode = await episodesRepo.findById(episodeId);
    if (!episode) {
      return apiError('NOT_FOUND', `Episode ${episodeId} not found`, 404);
    }

    // Validate episode is in a runnable state
    const nonRunnable = ['processing', 'completed'];
    if (nonRunnable.includes(episode.status)) {
      return apiError(
        'INVALID_STATE',
        `Episode is in status: ${episode.status}. Must be draft, ready, failed, or partial_ready.`,
        409,
      );
    }

    const taskCenter = new TaskCenterRepository();
    const jobId = `job_${nanoid(21)}`;

    const detail = await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: episodeId,
      runType: 'pipeline',
      triggerSource: 'user',
      projectId: episode.projectId,
      productionId: episode.productionId,
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    // Link episode to the job
    await episodesRepo.setCurrentJob(episodeId, jobId);
    await episodesRepo.update(episodeId, { status: 'processing' });

    return apiSuccess({
      job_id: jobId,
      biz_id: episodeId,
      status: detail?.job.status ?? 'queued',
      step_count: detail?.steps.length ?? 0,
    }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
