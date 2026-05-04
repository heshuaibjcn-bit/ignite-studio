/**
 * MiniMax Video Adapter
 * Async video generation with polling.
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoProviderAdapter,
  VideoGenerationParams,
  VideoGenResponse,
  VideoPollResponse,
} from './types';

export class MiniMaxVideoAdapter implements VideoProviderAdapter {
  provider = 'minimax';

  buildGenerateRequest(config: AIConfig, params: VideoGenerationParams): ProviderRequest {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');

    const body: Record<string, unknown> = {
      model: config.model || 'video-01',
      prompt: params.prompt,
    };

    // Reference image handling
    if (params.referenceMode === 'single' && params.imageUrl) {
      body.first_frame_image = params.imageUrl;
    } else if (params.referenceMode === 'first_last') {
      if (params.firstFrameUrl) body.first_frame_image = params.firstFrameUrl;
      if (params.lastFrameUrl) body.last_frame_image = params.lastFrameUrl;
    }

    return {
      url: `${baseUrl}/v1/video_generation`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    };
  }

  parseGenerateResponse(result: unknown): VideoGenResponse {
    const data = result as { task_id?: string };
    return {
      isAsync: true,
      taskId: data?.task_id,
    };
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    return {
      url: `${baseUrl}/v1/video_generation/task/${taskId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: null,
    };
  }

  parsePollResponse(result: unknown): VideoPollResponse {
    const data = result as {
      status?: string;
      file_id?: string;
      base_resp?: { status_code?: number; status_msg?: string };
    };

    const status = data?.status;
    if (status === 'Success' || status === 'Finished') {
      return { status: 'completed', videoUrl: data?.file_id };
    }
    if (status === 'Failed') {
      return { status: 'failed', error: data?.base_resp?.status_msg ?? 'Unknown error' };
    }
    return { status: 'processing' };
  }

  extractVideoUrl(result: unknown): string | null {
    const data = result as { file_id?: string };
    return data?.file_id ?? null;
  }
}
