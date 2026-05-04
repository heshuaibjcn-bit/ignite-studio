/**
 * Aliyun Tongyi (Wanxiang) Video Generation Adapter
 * Endpoint: /api/v1/services/aigc/video-generation/video-synthesis
 */
import type {
  VideoProviderAdapter,
  ProviderRequest,
  AIConfig,
  VideoGenerationParams,
  VideoGenResponse,
  VideoPollResponse,
} from './types';
import { joinProviderUrl } from './url';

export class AliVideoAdapter implements VideoProviderAdapter {
  readonly provider = 'ali';

  buildGenerateRequest(config: AIConfig, params: VideoGenerationParams): ProviderRequest {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com';
    const url = joinProviderUrl(baseUrl, '/api/v1', '/services/aigc/video-generation/video-synthesis');

    const body: Record<string, unknown> = {
      model: params.model || 'wan2.6-i2v-flash',
      input: {
        prompt: params.prompt,
        img_url: params.imageUrl ?? params.firstFrameUrl ?? '',
      },
      parameters: {
        resolution: this.normalizeResolution(params.aspectRatio ?? '16:9'),
        duration: params.duration || 5,
        watermark: false,
        seed: Math.floor(Math.random() * 2147483647),
      },
    };

    if (params.lastFrameUrl) {
      (body.input as Record<string, unknown>).last_img_url = params.lastFrameUrl;
    }

    return {
      url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    };
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (result.output?.task_status === 'PENDING' && result.output?.task_id) {
      return { isAsync: true, taskId: result.output.task_id };
    }
    if (result.output?.video_url) {
      return { isAsync: false, videoUrl: result.output.video_url };
    }
    throw new Error(`Unexpected Ali video response: ${JSON.stringify(result).slice(0, 200)}`);
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com';
    return {
      url: joinProviderUrl(baseUrl, '/api/v1', `/tasks/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: undefined,
    };
  }

  parsePollResponse(result: any): VideoPollResponse {
    const status = result.output?.task_status;
    if (status === 'SUCCEEDED') {
      return { status: 'completed', videoUrl: result.output?.video_url };
    }
    if (status === 'FAILED') {
      return { status: 'failed', error: result.message || 'Ali video generation failed' };
    }
    if (status === 'PENDING' || status === 'RUNNING') {
      return { status: 'processing' };
    }
    return { status: 'pending' };
  }

  extractVideoUrl(result: any): string | null {
    return result.output?.video_url || null;
  }

  private normalizeResolution(aspectRatio?: string): string {
    const ratio = aspectRatio || '16:9';
    if (ratio === '9:16') return '720P';
    if (ratio === '1:1') return '720P';
    return '1080P';
  }
}
