/**
 * Episode Merge Executor
 * Merges all composed shots into a single episode video.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';
import { mergeEpisode } from '../ffmpeg-compose';
import { logger } from '@/lib/logger';

export class EpisodeMergeExecutor extends BaseStepExecutor {
  readonly stepCode = 'episode_merge';
  readonly timeoutMs = 10 * 60 * 1000; // 10 min for episode merge

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    const input = ctx.inputSnapshot as {
      shotPaths?: string[];
    } | undefined;

    if (!input?.shotPaths || input.shotPaths.length === 0) {
      return {
        status: 'failed',
        errorCode: 'MISSING_SHOTS',
        errorMessage: 'No shot paths provided for episode merge',
      };
    }

    logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, shotCount: input.shotPaths.length }, 'Merging episode');

    const localPath = await mergeEpisode({ shotPaths: input.shotPaths });

    return {
      status: 'succeeded',
      outputSnapshot: { localPath },
    };
  }
}
