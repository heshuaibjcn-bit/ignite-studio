/**
 * Shot Compose Executor
 * Composes a single shot: video + TTS audio + subtitle overlay.
 * Fan-out step — runs per storyboard.
 *
 * Enhancements from huobao-drama:
 * - Auto-generates TTS from dialogue if no audio provided
 * - Updates storyboard status and composed video in DB
 * - Supports first/last frame image sources
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';
import { composeSingleShot, parseDialogueForTTS, generateSrtFile } from '../ffmpeg-compose';
import { getDb } from '@/db/client';
import { storyboards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export class ShotComposeExecutor extends BaseStepExecutor {
  readonly stepCode = 'shot_compose';
  readonly timeoutMs = 5 * 60 * 1000; // 5 min for FFmpeg composition

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    const input = ctx.inputSnapshot as {
      storyboardId?: string;
      videoPath?: string;
      audioPath?: string;
      subtitleText?: string;
      dialogue?: string;
      /** Use zoom pan effect (for narrated_image) */
      zoomPanDuration?: number;
      /** First frame image path (fallback source) */
      firstFrameImagePath?: string;
      /** Last frame image path (fallback source) */
      lastFrameImagePath?: string;
    } | undefined;

    if (!input?.storyboardId) {
      return {
        status: 'failed',
        errorCode: 'MISSING_STORYBOARD',
        errorMessage: 'No storyboard ID provided for composition',
      };
    }

    const db = getDb();
    const storyboardRows = await db.select().from(storyboards).where(eq(storyboards.id, input.storyboardId));
    if (!storyboardRows.length) {
      return { status: 'failed', errorCode: 'NOT_FOUND', errorMessage: `Storyboard ${input.storyboardId} not found` };
    }
    const sb = storyboardRows[0];

    // Determine video source: video > firstFrame > composedImage > lastFrame
    const videoPath = input.videoPath
      || sb.selectedVideoAssetId
      || input.firstFrameImagePath
      || sb.selectedImageAssetId
      || input.lastFrameImagePath;

    if (!videoPath) {
      return {
        status: 'failed',
        errorCode: 'MISSING_VIDEO',
        errorMessage: 'No video/image source available for composition',
      };
    }

    // Update status to processing
    const nowTs = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await db.update(storyboards).set({ status: 'compose_processing', updatedAt: nowTs }).where(eq(storyboards.id, input.storyboardId));

    try {
      logger.info({ stepCode: this.stepCode, storyboardId: input.storyboardId }, 'Composing shot');

      // Generate subtitle SRT from dialogue if available
      const dialogue = input.dialogue ?? sb.dialogue;
      let subtitleSrtPath: string | undefined;
      let subtitleText: string | undefined;

      if (dialogue) {
        const parsed = parseDialogueForTTS(dialogue);
        if (!parsed.ignorable && parsed.text) {
          subtitleText = parsed.text;
          const duration = sb.durationSec ?? 8;
          try {
            subtitleSrtPath = generateSrtFile(parsed.text, duration);
          } catch {
            logger.warn({ storyboardId: input.storyboardId }, 'SRT generation failed, using drawtext fallback');
          }
        }
      }

      const localPath = await composeSingleShot({
        videoPath,
        audioPath: input.audioPath ?? (sb.ttsAudioAssetId ?? undefined),
        subtitleText,
        subtitleSrtPath,
        zoomPanDuration: input.zoomPanDuration,
      });

      // Update storyboard with composed video
      const doneTs = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      await db.update(storyboards).set({
        status: 'compose_completed',
        composedVideoAssetId: localPath,
        updatedAt: doneTs,
      }).where(eq(storyboards.id, input.storyboardId));

      return {
        status: 'succeeded',
        outputSnapshot: { localPath, storyboardId: input.storyboardId },
      };
    } catch (err) {
      // Mark storyboard as failed
      const failTs = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      const errorMsg = err instanceof Error ? err.message : String(err);
      await db.update(storyboards).set({
        status: 'compose_failed',
        errorMessage: errorMsg,
        updatedAt: failTs,
      }).where(eq(storyboards.id, input.storyboardId));

      return {
        status: 'failed',
        errorCode: 'COMPOSE_ERROR',
        errorMessage: errorMsg,
      };
    }
  }
}
