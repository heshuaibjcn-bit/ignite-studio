import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { aiServiceConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';
import { encrypt, maskApiKey } from '@/lib/encryption';

interface Props {
  params: Promise<{ id: string }>;
}

/** GET /api/v1/ai-configs/[id] — get a single config */
export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(aiServiceConfigs).where(eq(aiServiceConfigs.id, id));
    if (rows.length === 0) return apiNotFound('Config', id);

    const config = rows[0];
    return apiSuccess({
      config: {
        ...config,
        apiKeyEncrypted: maskApiKey(config.apiKeyEncrypted),
      },
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** PATCH /api/v1/ai-configs/[id] — update a config */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const updates: Record<string, unknown> = { updatedAt: now };

    if (body.name !== undefined) updates.name = body.name;
    if (body.serviceType !== undefined) updates.serviceType = body.serviceType;
    if (body.provider !== undefined) updates.provider = body.provider;
    if (body.model !== undefined) updates.model = body.model;
    if (body.apiBase !== undefined) updates.apiBase = body.apiBase;
    if (body.apiKey !== undefined) updates.apiKeyEncrypted = body.apiKey ? encrypt(body.apiKey) : null;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.configPayload !== undefined) updates.configPayload = JSON.stringify(body.configPayload);

    await db.update(aiServiceConfigs).set(updates).where(eq(aiServiceConfigs.id, id));
    return apiSuccess({ updated: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** DELETE /api/v1/ai-configs/[id] — delete a config */
export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(aiServiceConfigs).where(eq(aiServiceConfigs.id, id));
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
