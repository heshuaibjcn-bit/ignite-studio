/**
 * Simple encryption utility for API keys at rest.
 * Uses AES-256-CBC when ENCRYPTION_KEY is set, passes through plaintext otherwise.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt a plaintext string. Returns the encrypted value prefixed with 'enc:'.
 * If ENCRYPTION_KEY is not set, returns the plaintext unchanged (with a warning).
 */
export function encrypt(plaintext: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('ENCRYPTION_KEY not set — API keys stored in plaintext. Set ENCRYPTION_KEY for production.');
    }
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value. Handles both encrypted ('enc:iv:data') and plaintext formats.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith('enc:')) {
    // Plaintext — not encrypted (legacy or ENCRYPTION_KEY not set)
    return ciphertext;
  }

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Cannot decrypt: ENCRYPTION_KEY not set but encrypted data found');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask an API key for display — shows only last 4 characters.
 */
export function maskApiKey(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('enc:')) return '••••••••';
  if (value.length <= 8) return '••••';
  return '••••' + value.slice(-4);
}
