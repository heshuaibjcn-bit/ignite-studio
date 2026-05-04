/**
 * Character Image Generate Executor
 * Generates character reference images using the image generation service.
 * Fan-out step — runs per character.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { generateImage } from '../image-generation';
import { getDb } from '@/db/client';
import { characters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export class CharacterImageGenerateExecutor implements StepExecutor {
  readonly stepCode = 'character_image_generate';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // This is a fan-out step, ctx.bizId should be the character ID
      const db = getDb();
      const charRows = await db.select().from(characters).where(eq(characters.id, ctx.bizId));

      if (charRows.length === 0) {
        return {
          status: 'failed',
          errorCode: 'CHARACTER_NOT_FOUND',
          errorMessage: `Character ${ctx.bizId} not found`,
        };
      }

      const character = charRows[0];
      const prompt = character.appearancePrompt || character.description;

      if (!prompt) {
        return {
          status: 'failed',
          errorCode: 'MISSING_APPEARANCE_PROMPT',
          errorMessage: `Character ${character.id} has no appearance prompt or description`,
        };
      }

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, characterId: character.id }, 'Generating character image');

      const result = await generateImage({
        id: ctx.stepId,
        prompt,
        size: '1024x1024',
      });

      // Update character with image path
      const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      await db.update(characters)
        .set({ imageAssetId: result.localPath, updatedAt: now })
        .where(eq(characters.id, character.id));

      return {
        status: 'succeeded',
        outputSnapshot: {
          localPath: result.localPath,
          width: result.width,
          height: result.height,
          characterId: character.id,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Character image generation failed');
      return {
        status: 'failed',
        errorCode: 'IMAGE_GENERATION_FAILED',
        errorMessage: message,
      };
    }
  }
}
