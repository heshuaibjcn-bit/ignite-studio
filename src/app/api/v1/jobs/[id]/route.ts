import { NextRequest, NextResponse } from 'next/server';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { JobStepItemsRepository } from '@/db/repositories/job-step-items.repository';

/**
 * GET /api/v1/jobs/[id]
 * Returns job detail: job + steps + events + step items (for fan-out) + summary.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const taskCenter = new TaskCenterRepository();
    const summary = await taskCenter.summarizeJob(id);

    if (!summary) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'NOT_FOUND', message: `Job ${id} not found` } },
        { status: 404 },
      );
    }

    const detail = await taskCenter.getJobDetail(id);

    // Fetch step items for fan-out steps
    const stepItemsRepo = new JobStepItemsRepository();
    const stepItems = detail ? await stepItemsRepo.listByJobId(id) : [];

    return NextResponse.json({
      success: true,
      data: {
        job: summary.job,
        summary: summary.summary,
        steps: detail?.steps ?? [],
        events: detail?.events ?? [],
        stepItems,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
