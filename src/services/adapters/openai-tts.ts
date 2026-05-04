/**
 * OpenAI TTS Adapter
 * API-based text-to-speech via OpenAI-compatible endpoint.
 */
import type {
  AIConfig,
  ProviderRequest,
  TTSProviderAdapter,
  TTSParams,
  TTSSynthesisResult,
} from './types';

export class OpenAITTSAdapter implements TTSProviderAdapter {
  provider = 'openai';

  buildGenerateRequest(config: AIConfig, params: TTSParams): ProviderRequest {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    return {
      url: `${baseUrl}/v1/audio/speech`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: {
        model: config.model || 'tts-1',
        input: params.text,
        voice: params.voiceId || 'alloy',
        speed: params.speed ?? 1.0,
        response_format: params.format || 'mp3',
      },
    };
  }

  parseResponse(result: unknown): TTSSynthesisResult {
    const buffer = result as Buffer;
    return {
      audioBuffer: buffer,
      audioLength: buffer.length,
      sampleRate: 24000,
      bitrate: 48000,
      format: 'mp3',
      channel: 1,
    };
  }
}
