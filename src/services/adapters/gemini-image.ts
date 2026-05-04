/**
 * Gemini Image Generation Adapter
 * Authentication: API key via query param (?key=) or headers
 * Request: Google REST-style contents[].parts[] structure
 * Response: base64 encoded in inlineData.data — no image URL
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

export class GeminiImageAdapter implements ImageProviderAdapter {
  provider = 'gemini';

  buildGenerateRequest(config: AIConfig, params: ImageGenerationParams): ProviderRequest {
    const modelName = params.model || config.model || 'gemini-2.0-flash-exp';
    const model = modelName.startsWith('models/') ? modelName : `models/${modelName}`;

    const parts: Record<string, unknown>[] = [];

    // Reference images as inline data (data URLs)
    if (params.referenceImages?.length) {
      for (const ref of params.referenceImages) {
        const parsed = parseDataUrl(ref);
        if (parsed) {
          parts.push({
            inline_data: {
              mime_type: parsed.mimeType,
              data: parsed.data,
            },
          });
        }
      }
    }

    parts.push({ text: params.prompt || 'Generate an image' });

    const body = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: this.parseAspectRatio(params.size),
          imageSize: this.parseImageSize(params.size),
        },
      },
    };

    const url = new URL(joinProviderUrl(config.baseUrl, '/v1beta', `/${model}:generateContent`));
    url.searchParams.set('key', config.apiKey);

    return {
      url: url.toString(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body,
    };
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    const firstCandidate = result?.candidates?.[0];
    const finishReason = firstCandidate?.finishReason || firstCandidate?.finish_reason;
    const finishMessage = firstCandidate?.finishMessage || firstCandidate?.finish_message;

    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      throw new Error(finishMessage || `Gemini generation stopped: ${finishReason}`);
    }

    // Check for base64 image data first (Gemini's primary response)
    if (this.extractImageBase64(result)) {
      return { isAsync: false, imageUrl: undefined };
    }

    // Check for URL (some Gemini setups might return URLs)
    if (this.extractImageUrl(result)) {
      return { isAsync: false, imageUrl: this.extractImageUrl(result)! };
    }

    // Async task
    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id };
    }

    if (result.error) {
      throw new Error(result.error.message || 'Gemini generation failed');
    }
    throw new Error('No image data in Gemini response');
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    const url = new URL(joinProviderUrl(config.baseUrl, '/v1beta', `/${taskId}`));
    url.searchParams.set('key', config.apiKey);
    return {
      url: url.toString(),
      method: 'GET',
      headers: { 'x-goog-api-key': config.apiKey },
      body: undefined,
    };
  }

  parsePollResponse(_result: unknown): ImagePollResponse {
    // Gemini is synchronous — this shouldn't be called
    return { status: 'completed' };
  }

  extractImageUrl(result: any): string | null {
    return result?.data?.[0]?.url || result?.image_url || result?.url || null;
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    const b64 = result?.data?.[0]?.b64_json;
    if (b64) return { data: b64, mimeType: 'image/png' };

    const parts = result?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const inline = part.inlineData || part.inline_data;
      if (inline) {
        return {
          data: inline.data,
          mimeType: inline.mimeType || inline.mime_type || 'image/png',
        };
      }
    }
    return null;
  }

  private parseAspectRatio(size?: string): string {
    if (!size) return '16:9';
    const [w, h] = size.split('x').map(Number);
    if (!w || !h) return '16:9';
    const gcd = this.gcd(w, h);
    return `${w / gcd}:${h / gcd}`;
  }

  private parseImageSize(size?: string): string {
    if (!size) return '1K';
    const [w] = size.split('x').map(Number);
    if (!w) return '1K';
    if (w >= 2048) return '4K';
    if (w >= 1024) return '2K';
    return '1K';
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }
}

/** Parse a data URL into its components */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}
