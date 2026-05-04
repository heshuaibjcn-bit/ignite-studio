/**
 * Job Runner — DB-polling pipeline executor.
 *
 * Single-instance, single-process. Polls for queued jobs, claims them,
 * and executes their pipeline steps sequentially using registered step executors.
 *
 * Design principles (from design doc):
 * - Job represents one execution attempt
 * - Pipeline steps execute in order
 * - Steps 7-12 in drama pipeline fan out per-storyboard (via job_step_items)
 * - Retry creates new Job, not reuse
 * - First version: single-instance DB-driven scheduling
 */
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { STEP_STATUS } from '@/constants/step';
import { JOB_STATUS } from '@/constants/job';
import { DRAMA_FAN_OUT_STEPS } from '@/constants/step';
import type { StepExecutor, StepExecutionContext } from './step-executor';
import { logger } from '@/lib/logger';

export interface JobRunnerConfig {
  /** How often to poll for queued jobs (ms). Default: 5000 */
  pollIntervalMs?: number;
  /** Max concurrent jobs. Default: 1 */
  maxConcurrentJobs?: number;
}

export class JobRunner {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly pollIntervalMs: number;
  private readonly maxConcurrentJobs: number;

  constructor(
    private readonly taskCenter: TaskCenterRepository,
    private readonly executors: Map<string, StepExecutor>,
    private readonly config: JobRunnerConfig = {},
  ) {
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
    this.maxConcurrentJobs = config.maxConcurrentJobs ?? 1;
  }

  /** Start polling. */
  start(): void {
    if (this.intervalHandle) return;
    logger.info({ pollIntervalMs: this.pollIntervalMs }, 'JobRunner started');
    this.running = true;
    // Run first tick immediately
    this.tick().catch((err) => logger.error({ err }, 'JobRunner tick error'));
    this.intervalHandle = setInterval(() => {
      this.tick().catch((err) => logger.error({ err }, 'JobRunner tick error'));
    }, this.pollIntervalMs);
  }

  /**
   * Resume pending tasks after a server restart.
   *
   * When the server crashes or restarts, in-memory executor state is lost.
   * Steps that were RUNNING are now stale — no executor is driving them.
   * This method finds those steps and resets them to QUEUED so the regular
   * tick cycle picks them up and re-executes.
   *
   * Idempotent: safe to call multiple times. Only touches RUNNING steps.
   */
  async resumePendingTasks(): Promise<void> {
    try {
      const staleSteps = await this.taskCenter.jobStepsRepo.findStaleRunningSteps();
      if (staleSteps.length === 0) {
        logger.info('No stale running steps found on startup');
        return;
      }

      logger.info({ count: staleSteps.length }, 'Found stale running steps, resetting to QUEUED');

      for (const step of staleSteps) {
        // Only reset steps whose parent job is still RUNNING
        const job = await this.taskCenter.jobsRepo.findById(step.jobId);
        if (!job || job.status !== JOB_STATUS.RUNNING) {
          // Job already completed/failed/cancelled — mark step as failed
          logger.info({ stepId: step.id, stepCode: step.stepCode, jobId: step.jobId }, 'Step belongs to non-running job, marking stale');
          await this.taskCenter.markStepFailed(step.jobId, step.id, 'STALE', 'Job no longer running on server restart');
          continue;
        }

        logger.info({
          stepId: step.id,
          stepCode: step.stepCode,
          jobId: step.jobId,
          executionState: step.executionState,
        }, 'Resetting stale step to QUEUED');

        await this.taskCenter.jobStepsRepo.resetStepToQueued(step.id);
      }

      logger.info('Stale step recovery complete');
    } catch (err) {
      logger.error({ err }, 'Failed to resume pending tasks');
    }
  }

  /** Stop polling. */
  stop(): void {
    this.running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    logger.info('JobRunner stopped');
  }

  /** Execute one poll cycle — claim new jobs, then resume paused ones. */
  async tick(): Promise<void> {
    try {
      // Phase 1: Claim a new queued job
      const candidates = await this.taskCenter.jobsRepo.listQueueCandidates(1);
      if (candidates.length) {
        const job = candidates[0];
        logger.info({ jobId: job.id, bizType: job.bizType, bizId: job.bizId }, 'Claiming job');

        const detail = await this.taskCenter.claimJobForWorker(job.id);
        if (detail) {
          await this.executePipeline(job.id, job.bizType, job.bizId);
        } else {
          logger.info({ jobId: job.id }, 'Job already claimed by another worker');
        }
        return; // One job per tick
      }

      // Phase 2: Resume a running job (callback/review completed a step)
      const runningJobs = await this.taskCenter.jobsRepo.listRunningJobs(1);
      for (const job of runningJobs) {
        // Check cancel requested
        if ((job as any).cancelRequested) {
          logger.info({ jobId: job.id }, 'Cancelling running job per request');
          const detail = await this.taskCenter.getJobDetail(job.id);
          if (detail) {
            for (const step of detail.steps) {
              if (step.status === STEP_STATUS.RUNNING || step.status === STEP_STATUS.QUEUED) {
                await this.taskCenter.markStepFailed(job.id, step.id, 'CANCELLED', 'Job cancelled by user');
              }
            }
          }
          await this.taskCenter.cancelQueuedJob(job.id);
          continue;
        }

        const nextStep = await this.taskCenter.getNextExecutableStep(job.id);
        if (nextStep) {
          logger.info({ jobId: job.id, stepCode: nextStep.stepCode }, 'Resuming paused pipeline');
          await this.executePipeline(job.id, job.bizType, job.bizId);
          return; // One job per tick
        }
      }
    } catch (err) {
      logger.error({ err }, 'JobRunner tick failed');
    }
  }

