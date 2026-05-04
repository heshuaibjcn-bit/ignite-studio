import { NextRequest } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { JOB_STATUS } from '@/constants/job';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';

/**
 * POST /api/v1/jobs/[id]/cancel
 * Cancel a queued or running job.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskCenter = new TaskCenterRepository();
    const detail = await taskCenter.getJobDetail(id);

    if (!detail) {
      return apiNotFound('Job', id);
    }

    switch (detail.job.status) {
      case JOB_STATUS.QUEUED: {
        const job = await taskCenter.cancelQueuedJob(id);
        return apiSuccess({ job, steps_cancelled: true });
      }
      case JOB_STATUS.RUNNING: {
        const job = await taskCenter.requestCancelRunningJob(id);
        return apiSuccess({ job, cancel_requested: true });
      }
      default:
        return apiError(
          'INVALID_STATE',
          `Cannot cancel job in status: ${detail.job.status}`,
          409,
        );
    }
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
