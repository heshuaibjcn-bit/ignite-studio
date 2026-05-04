import type { JobStatus, JobRunType, JobTriggerSource } from '@/constants/job';
import type { StepStatus, ExecutionState } from '@/constants/step';
import type { Id, IsoDateTimeString, JsonString } from './common';

/** Re-export status types from constants. */
export type { JobStatus, JobRunType, JobTriggerSource };
export type { StepStatus, ExecutionState };

/** Job record. */
export interface Job {
  id: Id;
  projectId: Id | null;
  productionId: Id | null;
  bizType: string;
  bizId: Id;
  runType: JobRunType;
  triggerSource: JobTriggerSource;
  status: JobStatus;
  currentStep: string | null;
  priority: number;
  retryCount: number;
  idempotencyKey: string | null;
  parentBatchId: Id | null;
  createdBy: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  cancelRequested: boolean;
  createdAt: IsoDateTimeString;
  startedAt: IsoDateTimeString | null;
  finishedAt: IsoDateTimeString | null;
  updatedAt: IsoDateTimeString;
}

/** JobStep record. */
export interface JobStep {
  id: Id;
  jobId: Id;
  stepCode: string;
  stepName: string;
  stepOrder: number;
  required: boolean;
  status: StepStatus;
  executionState: ExecutionState;
  providerName: string | null;
  providerTaskId: string | null;
  inputSnapshot: JsonString | null;
  outputSnapshot: JsonString | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  startedAt: IsoDateTimeString | null;
  finishedAt: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** JobStepItem — per-item fan-out for steps that execute multiple items (e.g., per-storyboard). */
export interface JobStepItem {
  id: Id;
  jobId: Id;
  stepId: Id;
  itemId: Id;
  status: StepStatus;
  executionState: ExecutionState;
  providerName: string | null;
  providerTaskId: string | null;
  inputSnapshot: JsonString | null;
  outputSnapshot: JsonString | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  startedAt: IsoDateTimeString | null;
  finishedAt: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** JobEvent record. */
export interface JobEvent {
  id: Id;
  jobId: Id;
  stepId: Id | null;
  eventType: string;
  payload: JsonString | null;
  createdAt: IsoDateTimeString;
}

/** BatchRun record. */
export interface BatchRun {
  id: Id;
  bizType: string;
  productionId: Id | null;
  totalCount: number;
  submittedCount: number;
  runningCount: number;
  successCount: number;
  failedCount: number;
  cancelledCount: number;
  pausedReason: string | null;
  status: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** Input for creating a new job. */
export interface CreateJobInput {
  bizType: string;
  bizId: Id;
  runType: JobRunType;
  triggerSource: JobTriggerSource;
  projectId?: Id | null;
  productionId?: Id | null;
  priority?: number;
  idempotencyKey?: string | null;
  parentBatchId?: Id | null;
  createdBy?: string | null;
}

/** Input for creating a job step. */
export interface CreateJobStepInput {
  jobId: Id;
  stepCode: string;
  stepName: string;
  stepOrder: number;
  required: boolean;
}

/** Input for creating a job event. */
export interface CreateJobEventInput {
  id: Id;
  jobId: Id;
  stepId?: Id | null;
  eventType: string;
  payload?: JsonString | null;
  createdAt: IsoDateTimeString;
}

/** Input for creating a job step item (fan-out). */
export interface CreateJobStepItemInput {
  jobId: Id;
  stepId: Id;
  itemId: Id;
  status?: StepStatus;
  executionState?: ExecutionState;
}
