/**
 * AI Config Service
 * Retrieves active provider configurations from the database.
 */
import { getDb } from '@/db/client';
import { aiServiceConfigs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AIConfig } from './adapters/types';
import { decrypt } from '@/lib/encryption';

export type ServiceType = 'text' | 'image' | 'video' | 'audio' | 'asr';

/**
 * Get the highest-priority active config for a service type.
 */
export async function getActiveConfig(serviceType: ServiceType): Promise<AIConfig | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(aiServiceConfigs)
    .where(
      and(
        eq(aiServiceConfigs.serviceType, serviceType),
        eq(aiServiceConfigs.isActive, true),
      )
    )
    .orderBy(desc(aiServiceConfigs.priority))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    provider: row.provider,
    baseUrl: row.apiBase ?? '',
    apiKey: row.apiKeyEncrypted ? decrypt(row.apiKeyEncrypted) : '',
    model: row.model ?? '',
  };
}

/**
 * Normalize text provider base URL for different API conventions.
 * OpenAI uses /v1, Volcengine uses /api/v3, Ali uses /api/v1, etc.
 */
export function getTextProviderBaseUrl(config: AIConfig): string {
  const base = config.baseUrl.replace(/\/+$/, '');
  const provider = config.provider.toLowerCase();

  if (provider === 'volcengine') return `${base}/api/v3`;
  if (provider === 'ali' || provider === 'dashscope') return `${base}/api/v1`;
  // Default: OpenAI-compatible
  return base;
}
