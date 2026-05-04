import { NextRequest } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { apiSuccess, apiInternalError } from '@/lib/api-response';

/**
 * GET /api/v1/jobs
 * List jobs with optional filters.
 *
 * Query params: status, bizType, bizId, limit (default 20), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    const bizType = searchParams.get('bizType') ?? undefined;
    const bizId = searchParams.get('bizId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const taskCenter = new TaskCenterRepository();
    const jobs = await taskCenter.listJobs({ status, bizType, bizId, limit, offset });

    return apiSuccess({ jobs, count: jobs.length, limit, offset });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
