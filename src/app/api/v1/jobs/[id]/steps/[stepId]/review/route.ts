import { NextRequest } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';

/**
 * POST /api/v1/jobs/[id]/steps/[stepId]/review
 * Approve or reject a step in waiting_review state.
 *
 * Body: { action: "approve" | "reject", reason?: string, rollbackToStep?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { id, stepId } = await params;
    const body = await request.json();

    if (!body.action || (body.action !== 'approve' && body.action !== 'reject')) {
      return apiError('VALIDATION_FAILED', 'action must be "approve" or "reject"', 400);
    }

    const taskCenter = new TaskCenterRepository();

    // Verify step belongs to job
    const detail = await taskCenter.getJobDetail(id);
    if (!detail) {
      return apiNotFound('Job', id);
    }

    const step = detail.steps.find((s) => s.id === stepId);
    if (!step) {
      return apiNotFound('Step', stepId);
    }

    if (body.action === 'approve') {
      const result = await taskCenter.approveStep({
        jobId: id,
        stepId,
        reviewer: body.reviewer,
      });

      if (!result) {
        return apiError('INVALID_STATE', 'Step is not in waiting_review state', 409);
      }

      return apiSuccess({ step: result, action: 'approved' });
    }

    // reject
    const result = await taskCenter.rejectStep({
      jobId: id,
      stepId,
      reason: body.reason,
      rollbackToStep: body.rollbackToStep,
    });

    if (!result) {
      return apiError('INVALID_STATE', 'Step is not in waiting_review state', 409);
    }

    return apiSuccess({ step: result, action: 'rejected' });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
