/**
 * Video Generation Service
 * Manages async video generation with provider adapters.
 *
 * Supports standard polling-based providers and chat-based providers (Lovart).
 */
import { getActiveConfig } from './ai-config';
import { getVideoAdapter } from './adapters/registry';
import { downloadAndSave } from './storage';
import type { VideoGenerationParams, AIConfig } from './adapters/types';
import { LovartVideoAdapter } from './adapters/lovart-video';
import { getDb } from '@/db/client';
import { videoGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export interface VideoGenerateResult {
  localPath: string;
  durationMs?: number;
}

/**
 * Generate a video using the configured provider.
 * Supports polling-based providers and chat-based providers (Lovart).
 */
export async function generateVideo(params: VideoGenerationParams): Promise<VideoGenerateResult> {
  const config = await getActiveConfig('video');
  if (!config) {
    throw new Error('No active video provider configured');
  }

  // Lovart uses a chat-based workflow, not standard REST
  if (config.provider.toLowerCase() === 'lovart') {
    return generateVideoViaLovart(config, params);
  }

  const adapter = getVideoAdapter(config.provider);
  logger.info({ provider: config.provider, promptLength: params.prompt.length }, 'Video generation started');

  const request = adapter.buildGenerateRequest(config, params);
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Video API error ${response.status}: ${errorText}`);
  }

  const responseData = await response.json();
  const genResponse = adapter.parseGenerateResponse(responseData);

  if (!genResponse.taskId) {
    throw new Error('No task ID returned from video provider');
  }

  // Poll for completion
  const videoUrl = await pollForVideo(config.provider, config, genResponse.taskId, adapter);

  // Download and save locally
  const localPath = await downloadAndSave(videoUrl, 'videos', 'mp4');

  logger.info({ provider: config.provider, localPath }, 'Video generation completed');
  return { localPath };
}

/**
 * Generate video via Lovart chat-based workflow.
 */
async function generateVideoViaLovart(
  config: AIConfig,
  params: VideoGenerationParams,
): Promise<VideoGenerateResult> {
  const lovartAdapter = new LovartVideoAdapter();
  const { videoUrl } = await lovartAdapter.generateVideo(config, params);

  if (!videoUrl) {
    throw new Error('Lovart video generation produced no video URL');
  }

  const localPath = await downloadAndSave(videoUrl, 'videos', 'mp4');
  logger.info({ provider: 'lovart', localPath }, 'Video generation (Lovart) completed');
  return { localPath };
}

/**
 * Poll an async video generation task until completion.
 */
async function pollForVideo(
  provider: string,
  config: { provider: string; baseUrl: string; apiKey: string; model: string },
  taskId: string,
  adapter: ReturnType<typeof getVideoAdapter>,
  maxAttempts = 120,
  intervalMs = 10000,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const pollRequest = adapter.buildPollRequest(config, taskId);
    const response = await fetch(pollRequest.url, {
      method: pollRequest.method,
      headers: pollRequest.headers,
    });

    if (!response.ok) {
      // Classify HTTP errors instead of silently swallowing them
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Video polling auth failed (${response.status}): API key invalid or expired`);
      }
      if (response.status === 429) {
        // Rate limited — wait longer and retry
        logger.warn({ provider, taskId, attempt, status: response.status }, 'Video poll rate limited, backing off');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30s backoff
        continue;
      }
      if (response.status >= 500) {
        logger.warn({ provider, taskId, attempt, status: response.status }, 'Video poll server error, retrying');
        continue;
      }
      // 4xx client errors (other than auth/rate-limit) are permanent
      const errorText = await response.text();
      throw new Error(`Video polling failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const pollResult = adapter.parsePollResponse(data);

    if (pollResult.status === 'completed' && pollResult.videoUrl) {
      return pollResult.videoUrl;
    }
    if (pollResult.status === 'failed') {
      throw new Error(`Video generation failed: ${pollResult.error ?? 'Unknown error'}`);
    }

    logger.debug({ provider, taskId, attempt, status: pollResult.status }, 'Video poll');
  }

  throw new Error(`Video generation timed out after ${maxAttempts} attempts`);
}

/**
 * Resume pending video generation tasks that were interrupted.
 * Finds records with status 'polling' that have a jobId,
 * re-polls them, and updates the record with the result.
 */
export async function resumePendingVideoTasks(): Promise<{ resumed: number; completed: number; failed: number }> {
  const db = getDb();
  const nowTs = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);

  const pending = await db.select().from(videoGenerations).where(
    eq(videoGenerations.status, 'polling'),
  );

  let completed = 0;
  let failed = 0;

  for (const record of pending) {
    if (!record.jobId) continue;

    try {
      const config = await getActiveConfig('video');
      if (!config || config.provider !== record.provider) {
        logger.warn({ recordId: record.id, provider: record.provider }, 'Cannot resume: provider config mismatch');
        continue;
      }

      const adapter = getVideoAdapter(config.provider);
      const pollRequest = adapter.buildPollRequest(config, record.jobId);
      const response = await fetch(pollRequest.url, {
        method: pollRequest.method,
        headers: pollRequest.headers,
      });

      if (!response.ok) {
        logger.warn({ recordId: record.id, status: response.status }, 'Resume video poll failed');
        continue;
      }

      const data = await response.json();
      const pollResult = adapter.parsePollResponse(data);

      if (pollResult.status === 'completed' && pollResult.videoUrl) {
        const localPath = await downloadAndSave(pollResult.videoUrl, 'videos', 'mp4');
        await db.update(videoGenerations).set({
          status: 'completed',
          assetId: localPath,
          updatedAt: nowTs,
        }).where(eq(videoGenerations.id, record.id));
        completed++;
      } else if (pollResult.status === 'failed') {
        await db.update(videoGenerations).set({
          status: 'failed',
          errorMessage: pollResult.error ?? 'Provider reported failure',
          updatedAt: nowTs,
        }).where(eq(videoGenerations.id, record.id));
        failed++;
      }
    } catch (err) {
      logger.error({ recordId: record.id, error: err instanceof Error ? err.message : String(err) }, 'Resume video task error');
    }
  }

  logger.info({ total: pending.length, completed, failed }, 'Resumed pending video tasks');
  return { resumed: pending.length, completed, failed };
}
