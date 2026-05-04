/**
 * Vidu Video Generation Adapter
 * Endpoint: /ent/v2/img2video
 * Auth: Authorization: Token {apiKey} (NOT Bearer!)
 * Note: Vidu has NO polling endpoint — relies on Webhook callbacks for results
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

export class ViduVideoAdapter implements VideoProviderAdapter {
  provider = 'vidu';

  buildGenerateRequest(config: AIConfig, params: VideoGenerationParams): ProviderRequest {
    const model = params.model || config.model || 'viduq3-turbo';

    const body: Record<string, unknown> = {
      model,
      images: [],
      prompt: params.prompt,
    };

    // Add reference images
    if (params.referenceMode === 'single' && params.imageUrl) {
      (body.images as string[]).push(params.imageUrl);
    } else if (params.referenceMode === 'first_last') {
      if (params.firstFrameUrl) (body.images as string[]).push(params.firstFrameUrl);
      if (params.lastFrameUrl) (body.images as string[]).push(params.lastFrameUrl);
    } else if (params.referenceMode === 'multiple' && params.referenceImageUrls?.length) {
      body.images = [...params.referenceImageUrls];
    }

    if (params.duration) body.duration = params.duration;
    if (params.aspectRatio) {
      const ratioMap: Record<string, string> = { '16:9': '720p', '9:16': '720p', '1:1': '720p' };
      body.resolution = ratioMap[params.aspectRatio] || '720p';
    }

    return {
      url: joinProviderUrl(config.baseUrl, '', '/ent/v2/img2video'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${config.apiKey}`,
      },
      body,
    };
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (result.task_id) return { isAsync: true, taskId: result.task_id };
    if (result.video_url) return { isAsync: false, videoUrl: result.video_url };
    throw new Error('No task_id in Vidu response');
  }

  buildPollRequest(_config: AIConfig, _taskId: string): ProviderRequest {
    // Vidu has no polling endpoint — relies on Webhook callbacks
    return {
      url: 'vidu://no-polling-endpoint',
      method: 'GET',
      headers: {},
      body: undefined,
    };
  }

  parsePollResponse(_result: unknown): VideoPollResponse {
    // Vidu polling always returns processing — actual status via Webhook
    return { status: 'processing' };
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url || null;
  }

  /**
   * Parse Vidu Webhook callback into standard response.
   * Used by the webhook route handler.
   */
  static parseCallbackState(body: any): { status: 'completed' | 'failed'; videoUrl?: string; error?: string } {
    const state = body.state;
    if (state === 'success') return { status: 'completed', videoUrl: body.video_url };
    if (state === 'failed') return { status: 'failed', error: body.error || 'Vidu generation failed' };
    return { status: 'failed', error: `Unknown Vidu state: ${state}` };
  }
}
