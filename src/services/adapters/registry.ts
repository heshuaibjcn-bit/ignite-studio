/**
 * Provider Adapter Registry
 * Maps provider names to adapter instances.
 */
import type { ImageProviderAdapter, VideoProviderAdapter, TTSProviderAdapter } from './types';
import { OpenAIImageAdapter } from './openai-image';
import { MiniMaxImageAdapter } from './minimax-image';
import { MiniMaxVideoAdapter } from './minimax-video';
import { GeminiImageAdapter } from './gemini-image';
import { VolcEngineImageAdapter } from './volcengine-image';
import { VolcEngineVideoAdapter } from './volcengine-video';
import { AliImageAdapter } from './ali-image';
import { AliVideoAdapter } from './ali-video';
import { ViduVideoAdapter } from './vidu-video';
import { EdgeTTSAdapter } from './edge-tts';
import { OpenAITTSAdapter } from './openai-tts';
import { MiniMaxTTSAdapter } from './minimax-tts';
import { LovartImageAdapter } from './lovart-image';
import { LovartVideoAdapter } from './lovart-video';

// Image adapter registry
export const imageAdapters: Record<string, ImageProviderAdapter> = {
  openai: new OpenAIImageAdapter(),
  minimax: new MiniMaxImageAdapter(),
  gemini: new GeminiImageAdapter(),
  volcengine: new VolcEngineImageAdapter(),
  ali: new AliImageAdapter(),
  lovart: new LovartImageAdapter(),
};

// Video adapter registry
export const videoAdapters: Record<string, VideoProviderAdapter> = {
  minimax: new MiniMaxVideoAdapter(),
  volcengine: new VolcEngineVideoAdapter(),
  vidu: new ViduVideoAdapter(),
  ali: new AliVideoAdapter(),
  lovart: new LovartVideoAdapter(),
};

// TTS adapter registry
export const ttsAdapters: Record<string, TTSProviderAdapter> = {
  edge: new EdgeTTSAdapter(),
  openai: new OpenAITTSAdapter(),
  minimax: new MiniMaxTTSAdapter(),
  // OpenRouter/ChatFire use OpenAI-compatible TTS APIs
  openrouter: new OpenAITTSAdapter(),
  chatfire: new OpenAITTSAdapter(),
};

export function getImageAdapter(provider: string): ImageProviderAdapter {
  const adapter = imageAdapters[provider.toLowerCase()];
  if (!adapter) {
    const available = Object.keys(imageAdapters).join(', ');
    throw new Error(`Unknown image provider '${provider}'. Available: ${available}`);
  }
  return adapter;
}

export function getVideoAdapter(provider: string): VideoProviderAdapter {
  const adapter = videoAdapters[provider.toLowerCase()];
  if (!adapter) {
    const available = Object.keys(videoAdapters).join(', ');
    throw new Error(`Unknown video provider '${provider}'. Available: ${available}`);
  }
  return adapter;
}

export function getTTSAdapter(provider: string): TTSProviderAdapter {
  const adapter = ttsAdapters[provider.toLowerCase()];
  if (!adapter) {
    const available = Object.keys(ttsAdapters).join(', ');
    throw new Error(`Unknown TTS provider '${provider}'. Available: ${available}`);
  }
  return adapter;
}