  /** Execute all steps in a pipeline sequentially. */
  async executePipeline(jobId: string, bizType: string, bizId: string): Promise<void> {
    logger.info({ jobId }, 'Executing pipeline');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Check if job was cancelled
      const detail = await this.taskCenter.getJobDetail(jobId);
      if (!detail || detail.job.status !== JOB_STATUS.RUNNING) {
        logger.info({ jobId, status: detail?.job.status }, 'Pipeline stopped (job no longer running)');
        return;
      }

      // Get next step
      const step = await this.taskCenter.getNextExecutableStep(jobId);
      if (!step) {
        // No more steps — check completion
        await this.evaluateJobCompletion(jobId);
        return;
      }

      // Execute step
      logger.info({ jobId, stepCode: step.stepCode, stepOrder: step.stepOrder }, 'Executing step');

      // Mark step started
      await this.taskCenter.markStepStarted(jobId, step.id, step.stepCode);

      // Find executor
      const executor = this.executors.get(step.stepCode) ?? this.executors.get('*');
      if (!executor) {
        logger.error({ stepCode: step.stepCode }, 'No executor registered for step');
        await this.taskCenter.markStepFailed(jobId, step.id, 'NO_EXECUTOR', `No executor for step: ${step.stepCode}`);
        await this.evaluateJobCompletion(jobId);
        return;
      }

      // Execute
      const ctx: StepExecutionContext = {
        jobId,
        stepCode: step.stepCode,
        stepId: step.id,
        bizType,
        bizId,
        inputSnapshot: step.inputSnapshot ? JSON.parse(step.inputSnapshot) : undefined,
      };

      try {
        const result = await executor.execute(ctx);

        switch (result.status) {
          case 'succeeded':
            await this.taskCenter.markStepSucceeded(jobId, step.id, result.outputSnapshot);
            break;
          case 'failed':
            await this.taskCenter.markStepFailed(jobId, step.id, result.errorCode, result.errorMessage);
            break;
          case 'waiting_callback':
            await this.taskCenter.markWaitingCallback({
              jobId, stepId: step.id,
              providerName: result.providerName ?? 'unknown',
              providerTaskId: result.providerTaskId ?? '',
              inputSnapshot: result.outputSnapshot,
            });
            // Pipeline pauses here — will resume when callback arrives
            logger.info({ jobId, stepCode: step.stepCode }, 'Step waiting for callback');
            return;
          case 'waiting_polling':
            await this.taskCenter.markWaitingPolling({
              jobId, stepId: step.id,
              providerName: result.providerName ?? 'unknown',
              providerTaskId: result.providerTaskId ?? '',
              inputSnapshot: result.outputSnapshot,
            });
            logger.info({ jobId, stepCode: step.stepCode }, 'Step waiting for polling');
            return;
          case 'waiting_review':
            await this.taskCenter.markWaitingReview({
              jobId, stepId: step.id,
              outputSnapshot: result.outputSnapshot,
            });
            logger.info({ jobId, stepCode: step.stepCode }, 'Step waiting for review');
            return;
          case 'skipped':
            await this.taskCenter.jobStepsRepo.markSkipped(step.id);
            break;
        }

        logger.info({ jobId, stepCode: step.stepCode, status: result.status }, 'Step completed');
      } catch (err) {
        logger.error({ err, jobId, stepCode: step.stepCode }, 'Step execution threw');
        await this.taskCenter.markStepFailed(jobId, step.id, 'EXECUTOR_ERROR', String(err));
        await this.evaluateJobCompletion(jobId);
        return;
      }
    }
  }

  /** Evaluate if all steps are done and complete the job. */
  private async evaluateJobCompletion(jobId: string): Promise<void> {
    const summary = await this.taskCenter.summarizeJob(jobId);
    if (!summary) return;

    const { job, summary: s } = summary;

    // If there are still running or queued steps, don't complete yet
    if (s.running > 0 || s.queued > 0 || s.waitingReview > 0 || s.waitingCallback > 0) {
      logger.info({ jobId, summary: s }, 'Job has active steps, not completing');
      return;
    }

    // Check for required step failures
    const detail = await this.taskCenter.getJobDetail(jobId);
    if (!detail) return;

    const requiredFailed = detail.steps.filter(
      (step) => step.required && step.status === STEP_STATUS.FAILED,
    );
    const optionalFailed = detail.steps.filter(
      (step) => !step.required && step.status === STEP_STATUS.FAILED,
    );
    const allRequiredSucceeded = detail.steps
      .filter((step) => step.required)
      .every((step) => step.status === STEP_STATUS.SUCCEEDED);

    if (requiredFailed.length > 0) {
      const failedCodes = requiredFailed.map((s) => s.stepCode).join(', ');
      await this.taskCenter.completeJobFailed(
        jobId,
        'REQUIRED_STEP_FAILED',
        `Required steps failed: ${failedCodes}`,
      );
      logger.info({ jobId, failedSteps: failedCodes }, 'Job failed (required steps)');
    } else if (optionalFailed.length > 0) {
      await this.taskCenter.completeJobPartialSuccess(
        jobId,
        `Optional steps failed: ${optionalFailed.map((s) => s.stepCode).join(', ')}`,
      );
      logger.info({ jobId }, 'Job completed with partial success');
    } else if (allRequiredSucceeded) {
      await this.taskCenter.completeJobSuccess(jobId);
      logger.info({ jobId }, 'Job completed successfully');
    }
  }
}
