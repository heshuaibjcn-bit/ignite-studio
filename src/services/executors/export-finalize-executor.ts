/**
 * Export Finalize Executor
 * Registers the final episode video and audio as assets, marks episode complete.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { AssetsRepository } from '@/db/repositories/assets.repository';
import { fileExists, getFullPath } from '../storage';
import { statSync } from 'fs';
import { logger } from '@/lib/logger';

export class ExportFinalizeExecutor implements StepExecutor {
  readonly stepCode = 'export_finalize';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const input = ctx.inputSnapshot as {
        episodeVideoPath?: string;
        projectId?: string;
        productionId?: string;
      } | undefined;

      if (!input?.episodeVideoPath) {
        return {
          status: 'failed',
          errorCode: 'MISSING_VIDEO',
          errorMessage: 'No episode video path for export',
        };
      }

      if (!fileExists(input.episodeVideoPath)) {
        return {
          status: 'failed',
          errorCode: 'FILE_NOT_FOUND',
          errorMessage: `Episode video not found: ${input.episodeVideoPath}`,
        };
      }

      const fullPath = getFullPath(input.episodeVideoPath);
      const stats = statSync(fullPath);

      // Register as asset
      const assetsRepo = new AssetsRepository();
      await assetsRepo.create({
        projectId: input.projectId ?? undefined,
        productionId: input.productionId ?? undefined,
        type: 'video',
        sourceType: 'generated',
        title: `Episode ${ctx.bizId}`,
        mimeType: 'video/mp4',
        sizeBytes: stats.size,
        localPath: fullPath,
      });

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, path: input.episodeVideoPath }, 'Export finalized');

      return {
        status: 'succeeded',
        outputSnapshot: {
          localPath: input.episodeVideoPath,
          sizeBytes: stats.size,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Export finalize failed');
      return {
        status: 'failed',
        errorCode: 'EXPORT_FAILED',
        errorMessage: message,
      };
    }
  }
}
