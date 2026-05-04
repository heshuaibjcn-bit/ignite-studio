/**
 * Scene Image Generate Executor
 * Generates scene reference images using the image generation service.
 * Fan-out step — runs per scene.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { generateImage } from '../image-generation';
import { getDb } from '@/db/client';
import { scenes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export class SceneImageGenerateExecutor implements StepExecutor {
  readonly stepCode = 'scene_image_generate';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // This is a fan-out step, ctx.bizId should be the scene ID
      const db = getDb();
      const sceneRows = await db.select().from(scenes).where(eq(scenes.id, ctx.bizId));

      if (sceneRows.length === 0) {
        return {
          status: 'failed',
          errorCode: 'SCENE_NOT_FOUND',
          errorMessage: `Scene ${ctx.bizId} not found`,
        };
      }

      const scene = sceneRows[0];

      // Build prompt from scene description
      const promptParts = [
        scene.locationDesc,
        scene.timeDesc,
        scene.styleDesc,
      ].filter(Boolean);

      const prompt = promptParts.join(', ');

      if (!prompt) {
        return {
          status: 'failed',
          errorCode: 'MISSING_SCENE_DESCRIPTION',
          errorMessage: `Scene ${scene.id} has no description`,
        };
      }

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, sceneId: scene.id }, 'Generating scene image');

      const result = await generateImage({
        id: ctx.stepId,
        prompt,
        size: '1024x1024',
      });

      // Update scene with image path
      const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      await db.update(scenes)
        .set({ imageAssetId: result.localPath, updatedAt: now })
        .where(eq(scenes.id, scene.id));

      return {
        status: 'succeeded',
        outputSnapshot: {
          localPath: result.localPath,
          width: result.width,
          height: result.height,
          sceneId: scene.id,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Scene image generation failed');
      return {
        status: 'failed',
        errorCode: 'IMAGE_GENERATION_FAILED',
        errorMessage: message,
      };
    }
  }
}
