/**
 * Models Listing API
 * GET — list available models from a provider's API.
 *
 * Supports OpenAI-compatible /models endpoints (OpenAI, OpenRouter, DeepSeek, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseUrl = searchParams.get('baseUrl');
  const apiKey = searchParams.get('apiKey');

  if (!baseUrl) {
    return NextResponse.json(
      { error: 'baseUrl is required' },
      { status: 400 },
    );
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Normalize URL — append /models if not present
    let modelsUrl = baseUrl.replace(/\/+$/, '');
    if (!modelsUrl.endsWith('/models')) {
      // Remove trailing paths like /chat/completions to get base
      modelsUrl = modelsUrl.replace(/\/chat\/completions$/, '');
      modelsUrl += '/models';
    }

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(
        { status: response.status, url: modelsUrl },
        'Model listing failed',
      );
      return NextResponse.json(
        { error: `Provider returned ${response.status}: ${errorText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await response.json();

    // OpenAI-compatible format: { data: [{ id: "model-name", ... }] }
    const models = Array.isArray(data?.data)
      ? data.data
          .map((m: Record<string, unknown>) => ({
            id: m.id || m.name,
            name: m.name || m.id,
            owned_by: m.owned_by || m.owner || '',
          }))
          .filter((m: { id: string }) => m.id)
      : [];

    return NextResponse.json({ models });
  } catch (error) {
    logger.error({ error, baseUrl }, 'Model listing error');
    return NextResponse.json(
      { error: 'Failed to fetch models from provider' },
      { status: 500 },
    );
  }
}
