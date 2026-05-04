import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { aiServiceConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';
import { decrypt } from '@/lib/encryption';

interface Props {
  params: Promise<{ id: string }>;
}

/** POST /api/v1/ai-configs/[id]/probe — test provider connectivity */
export async function POST(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(aiServiceConfigs).where(eq(aiServiceConfigs.id, id));
    if (rows.length === 0) return apiNotFound('Config', id);

    const config = rows[0];
    const baseUrl = (config.apiBase ?? '').replace(/\/+$/, '');
    const apiKey = config.apiKeyEncrypted ? decrypt(config.apiKeyEncrypted) : '';

    // For Edge TTS, no connectivity test needed
    if (config.provider === 'edge') {
      return apiSuccess({ reachable: true, provider: 'edge', message: 'Edge TTS is local, no API needed' });
    }

    if (!baseUrl) {
      return apiError('PROBE_FAILED', 'No API base URL configured', 400);
    }

    // Try to reach the provider's models endpoint
    const probeUrl = `${baseUrl}/v1/models`;
    const startMs = Date.now();

    const response = await fetch(probeUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const latencyMs = Date.now() - startMs;

    return apiSuccess({
      reachable: response.ok,
      status: response.status,
      latencyMs,
      provider: config.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return apiSuccess({ reachable: false, error: message });
  }
}
