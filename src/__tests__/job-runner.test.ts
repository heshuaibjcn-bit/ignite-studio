/**
 * JobRunner tests — focus on resumePendingTasks behavior.
 * Mocks the TaskCenterRepository and JobStepsRepository.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STEP_STATUS } from '@/constants/step';
import { JOB_STATUS } from '@/constants/job';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Create mock repositories
function createMockTaskCenter(staleSteps: any[] = [], jobLookup: Record<string, any> = {}) {
  const markStepFailed = vi.fn();
  const resetStepToQueued = vi.fn();

  return {
    taskCenter: {
      jobStepsRepo: {
        findStaleRunningSteps: vi.fn().mockResolvedValue(staleSteps),
        resetStepToQueued,
      },
      jobsRepo: {
        findById: vi.fn().mockImplementation((jobId: string) => {
          return Promise.resolve(jobLookup[jobId] ?? null);
        }),
      },
      markStepFailed,
    },
    mocks: { markStepFailed, resetStepToQueued },
  };
}

describe('JobRunner.resumePendingTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('does nothing when no stale steps found', async () => {
    const { taskCenter, mocks } = createMockTaskCenter([]);
    const { JobRunner } = await import('@/services/job-runner');
    const runner = new JobRunner(taskCenter as any, new Map());

    await runner.resumePendingTasks();

    expect(taskCenter.jobStepsRepo.findStaleRunningSteps).toHaveBeenCalled();
    expect(mocks.resetStepToQueued).not.toHaveBeenCalled();
    expect(mocks.markStepFailed).not.toHaveBeenCalled();
  });

  it('resets stale steps to QUEUED when parent job is RUNNING', async () => {
    const staleSteps = [
      { id: 'step_1', jobId: 'job_1', stepCode: 'video_generate', executionState: 'normal' },
      { id: 'step_2', jobId: 'job_1', stepCode: 'frame_image_generate', executionState: 'waiting_polling' },
    ];
    const { taskCenter, mocks } = createMockTaskCenter(staleSteps, {
      job_1: { id: 'job_1', status: JOB_STATUS.RUNNING },
    });

    const { JobRunner } = await import('@/services/job-runner');
    const runner = new JobRunner(taskCenter as any, new Map());

    await runner.resumePendingTasks();

    expect(mocks.resetStepToQueued).toHaveBeenCalledTimes(2);
    expect(mocks.resetStepToQueued).toHaveBeenCalledWith('step_1');
    expect(mocks.resetStepToQueued).toHaveBeenCalledWith('step_2');
  });

  it('marks stale steps as FAILED when parent job is not RUNNING', async () => {
    const staleSteps = [
      { id: 'step_1', jobId: 'job_completed', stepCode: 'video_generate', executionState: 'normal' },
    ];
    const { taskCenter, mocks } = createMockTaskCenter(staleSteps, {
      job_completed: { id: 'job_completed', status: JOB_STATUS.SUCCESS },
    });

    const { JobRunner } = await import('@/services/job-runner');
    const runner = new JobRunner(taskCenter as any, new Map());

    await runner.resumePendingTasks();

    expect(mocks.resetStepToQueued).not.toHaveBeenCalled();
    expect(mocks.markStepFailed).toHaveBeenCalledWith(
      'job_completed', 'step_1', 'STALE', 'Job no longer running on server restart',
    );
  });

  it('marks stale steps as FAILED when parent job not found', async () => {
    const staleSteps = [
      { id: 'step_orphan', jobId: 'job_deleted', stepCode: 'image_generate', executionState: 'normal' },
    ];
    const { taskCenter, mocks } = createMockTaskCenter(staleSteps, {});

    const { JobRunner } = await import('@/services/job-runner');
    const runner = new JobRunner(taskCenter as any, new Map());

    await runner.resumePendingTasks();

    expect(mocks.markStepFailed).toHaveBeenCalledWith(
      'job_deleted', 'step_orphan', 'STALE', 'Job no longer running on server restart',
    );
    expect(mocks.resetStepToQueued).not.toHaveBeenCalled();
  });

  it('handles mixed scenarios — some running, some not', async () => {
    const staleSteps = [
      { id: 'step_1', jobId: 'job_running', stepCode: 'script_rewrite', executionState: 'normal' },
      { id: 'step_2', jobId: 'job_failed', stepCode: 'video_generate', executionState: 'normal' },
      { id: 'step_3', jobId: 'job_running', stepCode: 'frame_image_generate', executionState: 'waiting_polling' },
    ];
    const { taskCenter, mocks } = createMockTaskCenter(staleSteps, {
      job_running: { id: 'job_running', status: JOB_STATUS.RUNNING },
      job_failed: { id: 'job_failed', status: JOB_STATUS.FAILED },
    });

    const { JobRunner } = await import('@/services/job-runner');
    const runner = new JobRunner(taskCenter as any, new Map());

    await runner.resumePendingTasks();

    // step_1 and step_3 should be reset (parent job running)
    expect(mocks.resetStepToQueued).toHaveBeenCalledTimes(2);
    expect(mocks.resetStepToQueued).toHaveBeenCalledWith('step_1');
    expect(mocks.resetStepToQueued).toHaveBeenCalledWith('step_3');

    // step_2 should be marked stale (parent job failed)
    expect(mocks.markStepFailed).toHaveBeenCalledTimes(1);
    expect(mocks.markStepFailed).toHaveBeenCalledWith(
      'job_failed', 'step_2', 'STALE', 'Job no longer running on server restart',
    );
  });

  it('does not throw on repository errors', async () => {
    const { taskCenter } = createMockTaskCenter([]);
    taskCenter.jobStepsRepo.findStaleRunningSteps.mockRejectedValue(new Error('DB connection lost'));

    const { JobRunner } = await import('@/services/job-runner');
    const runner = new JobRunner(taskCenter as any, new Map());

    // Should not throw — errors are caught and logged
    await expect(runner.resumePendingTasks()).resolves.toBeUndefined();
  });
});
