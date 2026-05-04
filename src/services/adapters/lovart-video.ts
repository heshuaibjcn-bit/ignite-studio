/**
 * Lovart Video Generation Adapter
 *
 * Uses Lovart's chat-based workflow for video generation.
 * Supports reference images (first/last frame, multiple references).
 */
import type {
  AIConfig,
  VideoGenerationParams,
  VideoGenResponse,
  VideoPollResponse,
  VideoProviderAdapter,
  ProviderRequest,
} from './types';
import { LovartClient, extractArtifacts } from '../lovart-client';

const DEFAULT_VIDEO_TOOLS = [
  'generate_video_seedance_v2_0',
  'generate_video_kling_v3',
  'generate_video_veo3_1',
];

export class LovartVideoAdapter implements VideoProviderAdapter {
  provider = 'lovart';

  buildGenerateRequest(
    config: AIConfig,
    params: VideoGenerationParams,
  ): ProviderRequest {
    const prompt = this.buildPrompt(params);
    return {
      url: `${config.baseUrl || 'https://lgw.lovart.ai'}/v1/openapi/chat`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        prompt,
        tool_config: {
          include_tools: DEFAULT_VIDEO_TOOLS,
        },
        mode: 'fast',
        referenceImages: this.collectReferenceImages(params),
      },
    };
  }

  parseGenerateResponse(_result: unknown): VideoGenResponse {
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

  parsePollResponse(result: unknown): VideoPollResponse {
    const status = (result as Record<string, unknown>)?.status as string;
    if (status === 'done') {
      const artifacts = extractArtifacts(
        result as Parameters<typeof extractArtifacts>[0],
        'video',
      );
      if (artifacts.length > 0) {
        return {
          status: 'completed',
          videoUrl: artifacts[0].content,
        };
      }
      return {
        status: 'failed',
        error: 'Lovart completed but produced no video artifacts',
      };
    }
    if (status === 'abort') {
      return { status: 'failed', error: 'Lovart generation was aborted' };
    }
    return { status: 'processing' };
  }

  extractVideoUrl(result: unknown): string | null {
    const artifacts = extractArtifacts(
      result as Parameters<typeof extractArtifacts>[0],
      'video',
    );
    return artifacts.length > 0 ? artifacts[0].content : null;
  }

  /**
   * Execute the full Lovart video generation workflow.
   */
  async generateVideo(
    config: AIConfig,
    params: VideoGenerationParams,
    timeoutMs = 900_000,
  ): Promise<{ videoUrl: string | null; artifacts: Array<{ type: string; content: string }> }> {
    const client = new LovartClient(config);
    const prompt = this.buildPrompt(params);

    // Upload reference images
    const attachments: string[] = [];
    const refUrls = this.collectReferenceImages(params);
    if (refUrls.length > 0) {
      for (const refUrl of refUrls.slice(0, 8)) {
        try {
          if (refUrl.startsWith('data:')) {
            const uploaded = await client.uploadDataUrl(refUrl);
            attachments.push(uploaded);
          } else {
            attachments.push(refUrl);
          }
        } catch {
          // Skip failed uploads
        }
      }
    }

    const result = await client.chatAndWait({
      prompt,
      projectName: `video-${params.id}`,
      attachments: attachments.length > 0 ? attachments : undefined,
      includeTools: DEFAULT_VIDEO_TOOLS,
      mode: 'fast',
      timeoutMs,
    });

    const videoArtifacts = extractArtifacts(result, 'video');
    return {
      videoUrl: videoArtifacts.length > 0 ? videoArtifacts[0].content : null,
      artifacts: videoArtifacts,
    };
  }

  private collectReferenceImages(params: VideoGenerationParams): string[] {
    const refs: string[] = [];
    if (params.imageUrl) refs.push(params.imageUrl);
    if (params.firstFrameUrl) refs.push(params.firstFrameUrl);
    if (params.lastFrameUrl) refs.push(params.lastFrameUrl);
    if (params.referenceImageUrls) refs.push(...params.referenceImageUrls);
    return refs;
  }

  private buildPrompt(params: VideoGenerationParams): string {
    const parts = [
      'Generate exactly one short drama shot video.',
      'Continuity is mandatory: preserve all referenced character identities, costumes, hair, face, and the established scene throughout the full clip.',
      `Prompt: ${params.prompt || ''}`,
      `Duration target: ${params.duration || 5} seconds.`,
      `Aspect ratio: ${params.aspectRatio || '16:9'}.`,
    ];
    return parts.join('\n');
  }
}
