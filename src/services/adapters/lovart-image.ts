/**
 * Lovart Image Generation Adapter
 *
 * Lovart uses a chat-based workflow (not a standard REST generation API).
 * The adapter delegates to LovartClient which handles:
 *   1. Create project
 *   2. Send prompt with image generation tool
 *   3. Poll for completion
 *   4. Extract image artifacts
 *
 * The standard adapter methods build "virtual" requests that get handled
 * by the LovartClient internally.
 */
import type {
  AIConfig,
  ImageGenerationParams,
  ImageGenResponse,
  ImagePollResponse,
  ImageProviderAdapter,
  ProviderRequest,
} from './types';
import { LovartClient, extractArtifacts } from '../lovart-client';

const DEFAULT_IMAGE_TOOLS = [
  'generate_image_seedream_v5',
  'generate_image_seedream_v4_5',
  'generate_image_gpt_image_2',
  'generate_image_midjourney',
];

export class LovartImageAdapter implements ImageProviderAdapter {
  provider = 'lovart';

  buildGenerateRequest(
    config: AIConfig,
    params: ImageGenerationParams,
  ): ProviderRequest {
    const prompt = this.buildPrompt(params);
    return {
      url: `${config.baseUrl || 'https://lgw.lovart.ai'}/v1/openapi/chat`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        prompt,
        tool_config: {
          include_tools: DEFAULT_IMAGE_TOOLS,
        },
        mode: 'fast',
        referenceImages: params.referenceImages || [],
      },
    };
  }

  parseGenerateResponse(_result: unknown): ImageGenResponse {
    // Lovart is always async via chat workflow
    return { isAsync: true };
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: `${config.baseUrl || 'https://lgw.lovart.ai'}/v1/openapi/chat/status?thread_id=${taskId}`,
      method: 'GET',
      headers: {},
      body: undefined,
    };
  }

  parsePollResponse(result: unknown): ImagePollResponse {
    const status = (result as Record<string, unknown>)?.status as string;
    if (status === 'done') {
      // Extract image artifact URL
      const artifacts = extractArtifacts(
        result as Parameters<typeof extractArtifacts>[0],
        'image',
      );
      if (artifacts.length > 0) {
        return {
          status: 'completed',
          imageUrl: artifacts[0].content,
        };
      }
      return {
        status: 'failed',
        error: 'Lovart completed but produced no image artifacts',
      };
    }
    if (status === 'abort') {
      return { status: 'failed', error: 'Lovart generation was aborted' };
    }
    return { status: 'processing' };
  }

  extractImageUrl(result: unknown): string | null {
    const artifacts = extractArtifacts(
      result as Parameters<typeof extractArtifacts>[0],
      'image',
    );
    return artifacts.length > 0 ? artifacts[0].content : null;
  }

  extractImageBase64(): { data: string; mimeType: string } | null {
    // Lovart returns URLs, not base64
    return null;
  }

  /**
   * Execute the full Lovart image generation workflow.
   * Called by image-generation service when provider is 'lovart'.
   */
  async generateImage(
    config: AIConfig,
    params: ImageGenerationParams,
    timeoutMs = 900_000,
  ): Promise<{ imageUrl: string | null; artifacts: Array<{ type: string; content: string }> }> {
    const client = new LovartClient(config);
    const prompt = this.buildPrompt(params);

    // Upload reference images if any
    const attachments: string[] = [];
    if (params.referenceImages?.length) {
      for (const refUrl of params.referenceImages.slice(0, 6)) {
        try {
          if (refUrl.startsWith('data:')) {
            const uploaded = await client.uploadDataUrl(refUrl);
            attachments.push(uploaded);
          } else {
            attachments.push(refUrl);
          }
        } catch {
          // Skip failed uploads — reference images are optional
        }
      }
    }

    const result = await client.chatAndWait({
      prompt,
      projectName: `image-${params.id}`,
      attachments: attachments.length > 0 ? attachments : undefined,
      includeTools: DEFAULT_IMAGE_TOOLS,
      mode: 'fast',
      timeoutMs,
    });

    const imageArtifacts = extractArtifacts(result, 'image');
    return {
      imageUrl: imageArtifacts.length > 0 ? imageArtifacts[0].content : null,
      artifacts: imageArtifacts,
    };
  }

  private buildPrompt(params: ImageGenerationParams): string {
    const parts = [
      'Generate exactly one production-ready image for a short drama/video workflow.',
      'Continuity is mandatory: do not redesign recurring characters, costumes, faces, hair, body shape, or the established scene.',
      `Prompt: ${params.prompt || ''}`,
    ];
    if (params.size) {
      parts.push(`Output size/aspect target: ${params.size}.`);
    }
    return parts.join('\n');
  }
}
