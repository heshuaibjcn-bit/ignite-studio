/**
 * Image Generation Service
 * Manages async image generation with provider adapters.
 *
 * Supports standard REST providers and chat-based providers (Lovart).
 */
import { getActiveConfig } from './ai-config';
import { getImageAdapter } from './adapters/registry';
import { downloadAndSave, saveGeneratedFile } from './storage';
import type { ImageGenerationParams, AIConfig } from './adapters/types';
import { LovartImageAdapter } from './adapters/lovart-image';
import { getDb } from '@/db/client';
import { imageGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export interface ImageGenerateResult {
  localPath: string;
  width?: number;
  height?: number;
}

/**
 * Generate an image using the configured provider.
 * Handles sync (DALL-E), async (MiniMax), and chat-based (Lovart) providers.
 */
export async function generateImage(params: ImageGenerationParams): Promise<ImageGenerateResult> {
  const config = await getActiveConfig('image');
  if (!config) {
    throw new Error('No active image provider configured');
  }

  // Lovart uses a chat-based workflow, not standard REST
  if (config.provider.toLowerCase() === 'lovart') {
    return generateImageViaLovart(config, params);
  }

  const adapter = getImageAdapter(config.provider);
  logger.info({ provider: config.provider, promptLength: params.prompt.length }, 'Image generation started');

  // Build and send generation request
  const request = adapter.buildGenerateRequest(config, params);
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image API error ${response.status}: ${errorText}`);
  }

  const responseData = await response.json();
  const genResponse = adapter.parseGenerateResponse(responseData);

  let imageUrl: string | undefined;

  if (genResponse.isAsync && genResponse.taskId) {
    // Poll for completion
    imageUrl = await pollForImage(config.provider, config, genResponse.taskId, adapter);
  } else {
    imageUrl = genResponse.imageUrl;
  }

  if (!imageUrl) {
    // Check for base64 response
    const base64 = adapter.extractImageBase64?.(responseData);
    if (base64) {
      const buffer = Buffer.from(base64.data, 'base64');
      const ext = base64.mimeType.split('/')[1] || 'png';
      const { saveGeneratedFile } = await import('./storage');
      const localPath = saveGeneratedFile(buffer, 'images', ext);
      return { localPath };
    }
    throw new Error('No image URL or base64 data in response');
  }

  // Download and save locally
  const localPath = await downloadAndSave(imageUrl, 'images', 'png');

  logger.info({ provider: config.provider, localPath }, 'Image generation completed');
  return { localPath };
}

/**
 * Generate image via Lovart chat-based workflow.
 */
async function generateImageViaLovart(
  config: AIConfig,
  params: ImageGenerationParams,
): Promise<ImageGenerateResult> {
  const lovartAdapter = new LovartImageAdapter();
  const { imageUrl } = await lovartAdapter.generateImage(config, params);

  if (!imageUrl) {
    throw new Error('Lovart image generation produced no image URL');
  }

  const localPath = await downloadAndSave(imageUrl, 'images', 'png');
  logger.info({ provider: 'lovart', localPath }, 'Image generation (Lovart) completed');
  return { localPath };
}

/**
 * Poll an async image generation task until completion.
 */
async function pollForImage(
  provider: string,
  config: { provider: string; baseUrl: string; apiKey: string; model: string },
  taskId: string,
  adapter: ReturnType<typeof getImageAdapter>,
  maxAttempts = 60,
  intervalMs = 5000,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const pollRequest = adapter.buildPollRequest(config, taskId);
    const response = await fetch(pollRequest.url, {
      method: pollRequest.method,
      headers: pollRequest.headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Image polling auth failed (${response.status}): API key invalid or expired`);
      }
      if (response.status === 429) {
        logger.warn({ provider, taskId, attempt, status: response.status }, 'Image poll rate limited, backing off');
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }
      if (response.status >= 500) {
        logger.warn({ provider, taskId, attempt, status: response.status }, 'Image poll server error, retrying');
        continue;
      }
      const errorText = await response.text();
      throw new Error(`Image polling failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const pollResult = adapter.parsePollResponse(data);

    if (pollResult.status === 'completed' && pollResult.imageUrl) {
      return pollResult.imageUrl;
    }
    if (pollResult.status === 'failed') {
      throw new Error(`Image generation failed: ${pollResult.error ?? 'Unknown error'}`);
    }

    logger.debug({ provider, taskId, attempt, status: pollResult.status }, 'Image poll');
  }

  throw new Error(`Image generation timed out after ${maxAttempts} attempts`);
}

/**
 * Resume pending image generation tasks that were interrupted.
 * Finds records with status 'processing' or 'polling' that have a jobId,
 * re-polls them, and updates the record with the result.
 */
export async function resumePendingImageTasks(): Promise<{ resumed: number; completed: number; failed: number }> {
  const db = getDb();
  const nowTs = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);

  // Find stuck records: processing/polling with a provider task ID
  const pending = await db.select().from(imageGenerations).where(
    eq(imageGenerations.status, 'polling'),
  );

  let completed = 0;
  let failed = 0;

  for (const record of pending) {
    if (!record.jobId) continue;

    try {
      const config = await getActiveConfig('image');
      if (!config || config.provider !== record.provider) {
        logger.warn({ recordId: record.id, provider: record.provider }, 'Cannot resume: provider config mismatch');
        continue;
      }

      const adapter = getImageAdapter(config.provider);
      const pollRequest = adapter.buildPollRequest(config, record.jobId);
      const response = await fetch(pollRequest.url, {
        method: pollRequest.method,
        headers: pollRequest.headers,
      });

      if (!response.ok) {
        logger.warn({ recordId: record.id, status: response.status }, 'Resume poll failed');
        continue;
      }

      const data = await response.json();
      const pollResult = adapter.parsePollResponse(data);

      if (pollResult.status === 'completed' && pollResult.imageUrl) {
        const localPath = await downloadAndSave(pollResult.imageUrl, 'images', 'png');
        await db.update(imageGenerations).set({
          status: 'completed',
          assetId: localPath,
          updatedAt: nowTs,
        }).where(eq(imageGenerations.id, record.id));
        completed++;
      } else if (pollResult.status === 'failed') {
        await db.update(imageGenerations).set({
          status: 'failed',
          errorMessage: pollResult.error ?? 'Provider reported failure',
          updatedAt: nowTs,
        }).where(eq(imageGenerations.id, record.id));
        failed++;
      }
      // Still processing — leave as-is, will retry on next call
    } catch (err) {
      logger.error({ recordId: record.id, error: err instanceof Error ? err.message : String(err) }, 'Resume image task error');
    }
  }

  logger.info({ total: pending.length, completed, failed }, 'Resumed pending image tasks');
  return { resumed: pending.length, completed, failed };
}
