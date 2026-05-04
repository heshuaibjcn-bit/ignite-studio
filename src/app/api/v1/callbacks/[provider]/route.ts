import { NextRequest } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api-response';

/**
 * POST /api/v1/callbacks/[provider]
 * Generic provider callback endpoint.
 *
 * Body: {
 *   provider_task_id: string,
 *   status: "success" | "failed",
 *   output?: object,          // on success
 *   error_code?: string,      // on failure
 *   error_message?: string    // on failure
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const body = await request.json();

    if (!body.provider_task_id) {
      return apiError('VALIDATION_FAILED', 'provider_task_id is required', 400);
    }

    const taskCenter = new TaskCenterRepository();
    const providerTaskId = body.provider_task_id as string;

    if (body.status === 'success') {
      const step = await taskCenter.handleProviderCallbackSuccess({
        providerTaskId,
        outputSnapshot: body.output ?? undefined,
      });

      if (!step) {
        return apiNotFound('Step with provider_task_id', providerTaskId);
      }

      return apiSuccess({ matched: true, step_id: step.id, status: step.status });
    }

    if (body.status === 'failed') {
      const step = await taskCenter.handleProviderCallbackFailed({
        providerTaskId,
        errorCode: body.error_code ?? null,
        errorMessage: body.error_message ?? null,
      });

      if (!step) {
        return apiNotFound('Step with provider_task_id', providerTaskId);
      }

      return apiSuccess({ matched: true, step_id: step.id, status: step.status });
    }

    return apiError('VALIDATION_FAILED', 'status must be "success" or "failed"', 400);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
