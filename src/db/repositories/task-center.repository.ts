import { jobs, jobSteps, jobEvents } from '@/db/schema';
import { EXECUTION_STATE, JOB_STATUS, STEP_STATUS } from '@/constants';
import { JOB_EVENT_TYPES } from '@/constants/job';
import type { CreateJobStepInput, StepDefinition } from '@/types';
import { getDb, type Db } from '@/db/client';
import { nanoid } from 'nanoid';
import { JobsRepository } from './jobs.repository';
import { JobStepsRepository } from './job-steps.repository';
import { JobEventsRepository } from './job-events.repository';
import { EpisodesRepository } from './episodes.repository';

export class TaskCenterRepository {
  private readonly _jobsRepo: JobsRepository;
  private readonly _jobStepsRepo: JobStepsRepository;
  private readonly _jobEventsRepo: JobEventsRepository;
  private readonly _episodesRepo: EpisodesRepository;

  constructor(db: Db = getDb()) {
    this._jobsRepo = new JobsRepository(db);
    this._jobStepsRepo = new JobStepsRepository(db);
    this._jobEventsRepo = new JobEventsRepository(db);
    this._episodesRepo = new EpisodesRepository(db);
  }

  /** Public access to sub-repos (replaces bracket-access pattern). */
  get jobsRepo() { return this._jobsRepo; }
  get jobStepsRepo() { return this._jobStepsRepo; }
  get jobEventsRepo() { return this._jobEventsRepo; }
  get episodesRepo() { return this._episodesRepo; }

  /** Create a pipeline job with pre-generated steps and initial events. */
  async createPipelineJob(params: {
    jobId: string;
    bizType: string;
    bizId: string;
    runType: string;
    triggerSource: string;
    projectId?: string | null;
    productionId?: string | null;
    steps: readonly StepDefinition[];
  }) {
    const { jobId, bizType, bizId, runType, triggerSource, projectId, productionId, steps } = params;
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);

    // Create job
    await this._jobsRepo.create({
      id: jobId,
      bizType,
      bizId,
      runType,
      triggerSource,
      projectId,
      productionId,
    });

    // Create steps
    const stepInputs: CreateJobStepInput[] = steps.map((step) => ({
      jobId,
      stepCode: step.stepCode,
      stepName: step.stepName,
      stepOrder: step.stepOrder,
      required: step.required,
    }));
    await this._jobStepsRepo.createMany(stepInputs);

