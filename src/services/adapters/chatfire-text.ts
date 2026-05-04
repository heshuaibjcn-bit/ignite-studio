/**
 * ChatFire Text Provider Adapter
 *
 * ChatFire is an OpenAI-compatible API provider.
 * This adapter reuses the same request/response format as OpenAI.
 */
import type { AIConfig } from './types';

export class ChatFireTextAdapter {
  provider = 'chatfire';

  /**
   * Build a chat completion request for ChatFire.
   * Uses OpenAI-compatible /chat/completions endpoint.
   */
  buildChatRequest(
    config: AIConfig,
    params: {
      model?: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    },
  ) {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    return {
      url: `${baseUrl}/chat/completions`,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: {
        model: params.model || config.model || 'gpt-4o',
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
      },
    };
  }
}
