/**
 * Aliyun Tongyi (Wanxiang) Image Generation Adapter
 * Endpoint: /api/v1/services/aigc/image-generation/generation
 * Async: X-DashScope-Async: enable header
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

export class AliImageAdapter implements ImageProviderAdapter {
  readonly provider = 'ali';

  buildGenerateRequest(config: AIConfig, params: ImageGenerationParams): ProviderRequest {
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com';
    const url = joinProviderUrl(baseUrl, '/api/v1', '/services/aigc/image-generation/generation');

    const size = this.normalizeSize(params.size || '1280x1280');

    const body: Record<string, unknown> = {
      model: params.model || 'wan2.6-t2i',
      input: {
        messages: [{ role: 'user', content: [{ text: params.prompt }] }],
      },
      parameters: {
        size,
        n: 1,
        negative_prompt: '',
        prompt_extend: true,
        watermark: false,
        seed: params.referenceImages?.length ? undefined : Math.floor(Math.random() * 2147483647),
      },
    };

    return {
      url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body,
    };
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    if (result.output?.task_status === 'PENDING' && result.output?.task_id) {
      return { isAsync: true, taskId: result.output.task_id };
    }
    if (result.output?.choices?.[0]?.message?.content?.[0]?.image) {
      return { isAsync: false, imageUrl: result.output.choices[0].message.content[0].image };
    }
    throw new Error(`Unexpected Ali image response: ${JSON.stringify(result).slice(0, 200)}`);
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

  parsePollResponse(result: any): ImagePollResponse {
    const status = result.output?.task_status;
    if (status === 'SUCCEEDED') {
      return { status: 'completed', imageUrl: result.output?.choices?.[0]?.message?.content?.[0]?.image };
    }
    if (status === 'FAILED') {
      return { status: 'failed', error: result.message || 'Ali image generation failed' };
    }
    if (status === 'PENDING' || status === 'RUNNING') {
      return { status: 'processing' };
    }
    return { status: 'pending' };
  }

  extractImageUrl(result: any): string | null {
    return result.output?.choices?.[0]?.message?.content?.[0]?.image || null;
  }

  extractImageBase64(_result: unknown): { data: string; mimeType: string } | null {
    return null;
  }

  private normalizeSize(size: string): string {
    const [w, h] = size.split('x').map(Number);
    if (w && h) {
      const aspect = w / h;
      if (aspect > 1.7) return '1696*960';   // 16:9
      if (aspect < 0.8) return '960*1696';    // 9:16
      return '1280*1280';                      // 1:1
    }
    return '1280*1280';
  }
}
