/**
 * Local Storage Service
 * Manages generated files (images, videos, audio) on the local filesystem.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { nanoid } from 'nanoid';

const DATA_DIR = resolve(process.cwd(), 'data', 'static');

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save a generated file to local storage.
 * @returns The relative path from DATA_DIR (e.g., "images/abc123.png")
 */
export function saveGeneratedFile(
  buffer: Buffer,
  type: 'images' | 'videos' | 'audio' | 'subtitles' | 'uploads',
  ext: string,
): string {
  const dir = join(DATA_DIR, type);
  ensureDir(dir);

  const filename = `${nanoid(12)}.${ext}`;
  const fullPath = join(dir, filename);
  writeFileSync(fullPath, buffer);

  return `${type}/${filename}`;
}

/**
 * Get the full filesystem path for a stored file.
 */
export function getFullPath(relativePath: string): string {
  return join(DATA_DIR, relativePath);
}

/**
 * Read a stored file.
 */
export function readStoredFile(relativePath: string): Buffer {
  return readFileSync(join(DATA_DIR, relativePath));
}

/**
 * Check if a stored file exists.
 */
export function fileExists(relativePath: string): boolean {
  return existsSync(join(DATA_DIR, relativePath));
}

/**
 * Validate that a URL is safe to fetch (prevents SSRF).
 * Blocks internal/private network addresses and non-HTTPS in production.
 */
function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Only allow https (or http in development)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }
  if (parsed.protocol === 'http:' && process.env.NODE_ENV === 'production') {
    throw new Error('Only HTTPS URLs are allowed in production');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block internal/private network addresses
  const blocked = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]',
    '169.254.169.254', // AWS/GCP metadata
    'metadata.google.internal',
    '100.100.100.200', // Alibaba Cloud metadata
  ];
  if (blocked.includes(hostname)) {
    throw new Error(`Blocked internal hostname: ${hostname}`);
  }

  // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      throw new Error(`Blocked private IP: ${hostname}`);
    }
  }
}

/**
 * Download a file from a URL and save it locally.
 */
export async function downloadAndSave(
  url: string,
  type: 'images' | 'videos' | 'audio',
  ext: string,
): Promise<string> {
  validateUrl(url);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(120000), // 2 min timeout
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 500 * 1024 * 1024) {
    throw new Error(`File too large: ${contentLength} bytes (max 500MB)`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return saveGeneratedFile(buffer, type, ext);
}
