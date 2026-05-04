/**
 * MiniMax Image Adapter
 * Async image generation with polling via MiniMax API.
 */
import type {
  AIConfig,
  ProviderRequest,
  ImageProviderAdapter,
  ImageGenerationParams,
  ImageGenResponse,
  ImagePollResponse,
} from './types';

export class MiniMaxImageAdapter implements ImageProviderAdapter {
  provider = 'minimax';

  buildGenerateRequest(config: AIConfig, params: ImageGenerationParams): ProviderRequest {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');

    const body: Record<string, unknown> = {
      model: config.model || 'image-01',
      prompt: params.prompt,
    };

    if (params.size) {
      body.aspect_ratio = this.sizeToAspectRatio(params.size);
    }

    // Reference image handling (image-to-image)
    if (params.referenceImages && params.referenceImages.length > 0) {
      body.reference_image = params.referenceImages[0];
    }

    return {
      url: `${baseUrl}/v1/image_generation`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    };
  }

  parseGenerateResponse(result: unknown): ImageGenResponse {
    const data = result as {
      task_id?: string;
      data?: Array<{ url?: string; image_url?: string }>;
      base_resp?: { status_code?: number };
    };

    // If images are returned directly (synchronous path)
    const imageUrl = data?.data?.[0]?.url ?? data?.data?.[0]?.image_url;
    if (imageUrl) {
      return { isAsync: false, imageUrl };
    }

    // Async path — need to poll
    return {
      isAsync: true,
      taskId: data?.task_id,
    };
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    return {
      url: `${baseUrl}/v1/image_generation/task/${taskId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: null,
    };
  }

  parsePollResponse(result: unknown): ImagePollResponse {
    const data = result as {
      status?: string;
      data?: Array<{ url?: string; image_url?: string }>;
      base_resp?: { status_code?: number; status_msg?: string };
    };

    const status = data?.status;
    if (status === 'Success' || status === 'Finished') {
      const imageUrl = data?.data?.[0]?.url ?? data?.data?.[0]?.image_url;
      return { status: 'completed', imageUrl };
    }
    if (status === 'Failed') {
      return { status: 'failed', error: data?.base_resp?.status_msg ?? 'Unknown error' };
    }
    return { status: 'processing' };
  }

  extractImageUrl(result: unknown): string | null {
    const data = result as {
      data?: Array<{ url?: string; image_url?: string }>;
    };
    return data?.data?.[0]?.url ?? data?.data?.[0]?.image_url ?? null;
  }

  /** Convert size string like "1024x1024" to aspect ratio like "1:1" */
  private sizeToAspectRatio(size: string): string {
    const [w, h] = size.split('x').map(Number);
    if (!w || !h) return '1:1';

    const gcf = this.gcd(w, h);
    return `${w / gcf}:${h / gcf}`;
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }
}
