/**
 * Provider Adapter interfaces for AI service integration.
 * Ported from huobao-drama adapter pattern.
 */

// ============ Common Types ============

export interface AIConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ProviderRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

// ============ Image Generation ============

export interface ImageGenerationParams {
  id: string;
  prompt: string;
  size?: string;
  referenceImages?: string[];
  model?: string;
}

export interface ImageGenResponse {
  isAsync: boolean;
  taskId?: string;
  imageUrl?: string;
}

export interface ImagePollResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

export interface ImageProviderAdapter {
  provider: string;
  buildGenerateRequest(config: AIConfig, params: ImageGenerationParams): ProviderRequest;
  parseGenerateResponse(result: unknown): ImageGenResponse;
  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest;
  parsePollResponse(result: unknown): ImagePollResponse;
  /** Extract image URL from provider response (null if base64) */
  extractImageUrl(result: unknown): string | null;
  /** Extract base64 image data (for providers like Gemini) */
  extractImageBase64?(result: unknown): { data: string; mimeType: string } | null;
}

// ============ Video Generation ============

export interface VideoGenerationParams {
  id: string;
  prompt: string;
  referenceMode?: 'none' | 'single' | 'first_last' | 'multiple';
  imageUrl?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  duration?: number;
  aspectRatio?: string;
  model?: string;
}

export interface VideoGenResponse {
  isAsync: boolean;
  taskId?: string;
  videoUrl?: string;
}

export interface VideoPollResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export interface VideoProviderAdapter {
  provider: string;
  buildGenerateRequest(config: AIConfig, params: VideoGenerationParams): ProviderRequest;
  parseGenerateResponse(result: unknown): VideoGenResponse;
  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest;
  parsePollResponse(result: unknown): VideoPollResponse;
  extractVideoUrl(result: unknown): string | null;
}

// ============ TTS (Text-to-Speech) ============

export interface TTSParams {
  text: string;
  voiceId: string;
  speed?: number;
  volume?: number;
  pitch?: number;
  format?: string;
}

export interface TTSSynthesisResult {
  audioBuffer: Buffer;
  audioLength: number;
  sampleRate: number;
  bitrate: number;
  format: string;
  channel: number;
}

export interface TTSProviderAdapter {
  provider: string;
  /** Build HTTP request for API-based TTS */
  buildGenerateRequest(config: AIConfig, params: TTSParams): ProviderRequest;
  /** Local synthesis (e.g., Edge TTS) — bypasses HTTP */
  synthesize?(config: AIConfig, params: TTSParams): Promise<TTSSynthesisResult>;
  /** Parse API response into audio data */
  parseResponse(result: unknown, responseHeaders?: Headers): TTSSynthesisResult;
}
