import { NextRequest } from 'next/server';
import { ProductionsRepository } from '@/db/repositories/productions.repository';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';

/** GET /api/v1/productions/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repo = new ProductionsRepository();
    const production = await repo.findById(id);
    if (!production) return apiNotFound('Production', id);
    return apiSuccess({ production });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
