/**
 * Video Generate Executor
 * Generates video for each storyboard using the video generation service.
 * Fan-out step — runs per storyboard.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';
import { generateVideo } from '../video-generation';
import { logger } from '@/lib/logger';

export class VideoGenerateExecutor extends BaseStepExecutor {
  readonly stepCode = 'video_generate';
  readonly timeoutMs = 25 * 60 * 1000; // 25 min for video generation + polling

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    const input = ctx.inputSnapshot as {
      prompt?: string;
      imageUrl?: string;
      storyboardId?: string;
    } | undefined;

    if (!input?.prompt) {
      return {
        status: 'failed',
        errorCode: 'MISSING_PROMPT',
        errorMessage: 'No video prompt provided',
      };
    }

    logger.info({ stepCode: this.stepCode, jobId: ctx.jobId }, 'Generating video');

    const result = await generateVideo({
      id: ctx.stepId,
      prompt: input.prompt,
      referenceMode: input.imageUrl ? 'single' : 'none',
      imageUrl: input.imageUrl,
    });

    return {
      status: 'succeeded',
      outputSnapshot: { localPath: result.localPath },
    };
  }
}
