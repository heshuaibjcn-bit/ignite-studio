/**
 * OpenAI Image Adapter (DALL-E)
 * Synchronous image generation via OpenAI-compatible API.
 */
import type {
  AIConfig,
  ProviderRequest,
  ImageProviderAdapter,
  ImageGenerationParams,
  ImageGenResponse,
  ImagePollResponse,
} from './types';

export class OpenAIImageAdapter implements ImageProviderAdapter {
  provider = 'openai';

  buildGenerateRequest(config: AIConfig, params: ImageGenerationParams): ProviderRequest {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    return {
      url: `${baseUrl}/v1/images/generations`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: {
        model: config.model || 'dall-e-3',
        prompt: params.prompt,
        size: params.size || '1024x1024',
        n: 1,
        response_format: 'url',
      },
    };
  }

  parseGenerateResponse(result: unknown): ImageGenResponse {
    const data = result as { data?: Array<{ url?: string }> };
    const url = data?.data?.[0]?.url;
    return { isAsync: false, imageUrl: url };
  }

  buildPollRequest(_config: AIConfig, _taskId: string): ProviderRequest {
    // OpenAI DALL-E is synchronous, no polling needed
    throw new Error('OpenAI image generation is synchronous');
  }

  parsePollResponse(_result: unknown): ImagePollResponse {
    throw new Error('OpenAI image generation is synchronous');
  }

  extractImageUrl(result: unknown): string | null {
    const data = result as { data?: Array<{ url?: string }> };
    return data?.data?.[0]?.url ?? null;
  }
}
