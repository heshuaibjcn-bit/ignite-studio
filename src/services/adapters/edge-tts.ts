/**
 * Edge TTS Adapter
 * Local synthesis using Microsoft Edge TTS — no API key needed.
 * Good Chinese voice support (zh-CN-XiaoxiaoNeural, zh-CN-YunxiNeural, etc.)
 */
import type {
  AIConfig,
  ProviderRequest,
  TTSProviderAdapter,
  TTSParams,
  TTSSynthesisResult,
} from './types';

export class EdgeTTSAdapter implements TTSProviderAdapter {
  provider = 'edge';

  buildGenerateRequest(_config: AIConfig, _params: TTSParams): ProviderRequest {
    // Edge TTS uses local synthesis, not HTTP
    throw new Error('Edge TTS uses local synthesis — call synthesize() instead');
  }

  async synthesize(_config: AIConfig, params: TTSParams): Promise<TTSSynthesisResult> {
    const { EdgeTTS } = await import('node-edge-tts');
    const { join } = await import('path');
    const { readFileSync, unlinkSync, mkdirSync, existsSync } = await import('fs');
    const { nanoid } = await import('nanoid');

    // Edge TTS writes to a file, so we use a temp path
    const tempDir = join(process.cwd(), 'data', 'temp');
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
    const tempPath = join(tempDir, `tts_${nanoid(8)}.mp3`);

    const rateStr = params.speed != null
      ? `${params.speed >= 1 ? '+' : ''}${Math.round((params.speed - 1) * 100)}%`
      : undefined;
    const volumeStr = params.volume != null
      ? `${params.volume >= 1 ? '+' : ''}${Math.round((params.volume - 1) * 100)}%`
      : undefined;
    const pitchStr = params.pitch != null
      ? `${params.pitch >= 0 ? '+' : ''}${Math.round(params.pitch)}Hz`
      : undefined;

    const tts = new EdgeTTS({
      voice: params.voiceId || 'zh-CN-XiaoxiaoNeural',
      rate: rateStr,
      volume: volumeStr,
      pitch: pitchStr,
    });

    await tts.ttsPromise(params.text, tempPath);

    const audioBuffer = readFileSync(tempPath);
    unlinkSync(tempPath);

    return {
      audioBuffer,
      audioLength: audioBuffer.length,
      sampleRate: 24000,
      bitrate: 48000,
      format: 'mp3',
      channel: 1,
    };
  }

  parseResponse(_result: unknown): TTSSynthesisResult {
    throw new Error('Edge TTS uses local synthesis — call synthesize() instead');
  }
}

/**
 * Available Edge TTS Chinese voices.
 */
export const EDGE_TTS_CHINESE_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-XiaochenNeural', name: '晓辰', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaohanNeural', name: '晓涵', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaomengNeural', name: '晓梦', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaomoNeural', name: '晓墨', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaoqiuNeural', name: '晓秋', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaoruiNeural', name: '晓睿', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaoshuangNeural', name: '晓双', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaoxuanNeural', name: '晓萱', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaoyanNeural', name: '晓颜', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-XiaozhenNeural', name: '晓甄', gender: 'female', locale: 'zh-CN' },
  { id: 'zh-CN-YunfengNeural', name: '云枫', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-YunhaoNeural', name: '云皓', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-YunxiaNeural', name: '云夏', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-YunyeNeural', name: '云野', gender: 'male', locale: 'zh-CN' },
  { id: 'zh-CN-YunzeNeural', name: '云泽', gender: 'male', locale: 'zh-CN' },
];
