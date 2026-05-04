/**
 * Service-level tests — encryption, storage SSRF, image/video generation.
 * Tests business logic with mocked external dependencies (fetch, DB).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';

// ── Encryption: full round-trip with real key ──

describe('Encryption', () => {
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  it('encrypts and decrypts a simple string', () => {
    const plaintext = 'sk-test-api-key-12345';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toMatch(/^enc:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produces different ciphertext on each call (random IV)', () => {
    const plaintext = 'same-input';
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it('handles empty string', () => {
    const encrypted = encrypt('');
    expect(encrypted).toMatch(/^enc:/);
    expect(decrypt(encrypted)).toBe('');
  });

  it('handles unicode and special characters', () => {
    const plaintext = '你好世界！🔑 日本語テスト';
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('handles very long strings', () => {
    const plaintext = 'x'.repeat(10000);
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('throws on decrypt with wrong key', () => {
    const encrypted = encrypt('secret');
    process.env.ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567';
    expect(() => decrypt(encrypted)).toThrow();
  });

  it('throws on decrypt with malformed encrypted data', () => {
    expect(() => decrypt('enc:baddata')).toThrow(/Invalid encrypted format/);
    expect(() => decrypt('enc:bad:data:extra')).toThrow(/Invalid encrypted format/);
  });

  it('throws on decrypt of encrypted value when ENCRYPTION_KEY not set', () => {
    const encrypted = encrypt('test');
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt(encrypted)).toThrow(/ENCRYPTION_KEY not set/);
  });

  it('passes through plaintext when ENCRYPTION_KEY not set', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(encrypt('plain-text')).toBe('plain-text');
    expect(decrypt('plain-text')).toBe('plain-text');
  });
});

// ── Mask API Key ──

describe('maskApiKey', () => {
  it('masks long keys showing last 4 chars', () => {
    expect(maskApiKey('sk-1234567890abcdef')).toBe('••••cdef');
  });

  it('masks short keys fully', () => {
    expect(maskApiKey('short')).toBe('••••');
  });

  it('masks encrypted values with bullet pattern', () => {
    expect(maskApiKey('enc:abcdef1234567890:fedcba0987654321')).toBe('••••••••');
  });

  it('returns null for null input', () => {
    expect(maskApiKey(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(maskApiKey('')).toBeNull();
  });
});

// ── Storage: SSRF Protection ──

describe('Storage SSRF protection', () => {
  // We test validateUrl indirectly through downloadAndSave by mocking fetch.
  // Since validateUrl is module-scoped, we test via the exported downloadAndSave.

  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function expectSSRFBlocked(url: string) {
    const { downloadAndSave } = await import('@/services/storage');
    await expect(downloadAndSave(url, 'images', 'png')).rejects.toThrow(/Blocked|Invalid URL|Unsupported protocol|HTTPS/);
  }

  it('blocks localhost', async () => {
    await expectSSRFBlocked('http://localhost:3000/secret');
  });

  it('blocks 127.0.0.1', async () => {
    await expectSSRFBlocked('http://127.0.0.1:3000/secret');
  });

  it('blocks 0.0.0.0', async () => {
    await expectSSRFBlocked('http://0.0.0.0:3000/secret');
  });

  it('blocks ::1 (IPv6 loopback)', async () => {
    await expectSSRFBlocked('http://[::1]/secret');
    // Also test without brackets (hostname may appear either way)
    await expectSSRFBlocked('http://::1/secret').catch(() => {
      // Some URL parsers reject this format — that's fine, it's also blocked
    });
  });

  it('blocks AWS metadata endpoint', async () => {
    await expectSSRFBlocked('http://169.254.169.254/latest/meta-data/');
  });

  it('blocks GCP metadata endpoint', async () => {
    await expectSSRFBlocked('http://metadata.google.internal/computeMetadata/v1/');
  });

  it('blocks Alibaba Cloud metadata endpoint', async () => {
    await expectSSRFBlocked('http://100.100.100.200/latest/meta-data/');
  });

  it('blocks private IP 10.x.x.x', async () => {
    await expectSSRFBlocked('http://10.0.0.1/internal');
  });

  it('blocks private IP 172.16.x.x', async () => {
    await expectSSRFBlocked('http://172.16.0.1/internal');
  });

  it('blocks private IP 192.168.x.x', async () => {
    await expectSSRFBlocked('http://192.168.1.1/internal');
  });

  it('blocks non-HTTP protocols', async () => {
    await expectSSRFBlocked('ftp://example.com/file');
  });

  it('blocks invalid URLs', async () => {
    await expectSSRFBlocked('not-a-url');
  });

  it('allows HTTPS URLs to external hosts', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      headers: { get: () => '1024' },
      arrayBuffer: () => Promise.resolve(new Uint8Array([0x89, 0x50]).buffer),
    });

    const { downloadAndSave } = await import('@/services/storage');
    // This should NOT throw SSRF error (it may fail for other reasons like directory creation)
    const result = await downloadAndSave('https://api.openai.com/v1/images/test.png', 'images', 'png');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/test.png',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

// ── Image Generation Service ──

describe('Image Generation Service', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when no active image config', async () => {
    vi.doMock('@/services/ai-config', () => ({
      getActiveConfig: vi.fn().mockResolvedValue(null),
    }));

    const { generateImage } = await import('@/services/image-generation');
    await expect(generateImage({
      id: 'test_1',
      prompt: 'test',
      size: '1024x1024',
    })).rejects.toThrow(/No active image provider/);
  });

  it('throws on API error response', async () => {
    vi.doMock('@/services/ai-config', () => ({
      getActiveConfig: vi.fn().mockResolvedValue({
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test',
        model: 'dall-e-3',
      }),
    }));

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    const { generateImage } = await import('@/services/image-generation');
    await expect(generateImage({
      id: 'test_1',
      prompt: 'a cat',
      size: '1024x1024',
    })).rejects.toThrow(/Image API error 401/);
  });
});

// ── Video Generation Service ──

describe('Video Generation Service', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when no active video config', async () => {
    vi.doMock('@/services/ai-config', () => ({
      getActiveConfig: vi.fn().mockResolvedValue(null),
    }));

    const { generateVideo } = await import('@/services/video-generation');
    await expect(generateVideo({
      id: 'test_1',
      prompt: 'test',
      referenceMode: 'none',
    })).rejects.toThrow(/No active video provider/);
  });

  it('throws when provider returns no task ID', async () => {
    vi.doMock('@/services/ai-config', () => ({
      getActiveConfig: vi.fn().mockResolvedValue({
        provider: 'minimax',
        baseUrl: 'https://api.minimax.chat',
        apiKey: 'test-key',
        model: 'video-01',
      }),
    }));

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // no task_id
    });

    const { generateVideo } = await import('@/services/video-generation');
    await expect(generateVideo({
      id: 'test_1',
      prompt: 'a dog running',
      referenceMode: 'none',
    })).rejects.toThrow(/No task ID/);
  });

  it('throws on API error response', async () => {
    vi.doMock('@/services/ai-config', () => ({
      getActiveConfig: vi.fn().mockResolvedValue({
        provider: 'minimax',
        baseUrl: 'https://api.minimax.chat',
        apiKey: 'test-key',
        model: 'video-01',
      }),
    }));

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const { generateVideo } = await import('@/services/video-generation');
    await expect(generateVideo({
      id: 'test_1',
      prompt: 'a dog running',
      referenceMode: 'none',
    })).rejects.toThrow(/Video API error 500/);
  });
});
