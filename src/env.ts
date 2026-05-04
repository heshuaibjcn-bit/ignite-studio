/**
 * Environment variable validation — Zod schema.
 * Fails fast at startup if required vars are missing or invalid.
 */
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('./data/ignite-studio.db'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  _env = parsed.data;
  return _env;
}
