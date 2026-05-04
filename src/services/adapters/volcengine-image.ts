/**
 * VolcEngine (ByteDance) Image Generation Adapter
 * Endpoint: /api/v3/images/generations
 * Response: { data: [{ url: "..." }] }
 */
import type {
  ImageProviderAdapter,
  ProviderRequest,
  AIConfig,
  ImageGenerationParams,
  ImageGenResponse,
  ImagePollResponse,
} from './types';
import { joinProviderUrl } from './url';

export class VolcEngineImageAdapter implements ImageProviderAdapter {
  provider = 'volcengine';

  buildGenerateRequest(config: AIConfig, params: ImageGenerationParams): ProviderRequest {
    const model = params.model || config.model || 'doubao-seedream-5-0-lite';

    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
    };

    if (params.size) {
      const [w, h] = params.size.split('x');
      if (w && h) {
        body.width = parseInt(w);
        body.height = parseInt(h);
      }
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', '/images/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    };
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id };
    }
    const imageUrl = result.data?.[0]?.url || result.url;
    if (imageUrl) return { isAsync: false, imageUrl };
    throw new Error('No image URL in VolcEngine response');
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', `/images/generations/${taskId}`),
      method: 'GET',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      body: undefined,
    };
  }

  parsePollResponse(result: any): ImagePollResponse {
    if (result.status === 'succeeded') {
      return { status: 'completed', imageUrl: result.data?.[0]?.url || result.image_url };
    }
    if (result.status === 'failed') {
      return { status: 'failed', error: result.error || 'VolcEngine generation failed' };
    }
    return { status: 'processing' };
  }

  extractImageUrl(result: any): string | null {
    return result.data?.[0]?.url || result.image_url || null;
  }

  extractImageBase64(_result: unknown): { data: string; mimeType: string } | null {
    return null;
  }
}
