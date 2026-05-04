/**
 * Grid Status API
 * GET — check grid image generation status.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { imageGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const db = getDb();

  const rows = await db
    .select()
    .from(imageGenerations)
    .where(eq(imageGenerations.id, id));

  if (!rows.length) {
    return apiError('NOT_FOUND', `Generation ${id} not found`, 404);
  }

  const row = rows[0];
  return apiSuccess({
    id: row.id,
    status: row.status,
    asset_id: row.assetId,
    error_code: row.errorCode,
    error_message: row.errorMessage,
    prompt_text: row.promptText,
  });
}
