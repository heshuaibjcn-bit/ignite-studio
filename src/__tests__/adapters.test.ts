/**
 * Adapter contract tests — verify each adapter handles sync/async responses correctly.
 * Also tests registry behavior, encryption, and SSRF protection.
 */
import { describe, it, expect } from 'vitest';
import { getImageAdapter, getVideoAdapter, getTTSAdapter } from '@/services/adapters/registry';
import { OpenAIImageAdapter } from '@/services/adapters/openai-image';
import { MiniMaxImageAdapter } from '@/services/adapters/minimax-image';
import { MiniMaxVideoAdapter } from '@/services/adapters/minimax-video';
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';

const MOCK_CONFIG = {
  provider: 'test',
  baseUrl: 'https://api.example.com',
  apiKey: 'test-key-123',
  model: 'test-model',
};

// ── Registry ──

describe('Adapter Registry', () => {
  it('returns correct adapter for known image providers', () => {
    const openai = getImageAdapter('openai');
    expect(openai).toBeInstanceOf(OpenAIImageAdapter);

    const minimax = getImageAdapter('minimax');
    expect(minimax).toBeInstanceOf(MiniMaxImageAdapter);
  });

  it('throws on unknown image provider', () => {
    expect(() => getImageAdapter('unknown_provider')).toThrow(/Unknown image provider/);
  });

  it('returns correct adapter for known video providers', () => {
    const minimax = getVideoAdapter('minimax');
    expect(minimax).toBeInstanceOf(MiniMaxVideoAdapter);
  });

  it('throws on unknown video provider', () => {
    expect(() => getVideoAdapter('unknown')).toThrow(/Unknown video provider/);
  });

  it('throws on unknown TTS provider', () => {
    expect(() => getTTSAdapter('unknown')).toThrow(/Unknown TTS provider/);
  });
});

// ── OpenAI Image Adapter ──

describe('OpenAIImageAdapter', () => {
  const adapter = new OpenAIImageAdapter();

  it('builds correct generate request', () => {
    const req = adapter.buildGenerateRequest(MOCK_CONFIG, {
      id: 'test_123',
      prompt: 'a cute cat',
      size: '1024x1024',
    });

    expect(req.url).toBe('https://api.example.com/v1/images/generations');
    expect(req.method).toBe('POST');
    expect(req.headers['Authorization']).toBe('Bearer test-key-123');
    expect(req.body).toMatchObject({ prompt: 'a cute cat', size: '1024x1024', n: 1 });
  });

  it('parses sync response correctly', () => {
    const result = adapter.parseGenerateResponse({
      data: [{ url: 'https://cdn.example.com/image.png' }],
    });
    expect(result.isAsync).toBe(false);
    expect(result.imageUrl).toBe('https://cdn.example.com/image.png');
  });

  it('extracts image URL from response', () => {
    const url = adapter.extractImageUrl({
      data: [{ url: 'https://cdn.example.com/img.png' }],
    });
    expect(url).toBe('https://cdn.example.com/img.png');
  });

  it('returns null for missing image URL', () => {
    expect(adapter.extractImageUrl({ data: [] })).toBeNull();
    expect(adapter.extractImageUrl({ data: [{}] })).toBeNull();
  });

  it('throws on poll request (sync-only adapter)', () => {
    expect(() => adapter.buildPollRequest(MOCK_CONFIG, 'task_123')).toThrow(/synchronous/);
  });
});

// ── MiniMax Image Adapter ──

describe('MiniMaxImageAdapter', () => {
  const adapter = new MiniMaxImageAdapter();

  it('builds correct generate request with size', () => {
    const req = adapter.buildGenerateRequest(MOCK_CONFIG, {
      id: 'test_456',
      prompt: 'a landscape',
      size: '1024x576',
    });

    expect(req.url).toContain('/v1/image_generation');
    expect(req.body).toMatchObject({ prompt: 'a landscape', aspect_ratio: '16:9' });
  });

  it('parses sync response (images returned directly)', () => {
    const result = adapter.parseGenerateResponse({
      data: [{ url: 'https://cdn.minimax.ai/img.png' }],
    });
    expect(result.isAsync).toBe(false);
    expect(result.imageUrl).toBe('https://cdn.minimax.ai/img.png');
  });

  it('parses async response (task_id returned)', () => {
    const result = adapter.parseGenerateResponse({
      task_id: 'task_abc123',
    });
    expect(result.isAsync).toBe(true);
    expect(result.taskId).toBe('task_abc123');
  });

  it('parses poll response — completed', () => {
    const result = adapter.parsePollResponse({
      status: 'Success',
      data: [{ url: 'https://cdn.minimax.ai/done.png' }],
    });
    expect(result.status).toBe('completed');
    expect(result.imageUrl).toBe('https://cdn.minimax.ai/done.png');
  });

  it('parses poll response — failed', () => {
    const result = adapter.parsePollResponse({
      status: 'Failed',
      base_resp: { status_msg: 'Content policy violation' },
    });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Content policy violation');
  });

  it('parses poll response — processing', () => {
    const result = adapter.parsePollResponse({ status: 'Processing' });
    expect(result.status).toBe('processing');
  });

  it('converts size to aspect ratio correctly', () => {
    const req1 = adapter.buildGenerateRequest(MOCK_CONFIG, { id: 't', prompt: 'x', size: '1024x1024' });
    expect((req1.body as Record<string, unknown>).aspect_ratio).toBe('1:1');

    const req2 = adapter.buildGenerateRequest(MOCK_CONFIG, { id: 't', prompt: 'x', size: '512x1024' });
    expect((req2.body as Record<string, unknown>).aspect_ratio).toBe('1:2');
  });
});

// ── MiniMax Video Adapter ──

describe('MiniMaxVideoAdapter', () => {
  const adapter = new MiniMaxVideoAdapter();

  it('builds correct generate request with reference image', () => {
    const req = adapter.buildGenerateRequest(MOCK_CONFIG, {
      id: 'test_789',
      prompt: 'a dog running',
      referenceMode: 'single',
      imageUrl: 'https://cdn.example.com/ref.png',
    });

    expect(req.body).toMatchObject({
      prompt: 'a dog running',
      first_frame_image: 'https://cdn.example.com/ref.png',
    });
  });

  it('parses async response with task_id', () => {
    const result = adapter.parseGenerateResponse({ task_id: 'vid_task_001' });
    expect(result.isAsync).toBe(true);
    expect(result.taskId).toBe('vid_task_001');
  });

  it('parses poll response — completed', () => {
    const result = adapter.parsePollResponse({
      status: 'Success',
      file_id: 'file_abc123',
    });
    expect(result.status).toBe('completed');
    expect(result.videoUrl).toBe('file_abc123');
  });

  it('parses poll response — failed', () => {
    const result = adapter.parsePollResponse({
      status: 'Failed',
      base_resp: { status_msg: 'Video too long' },
    });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Video too long');
  });
});

// ── Encryption ──

describe('Encryption utility', () => {
  it('masks API key correctly', () => {
    expect(maskApiKey('sk-1234567890abcdef')).toBe('••••cdef');
    expect(maskApiKey('short')).toBe('••••');
    expect(maskApiKey(null)).toBeNull();
    expect(maskApiKey('enc:iv:data')).toBe('••••••••');
  });

  it('passes through plaintext when ENCRYPTION_KEY not set', () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(encrypt('my-api-key')).toBe('my-api-key');
    expect(decrypt('my-api-key')).toBe('my-api-key');
    if (original) process.env.ENCRYPTION_KEY = original;
  });
});