    // Create initial events
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.CREATED,
      payload: JSON.stringify({ bizType, bizId, runType, triggerSource }),
      createdAt: now,
    });
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.QUEUED,
      payload: JSON.stringify({ stepCount: steps.length }),
      createdAt: now,
    });

    return this.getJobDetail(jobId);
  }

  /** Get full job detail: job + steps + events. */
  async getJobDetail(jobId: string) {
    const job = await this._jobsRepo.findById(jobId);
    if (!job) return null;
    const steps = await this._jobStepsRepo.listByJobId(jobId);
    const events = await this._jobEventsRepo.listByJobId(jobId);
    return { job, steps, events };
  }

  /** Atomically claim a queued job for a worker. */
  async claimJobForWorker(jobId: string) {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const claimed = await this._jobsRepo.claimQueuedJob(jobId);
    if (!claimed) return null;

    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.STARTED,
      payload: JSON.stringify({ startedAt: now }),
      createdAt: now,
    });

    return this.getJobDetail(jobId);
  }

  /** Mark a step as started (running). */
  async markStepStarted(jobId: string, stepId: string, stepCode: string) {
    await this._jobsRepo.updateCurrentStep(jobId, stepCode);
    const step = await this._jobStepsRepo.markRunning(stepId);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      stepId,
      eventType: JOB_EVENT_TYPES.STEP_STARTED,
      payload: JSON.stringify({ stepCode }),
      createdAt: now,
    });

    await this.syncEpisodeStepStatus(jobId, stepCode, STEP_STATUS.RUNNING);
    return step;
  }

  /** Mark a step as succeeded. */
  async markStepSucceeded(jobId: string, stepId: string, outputSnapshot?: unknown) {
    const step = await this._jobStepsRepo.findById(stepId);
    const result = await this._jobStepsRepo.markSucceeded(
      stepId,
      outputSnapshot ? JSON.stringify(outputSnapshot) : null,
    );
    if (step) await this.syncEpisodeStepStatus(jobId, step.stepCode, STEP_STATUS.SUCCEEDED);
    return result;
  }

  /** Mark a step as failed. */
  async markStepFailed(jobId: string, stepId: string, errorCode?: string | null, errorMessage?: string | null) {
    const step = await this._jobStepsRepo.findById(stepId);
    const result = await this._jobStepsRepo.markFailed(stepId, errorCode, errorMessage);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      stepId,
      eventType: JOB_EVENT_TYPES.STEP_FAILED,
      payload: JSON.stringify({ errorCode, errorMessage }),
      createdAt: now,
    });

    if (step) await this.syncEpisodeStepStatus(jobId, step.stepCode, STEP_STATUS.FAILED);
    return result;
  }

  /** Submit step to external provider, wait for callback. */
  async markWaitingCallback(params: {
    jobId: string;
    stepId: string;
    providerName: string;
    providerTaskId: string;
    inputSnapshot?: unknown;
  }) {
    const step = await this._jobStepsRepo.markWaitingCallback(
      params.stepId,
      params.providerName,
      params.providerTaskId,
      params.inputSnapshot ? JSON.stringify(params.inputSnapshot) : null,
    );

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: params.jobId,
      stepId: params.stepId,
      eventType: JOB_EVENT_TYPES.PROVIDER_SUBMITTED,
      payload: JSON.stringify({ providerName: params.providerName, providerTaskId: params.providerTaskId }),
      createdAt: now,
    });

    return step;
  }

  /** Submit step to external provider, poll for results. */
  async markWaitingPolling(params: {
    jobId: string;
    stepId: string;
    providerName: string;
    providerTaskId: string;
    inputSnapshot?: unknown;
  }) {
    return this._jobStepsRepo.markWaitingPolling(
      params.stepId,
      params.providerName,
      params.providerTaskId,
      params.inputSnapshot ? JSON.stringify(params.inputSnapshot) : null,
    );
  }

  /** Step needs human review before proceeding. */
  async markWaitingReview(params: { jobId: string; stepId: string; outputSnapshot?: unknown }) {
    const step = await this._jobStepsRepo.markWaitingReview(
      params.stepId,
      params.outputSnapshot ? JSON.stringify(params.outputSnapshot) : null,
    );

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: params.jobId,
      stepId: params.stepId,
      eventType: JOB_EVENT_TYPES.WAITING_REVIEW,
      payload: JSON.stringify({ waiting: true }),
      createdAt: now,
    });

    // Sync episode waiting_review_step
    if (step) {
      try {
        const job = await this._jobsRepo.findById(params.jobId);
        if (job && job.bizType === 'episode') {
          await this._episodesRepo.setWaitingReviewStep(job.bizId, step.stepCode);
        }
      } catch { /* non-critical */ }
    }

    return step;
  }

  /** Complete job as success. */
  async completeJobSuccess(jobId: string) {
    const job = await this._jobsRepo.finishAsSuccess(jobId);
    await this.syncEpisodeJobCompletion(jobId, 'completed');

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.COMPLETED,
      payload: JSON.stringify({ status: JOB_STATUS.SUCCESS }),
      createdAt: now,
    });

    return job;
  }

  /** Complete job with partial success. */
  async completeJobPartialSuccess(jobId: string, errorMessage?: string | null) {
    const job = await this._jobsRepo.finishAsPartialSuccess(jobId, errorMessage);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.PARTIAL_SUCCESS,
      payload: JSON.stringify({ status: JOB_STATUS.PARTIAL_SUCCESS, errorMessage }),
      createdAt: now,
    });

    return job;
  }

  /** Complete job as failed. */
  async completeJobFailed(jobId: string, errorCode?: string | null, errorMessage?: string | null) {
    const job = await this._jobsRepo.finishAsFailed(jobId, errorCode, errorMessage);
    await this.syncEpisodeJobCompletion(jobId, 'failed', errorMessage);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.FAILED,
      payload: JSON.stringify({ status: JOB_STATUS.FAILED, errorCode, errorMessage }),
      createdAt: now,
    });

    return job;
  }

  /** Cancel a queued job. */
  async cancelQueuedJob(jobId: string) {
    await this._jobStepsRepo.cancelPendingOrQueuedSteps(jobId);
    const job = await this._jobsRepo.finishAsCancelled(jobId, 'Cancelled before execution');

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.CANCELLED,
      payload: JSON.stringify({ status: JOB_STATUS.CANCELLED }),
      createdAt: now,
    });

    return job;
  }

  /** Request cancellation of a running job. */
  async requestCancelRunningJob(jobId: string) {
    const job = await this._jobsRepo.requestCancel(jobId);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId,
      eventType: JOB_EVENT_TYPES.CANCEL_REQUESTED,
      payload: JSON.stringify({ cancelRequested: true }),
      createdAt: now,
    });

    return job;
  }

  /** Get the next step that should execute. */
  async getNextExecutableStep(jobId: string) {
    return this._jobStepsRepo.getNextExecutableStep(jobId);
  }

  /** Summarize job state: counts of steps in each status. */
  async summarizeJob(jobId: string) {
    const detail = await this.getJobDetail(jobId);
    if (!detail) return null;

    const { job, steps } = detail;
    const total = steps.length;
    const succeeded = steps.filter((s) => s.status === STEP_STATUS.SUCCEEDED).length;
    const failed = steps.filter((s) => s.status === STEP_STATUS.FAILED).length;
    const running = steps.filter((s) => s.status === STEP_STATUS.RUNNING).length;
    const queued = steps.filter((s) => s.status === STEP_STATUS.QUEUED).length;
    const waitingReview = steps.filter((s) => s.executionState === EXECUTION_STATE.WAITING_REVIEW).length;
    const waitingCallback = steps.filter(
      (s) => s.executionState === EXECUTION_STATE.WAITING_CALLBACK || s.executionState === EXECUTION_STATE.WAITING_POLLING,
    ).length;

    return {
      job,
      summary: { total, succeeded, failed, running, queued, waitingReview, waitingCallback },
    };
  }

  /** Handle provider callback success — find step by providerTaskId, mark succeeded. */
  async handleProviderCallbackSuccess(params: { providerTaskId: string; outputSnapshot?: unknown }) {
    const step = await this._jobStepsRepo.findByProviderTaskId(params.providerTaskId);
    if (!step) return null;

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: step.jobId,
      stepId: step.id,
      eventType: JOB_EVENT_TYPES.PROVIDER_CALLBACK_RECEIVED,
      payload: JSON.stringify({ providerTaskId: params.providerTaskId, success: true }),
      createdAt: now,
    });

    return this._jobStepsRepo.markSucceeded(
      step.id,
      params.outputSnapshot ? JSON.stringify(params.outputSnapshot) : null,
    );
  }

  /** Handle provider callback failure. */
  async handleProviderCallbackFailed(params: { providerTaskId: string; errorCode?: string | null; errorMessage?: string | null }) {
    const step = await this._jobStepsRepo.findByProviderTaskId(params.providerTaskId);
    if (!step) return null;

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: step.jobId,
      stepId: step.id,
      eventType: JOB_EVENT_TYPES.PROVIDER_CALLBACK_RECEIVED,
      payload: JSON.stringify({ providerTaskId: params.providerTaskId, success: false, errorCode: params.errorCode }),
      createdAt: now,
    });

    return this._jobStepsRepo.markFailed(step.id, params.errorCode, params.errorMessage);
  }

  /** Resume a paused pipeline — marks the step succeeded so the runner picks up the next one. */
  async resumePipeline(params: {
    jobId: string;
    stepId: string;
    outputSnapshot?: unknown;
  }) {
    const step = await this._jobStepsRepo.markSucceeded(
      params.stepId,
      params.outputSnapshot ? JSON.stringify(params.outputSnapshot) : null,
    );

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: params.jobId,
      stepId: params.stepId,
      eventType: JOB_EVENT_TYPES.PROVIDER_CALLBACK_RECEIVED,
      payload: JSON.stringify({ resumed: true }),
      createdAt: now,
    });

    return step;
  }

  /** Approve a step in waiting_review state. */
  async approveStep(params: {
    jobId: string;
    stepId: string;
    reviewer?: string | null;
  }) {
    const step = await this._jobStepsRepo.findById(params.stepId);
    if (!step || step.executionState !== EXECUTION_STATE.WAITING_REVIEW) return null;

    const updated = await this._jobStepsRepo.markSucceeded(params.stepId);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: params.jobId,
      stepId: params.stepId,
      eventType: JOB_EVENT_TYPES.REVIEW_APPROVED,
      payload: JSON.stringify({ reviewer: params.reviewer ?? 'unknown' }),
      createdAt: now,
    });

    return updated;
  }

  /** Reject a step in waiting_review state — terminates the job as failed. */
  async rejectStep(params: {
    jobId: string;
    stepId: string;
    reason?: string | null;
    rollbackToStep?: string | null;
  }) {
    const step = await this._jobStepsRepo.findById(params.stepId);
    if (!step || step.executionState !== EXECUTION_STATE.WAITING_REVIEW) return null;

    await this._jobStepsRepo.markFailed(params.stepId, 'REVIEW_REJECTED', params.reason ?? 'Rejected by reviewer');

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await this._jobEventsRepo.append({
      id: `je_${nanoid(21)}`,
      jobId: params.jobId,
      stepId: params.stepId,
      eventType: JOB_EVENT_TYPES.REVIEW_REJECTED,
      payload: JSON.stringify({ reason: params.reason, rollbackToStep: params.rollbackToStep }),
      createdAt: now,
    });

    // Reject terminates the job
    await this.completeJobFailed(params.jobId, 'REVIEW_REJECTED', params.reason ?? 'Step rejected');

    return this._jobStepsRepo.findById(params.stepId);
  }

  /** List jobs with filters — delegates to JobsRepository. */
  async listJobs(params: {
    status?: string;
    bizType?: string;
    bizId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this._jobsRepo.listByFilter(params);
  }

  // --- Episode sync helpers ---

  /** Sync a step status to the episode's step status column. */
  private async syncEpisodeStepStatus(jobId: string, stepCode: string, stepStatus: string) {
    try {
      const job = await this._jobsRepo.findById(jobId);
      if (!job || job.bizType !== 'episode') return;
      await this._episodesRepo.updateStepStatus(job.bizId, stepCode, stepStatus);
    } catch {
      // Non-critical: episode sync should not break pipeline execution
    }
  }

  /** Update episode status on job completion. */
  private async syncEpisodeJobCompletion(jobId: string, episodeStatus: string, errorMessage?: string | null) {
    try {
      const job = await this._jobsRepo.findById(jobId);
      if (!job || job.bizType !== 'episode') return;
      await this._episodesRepo.update(job.bizId, { status: episodeStatus });
      await this._episodesRepo.setCurrentJob(job.bizId, null);
      if (errorMessage) {
        await this._episodesRepo.setError(job.bizId, 'JOB_FAILED', errorMessage);
      }
    } catch {
      // Non-critical
    }
  }
}
