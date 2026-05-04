/**
 * Frame Image Generate Executor
 * Generates frame images for each storyboard using the image generation service.
 * This is a fan-out step — runs per storyboard.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { generateImage } from '../image-generation';
import { logger } from '@/lib/logger';

export class FrameImageGenerateExecutor implements StepExecutor {
  readonly stepCode = 'frame_image_generate';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const input = ctx.inputSnapshot as {
        prompt?: string;
        storyboardId?: string;
        referenceImages?: string[];
      } | undefined;

      if (!input?.prompt) {
        return {
          status: 'failed',
          errorCode: 'MISSING_PROMPT',
          errorMessage: 'No image prompt provided for frame generation',
        };
      }

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, storyboardId: input.storyboardId }, 'Generating frame image');

      const result = await generateImage({
        id: ctx.stepId,
        prompt: input.prompt,
        size: '1024x1024',
        referenceImages: input.referenceImages,
      });

      return {
        status: 'succeeded',
        outputSnapshot: {
          localPath: result.localPath,
          width: result.width,
          height: result.height,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Frame image generation failed');
      return {
        status: 'failed',
        errorCode: 'IMAGE_GENERATION_FAILED',
        errorMessage: message,
      };
    }
  }
}
