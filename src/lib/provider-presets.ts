/**
 * Provider Presets
 *
 * Pre-defined configurations for common AI service providers.
 * Each preset provides sensible defaults for quick setup.
 */

export interface ProviderPreset {
  /** Unique identifier */
  name: string;
  /** Display label */
  label: string;
  /** Service type this preset applies to */
  serviceType: 'text' | 'image' | 'video' | 'audio' | 'asr';
  /** Provider name (must match adapter registry key) */
  provider: string;
  /** Default base URL for the provider API */
  defaultBaseUrl: string;
  /** Default model name */
  defaultModel: string;
  /** Whether an API key is required */
  requiresApiKey: boolean;
  /** Description of API key format */
  apiKeyHint?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  // ── Text / LLM ──
  {
    name: 'openai-text',
    label: 'OpenAI (GPT)',
    serviceType: 'text',
    provider: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
    apiKeyHint: 'sk-...',
  },
  {
    name: 'openrouter-text',
    label: 'OpenRouter',
    serviceType: 'text',
    provider: 'openrouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    requiresApiKey: true,
    apiKeyHint: 'sk-or-...',
  },
  {
    name: 'chatfire-text',
    label: 'ChatFire',
    serviceType: 'text',
    provider: 'chatfire',
    defaultBaseUrl: 'https://api.chatfire.cn/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
  },
  {
    name: 'deepseek-text',
    label: 'DeepSeek',
    serviceType: 'text',
    provider: 'deepseek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true,
  },

  // ── Image ──
  {
    name: 'openai-image',
    label: 'OpenAI (DALL-E)',
    serviceType: 'image',
    provider: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'dall-e-3',
    requiresApiKey: true,
    apiKeyHint: 'sk-...',
  },
  {
    name: 'minimax-image',
    label: 'MiniMax',
    serviceType: 'image',
    provider: 'minimax',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'minimax-image-01',
    requiresApiKey: true,
  },
  {
    name: 'gemini-image',
    label: 'Google Gemini',
    serviceType: 'image',
    provider: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash-exp',
    requiresApiKey: true,
    apiKeyHint: 'AIza...',
  },
  {
    name: 'volcengine-image',
    label: 'VolcEngine (ByteDance)',
    serviceType: 'image',
    provider: 'volcengine',
    defaultBaseUrl: 'https://visual.volcengineapi.com',
    defaultModel: 'seedream-3',
    requiresApiKey: true,
  },
  {
    name: 'ali-image',
    label: 'Aliyun Tongyi',
    serviceType: 'image',
    provider: 'ali',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    defaultModel: 'wanx-v1',
    requiresApiKey: true,
  },
  {
    name: 'lovart-image',
    label: 'Lovart',
    serviceType: 'image',
    provider: 'lovart',
    defaultBaseUrl: 'https://lgw.lovart.ai',
    defaultModel: 'generate_image_seedream_v5',
    requiresApiKey: true,
    apiKeyHint: 'access_key:secret_key',
  },

  // ── Video ──
  {
    name: 'minimax-video',
    label: 'MiniMax Video',
    serviceType: 'video',
    provider: 'minimax',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'minimax-video-01',
    requiresApiKey: true,
  },
  {
    name: 'volcengine-video',
    label: 'VolcEngine Seedance',
    serviceType: 'video',
    provider: 'volcengine',
    defaultBaseUrl: 'https://visual.volcengineapi.com',
    defaultModel: 'seedance-1-0-lite-t2v-250428',
    requiresApiKey: true,
  },
  {
    name: 'ali-video',
    label: 'Aliyun Video',
    serviceType: 'video',
    provider: 'ali',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    defaultModel: 'wanx2.1-t2v-turbo',
    requiresApiKey: true,
  },
  {
    name: 'vidu-video',
    label: 'Vidu',
    serviceType: 'video',
    provider: 'vidu',
    defaultBaseUrl: 'https://api.vidu.com',
    defaultModel: 'vidu2.0',
    requiresApiKey: true,
  },
  {
    name: 'lovart-video',
    label: 'Lovart Video',
    serviceType: 'video',
    provider: 'lovart',
    defaultBaseUrl: 'https://lgw.lovart.ai',
    defaultModel: 'generate_video_seedance_v2_0',
    requiresApiKey: true,
    apiKeyHint: 'access_key:secret_key',
  },

  // ── Audio / TTS ──
  {
    name: 'edge-tts',
    label: 'Edge TTS (Free)',
    serviceType: 'audio',
    provider: 'edge',
    defaultBaseUrl: '',
    defaultModel: 'edge-tts',
    requiresApiKey: false,
  },
  {
    name: 'openai-tts',
    label: 'OpenAI TTS',
    serviceType: 'audio',
    provider: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'tts-1',
    requiresApiKey: true,
    apiKeyHint: 'sk-...',
  },
  {
    name: 'minimax-tts',
    label: 'MiniMax TTS',
    serviceType: 'audio',
    provider: 'minimax',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'minimax-tts-01',
    requiresApiKey: true,
  },
];

/**
 * Get presets filtered by service type.
 */
export function getPresetsForService(
  serviceType: ProviderPreset['serviceType'],
): ProviderPreset[] {
  return PROVIDER_PRESETS.filter((p) => p.serviceType === serviceType);
}

/**
 * Get a specific preset by name.
 */
export function getPreset(name: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.name === name);
}
