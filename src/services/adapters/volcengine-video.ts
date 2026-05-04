/**
 * VolcEngine (ByteDance) Seedance Video Generation Adapter
 * Endpoint: /api/v3/contents/generations/tasks
 * Async: { id: "task-xxx" } → poll for status
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

export class VolcEngineVideoAdapter implements VideoProviderAdapter {
  provider = 'volcengine';

  buildGenerateRequest(config: AIConfig, params: VideoGenerationParams): ProviderRequest {
    const model = params.model || config.model || 'doubao-seedance-1-5-pro-251215';

    const content: Record<string, unknown>[] = [{ type: 'text', text: params.prompt || '' }];

    // Add reference images based on mode
    if (params.referenceMode === 'single' && params.imageUrl) {
      content.push({ type: 'image_url', image_url: { url: params.imageUrl } });
    } else if (params.referenceMode === 'first_last') {
      if (params.firstFrameUrl) {
        content.push({ type: 'image_url', image_url: { url: params.firstFrameUrl }, role: 'first_frame' });
      }
      if (params.lastFrameUrl) {
        content.push({ type: 'image_url', image_url: { url: params.lastFrameUrl }, role: 'last_frame' });
      }
    } else if (params.referenceMode === 'multiple' && params.referenceImageUrls?.length) {
      for (const url of params.referenceImageUrls) {
        content.push({ type: 'image_url', image_url: { url } });
      }
    }

    const body: Record<string, unknown> = {
      model,
      content,
      generate_audio: true,
      ratio: params.aspectRatio || 'adaptive',
      duration: this.normalizeDuration(params.duration),
      watermark: false,
    };

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', '/contents/generations/tasks'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    };
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (result.id) return { isAsync: true, taskId: result.id };
    const videoUrl = result.video_url || result.content?.video_url || result.data?.video_url;
    if (videoUrl) return { isAsync: false, videoUrl };
    throw new Error('No task_id or video_url in VolcEngine response');
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', `/contents/generations/tasks/${taskId}`),
      method: 'GET',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      body: undefined,
    };
  }

  parsePollResponse(result: any): VideoPollResponse {
    if (result.status === 'succeeded') {
      return { status: 'completed', videoUrl: result.video_url || result.content?.video_url || result.data?.video_url };
    }
    if (result.status === 'failed') {
      return { status: 'failed', error: result.error || 'VolcEngine video generation failed' };
    }
    return { status: 'processing' };
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url || result.content?.video_url || result.data?.video_url || null;
  }

  private normalizeDuration(duration?: number): number {
    const parsed = Math.round(Number(duration || 5));
    if (!Number.isFinite(parsed)) return 5;
    return Math.min(12, Math.max(4, parsed));
  }
}
