/**
 * Structured logger — Pino instance.
 *
 * - Reads LOG_LEVEL from env (default: 'info').
 * - Pretty print in development, JSON in production.
 */
import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

const isDev = process.env.NODE_ENV !== 'production';

const transport = isDev
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
  : undefined;

export const logger = pino({
  level,
  ...(transport ? { transport } : {}),
  base: {
    service: 'ignite-studio',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
