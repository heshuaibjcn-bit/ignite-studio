/**
 * MiniMax TTS Adapter
 * API: POST /v1/t2a_v2
 * Response: { data: { audio: "<hex>", status: 2 }, ... }
 */
import type { TTSProviderAdapter, ProviderRequest, AIConfig, TTSParams, TTSSynthesisResult } from './types';
import { joinProviderUrl } from './url';

export class MiniMaxTTSAdapter implements TTSProviderAdapter {
  readonly provider = 'minimax';

  buildGenerateRequest(config: AIConfig, params: TTSParams): ProviderRequest {
    const url = joinProviderUrl(config.baseUrl, '/v1', '/t2a_v2');

    return {
      url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: config.model || 'speech-2.8-hd',
        text: params.text,
        stream: false,
        voice_setting: {
          voice_id: params.voiceId,
          speed: params.speed ?? 1,
          vol: params.volume ?? 1,
          pitch: params.pitch ?? 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: params.format || 'mp3',
          channel: 1,
        },
        subtitle_enable: false,
      },
    };
  }

  parseResponse(result: any): TTSSynthesisResult {
    if (result.base_resp?.status_code !== 0) {
      throw new Error(result.base_resp?.status_msg || 'MiniMax TTS generation failed');
    }

    const data = result.data;
    if (!data?.audio) {
      throw new Error('No audio data in MiniMax TTS response');
    }

    // MiniMax returns audio as hex string — convert to Buffer
    const audioBuffer = Buffer.from(data.audio, 'hex');

    return {
      audioBuffer,
      audioLength: data.extra_info?.audio_length || 0,
      sampleRate: data.extra_info?.audio_sample_rate || 32000,
      bitrate: data.extra_info?.bitrate || 128000,
      format: data.extra_info?.audio_format || 'mp3',
      channel: data.extra_info?.audio_channel || 1,
    };
  }
}
