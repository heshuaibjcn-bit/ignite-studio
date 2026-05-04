/**
 * TTS Generation Service
 * Generates speech audio from text using configured TTS provider.
 */
import { getActiveConfig } from './ai-config';
import { getTTSAdapter } from './adapters/registry';
import { saveGeneratedFile } from './storage';
import type { TTSParams } from './adapters/types';
import { logger } from '@/lib/logger';

export interface TTSGenerateResult {
  localPath: string;
  format: string;
  sampleRate: number;
  durationMs?: number;
}

/**
 * Generate TTS audio for the given text.
 * Uses the highest-priority active audio config.
 */
export async function generateTTS(params: TTSParams): Promise<TTSGenerateResult> {
  const config = await getActiveConfig('audio');
  if (!config) {
    throw new Error('No active audio/TTS provider configured');
  }

  const adapter = getTTSAdapter(config.provider);
  logger.info({ provider: config.provider, voiceId: params.voiceId, textLength: params.text.length }, 'TTS generation started');

  let result;

  // Use local synthesis if available (Edge TTS)
  if (adapter.synthesize) {
    result = await adapter.synthesize(config, params);
  } else {
    // API-based TTS
    const request = adapter.buildGenerateRequest(config, params);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API error ${response.status}: ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    result = adapter.parseResponse(buffer);
  }

  // Save audio file
  const localPath = saveGeneratedFile(result.audioBuffer, 'audio', result.format);

  logger.info({ provider: config.provider, localPath, size: result.audioLength }, 'TTS generation completed');

  return {
    localPath,
    format: result.format,
    sampleRate: result.sampleRate,
  };
}

/**
 * Generate a short voice sample for preview purposes.
 * Uses a fixed sample text and the specified voice/provider.
 * Returns the local path to the generated audio file.
 */
export async function generateVoiceSample(
  voiceId: string,
  provider?: string,
  sampleText = '你好，这是一段语音样本预览。',
): Promise<{ localPath: string; format: string }> {
  const config = await getActiveConfig('audio');
  if (!config) {
    throw new Error('No active audio/TTS provider configured');
  }

  // Override provider if specified
  const effectiveProvider = provider || config.provider;
  const adapter = getTTSAdapter(effectiveProvider);

  const params: TTSParams = {
    text: sampleText,
    voiceId,
    speed: 1.0,
  };

  let result;

  if (adapter.synthesize) {
    result = await adapter.synthesize(config, params);
  } else {
    const request = adapter.buildGenerateRequest(config, params);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice sample API error ${response.status}: ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    result = adapter.parseResponse(buffer);
  }

  const localPath = saveGeneratedFile(result.audioBuffer, 'audio', result.format);
  logger.info({ provider: effectiveProvider, voiceId, localPath }, 'Voice sample generated');

  return { localPath, format: result.format };
}
