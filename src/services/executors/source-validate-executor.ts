/**
 * Source validate executor — validates that the episode and its content exist.
 * Phase 2: real validation against the database.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';

export class SourceValidateExecutor extends BaseStepExecutor {
  readonly stepCode = 'source_validate';
  readonly timeoutMs = 2 * 60 * 1000; // 2 min

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    const episodesRepo = new EpisodesRepository();
    const episode = await episodesRepo.findById(ctx.bizId);

    if (!episode) {
      return {
        status: 'failed',
        errorCode: 'ASSET_MISSING',
        errorMessage: `Episode ${ctx.bizId} not found`,
      };
    }

    if (!episode.content || episode.content.trim().length === 0) {
      return {
        status: 'failed',
        errorCode: 'VALIDATION_FAILED',
        errorMessage: `Episode ${ctx.bizId} has no content`,
      };
    }

    return {
      status: 'succeeded',
      outputSnapshot: {
        stepCode: ctx.stepCode,
        episodeId: ctx.bizId,
        projectId: episode.projectId,
        episodeNo: episode.episodeNo,
        title: episode.title,
        validatedAt: new Date().toISOString(),
      },
    };
  }
}
