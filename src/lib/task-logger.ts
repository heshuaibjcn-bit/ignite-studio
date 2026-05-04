/**
 * Task Logger — structured, colorized console logging for pipeline tasks.
 * Sanitizes secrets, truncates base64/blobs, and redacts URLs.
 */
import { logger } from './logger';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value;
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        ['authorization', 'api_key', 'apikey', 'token', 'access_token'].includes(key) ||
        lower.includes('authorization') ||
        lower.includes('token') ||
        lower.includes('apikey')
      ) {
        out[key] = '***';
        continue;
      }
      if (typeof raw === 'string' && (lower === 'url' || lower.endsWith('url'))) {
        out[key] = redactUrl(raw);
        continue;
      }
      if (
        typeof raw === 'string' &&
        (lower === 'data' ||
          lower === 'b64_json' ||
          lower.includes('base64') ||
          lower.includes('audiohex') ||
          raw.startsWith('data:image/'))
      ) {
        out[key] = truncateString(raw, 48);
        continue;
      }
      out[key] = sanitizeValue(raw, depth + 1);
    }
    return out;
  }
  return value;
}

function truncateString(value: string, edge = 120) {
  if (value.length <= edge * 2 + 24) return value;
  return `${value.slice(0, edge)}...<trimmed ${value.length} chars>...${value.slice(-edge)}`;
}

function redactUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    for (const key of ['key', 'api_key', 'apikey', 'token', 'access_token']) {
      if (url.searchParams.has(key)) url.searchParams.set(key, '***');
    }
    return url.toString();
  } catch {
    return rawUrl.replace(
      /([?&](?:key|api_key|apikey|token|access_token)=)[^&]+/gi,
      '$1***',
    );
  }
}

export function logTask(
  scope: string,
  action: string,
  meta?: Record<string, unknown>,
  level: LogLevel = 'info',
) {
  const sanitized = meta ? (sanitizeValue(meta) as Record<string, unknown>) : undefined;
  switch (level) {
    case 'error':
      logger.error({ scope, action, ...sanitized }, `[${scope}] ${action}`);
      break;
    case 'warn':
      logger.warn({ scope, action, ...sanitized }, `[${scope}] ${action}`);
      break;
    case 'debug':
      logger.debug({ scope, action, ...sanitized }, `[${scope}] ${action}`);
      break;
    default:
      logger.info({ scope, action, ...sanitized }, `[${scope}] ${action}`);
  }
}

export function logTaskStart(
  scope: string,
  action: string,
  meta?: Record<string, unknown>,
) {
  logTask(scope, `START ${action}`, meta);
}

export function logTaskProgress(
  scope: string,
  action: string,
  meta?: Record<string, unknown>,
) {
  logTask(scope, action, meta);
}

export function logTaskSuccess(
  scope: string,
  action: string,
  meta?: Record<string, unknown>,
) {
  logTask(scope, `DONE ${action}`, meta);
}

export function logTaskWarn(
  scope: string,
  action: string,
  meta?: Record<string, unknown>,
) {
  logTask(scope, action, meta, 'warn');
}

export function logTaskError(
  scope: string,
  action: string,
  meta?: Record<string, unknown>,
) {
  logTask(scope, `ERROR ${action}`, meta, 'error');
}

export function logTaskPayload(scope: string, action: string, payload: unknown) {
  const sanitized = sanitizeValue(payload);
  logger.debug({ scope, action, payload: sanitized }, `[${scope}] ${action}`);
}
