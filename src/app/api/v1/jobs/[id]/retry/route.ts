import { NextRequest } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { JOB_STATUS } from '@/constants/job';
import { DRAMA_PIPELINE_DEFINITIONS } from '@/constants/step';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';
import { nanoid } from 'nanoid';

/**
 * POST /api/v1/jobs/[id]/retry
 * Retry a failed/cancelled/partial_success job by creating a new job with same params.
 *
 * Phase 1.5: always full rerun (all 14 steps fresh).
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

    const { job } = detail;
    const terminalStatuses = [JOB_STATUS.FAILED, JOB_STATUS.CANCELLED, JOB_STATUS.PARTIAL_SUCCESS];

    if (!terminalStatuses.includes(job.status as any)) {
      return apiError(
        'INVALID_STATE',
        `Cannot retry job in status: ${job.status}. Must be one of: ${terminalStatuses.join(', ')}`,
        409,
      );
    }

    // Create fresh pipeline job with same params
    const newJobId = `job_${nanoid(21)}`;
    const newDetail = await taskCenter.createPipelineJob({
      jobId: newJobId,
      bizType: job.bizType,
      bizId: job.bizId,
      runType: job.runType,
      triggerSource: 'retry',
      projectId: job.projectId,
      productionId: job.productionId,
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });

    return apiSuccess({
      original_job_id: id,
      new_job_id: newJobId,
      status: newDetail?.job.status ?? 'queued',
      step_count: newDetail?.steps.length ?? 0,
    }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
