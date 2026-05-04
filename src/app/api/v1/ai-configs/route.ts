import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { aiServiceConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { encrypt, maskApiKey } from '@/lib/encryption';
import { nanoid } from 'nanoid';

/** GET /api/v1/ai-configs — list all AI service configs */
export async function GET() {
  try {
    const db = getDb();
    const configs = await db.select().from(aiServiceConfigs).all();
    // Mask API keys in response
    const masked = configs.map(c => ({
      ...c,
      apiKeyEncrypted: maskApiKey(c.apiKeyEncrypted),
    }));
    return apiSuccess({ configs: masked });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** POST /api/v1/ai-configs — create a new AI service config */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.serviceType || !body.provider) {
      return apiError('VALIDATION_FAILED', 'name, serviceType, and provider are required', 400);
    }

    const db = getDb();
    const id = `aiconf_${nanoid(21)}`;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);

    // Encrypt API key before storage
    const encryptedKey = body.apiKey ? encrypt(body.apiKey) : null;

    await db.insert(aiServiceConfigs).values({
      id,
      name: body.name,
      serviceType: body.serviceType,
      provider: body.provider,
      model: body.model ?? null,
      apiBase: body.apiBase ?? null,
      apiKeyEncrypted: encryptedKey,
      configPayload: body.configPayload ? JSON.stringify(body.configPayload) : null,
      isActive: body.isActive ?? true,
      priority: body.priority ?? 100,
      createdAt: now,
      updatedAt: now,
    });

    return apiSuccess({ id }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
