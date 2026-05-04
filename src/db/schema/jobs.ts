/**
 * Job center schema — jobs, job_steps, job_step_items, job_events, batch_runs.
 *
 * CORRECTION from review: Removed unique(job_id, step_code) on job_steps.
 * Steps 7-12 in the drama pipeline fan out per-storyboard (~30 per episode),
 * so the same step_code can appear multiple times within one job via job_step_items.
 *
 * Added job_step_items table for per-item fan-out.
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, jsonCol, boolCol } from './common';

export const jobs = sqliteTable('jobs', {
  id: idCol(),
  projectId: text('project_id'),
  productionId: text('production_id'),
  bizType: text('biz_type').notNull(),
  bizId: text('biz_id').notNull(),
  runType: text('run_type').notNull(), // pipeline | tts | compose | export | merge | image_generate | video_generate | review
  triggerSource: text('trigger_source').notNull(), // user | system | openclaw | retry
  status: text('status').notNull().default('queued'), // queued | running | partial_success | success | failed | cancelled
  currentStep: text('current_step'),
  priority: integer('priority').notNull().default(100),
  retryCount: integer('retry_count').notNull().default(0),
  idempotencyKey: text('idempotency_key'),
  parentBatchId: text('parent_batch_id'),
  createdBy: text('created_by'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  cancelRequested: boolCol('cancel_requested', false),
  createdAt: createdAtCol(),
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
  updatedAt: updatedAtCol(),
}, (t) => [
  index('idx_jobs_status').on(t.status),
  index('idx_jobs_biz').on(t.bizType, t.bizId),
  index('idx_jobs_idempotency').on(t.idempotencyKey),
]);

export const jobSteps = sqliteTable('job_steps', {
  id: idCol(),
  jobId: text('job_id').notNull(),
  stepCode: text('step_code').notNull(),
  stepName: text('step_name').notNull(),
  stepOrder: integer('step_order').notNull(),
  required: boolCol('required', true),
  status: text('status').notNull().default('pending'), // pending | queued | running | succeeded | failed | skipped | cancelled
  executionState: text('execution_state').notNull().default('normal'), // normal | waiting_review | waiting_callback | waiting_polling
  providerName: text('provider_name'),
  providerTaskId: text('provider_task_id'),
  inputSnapshot: jsonCol('input_snapshot'),
  outputSnapshot: jsonCol('output_snapshot'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
}, (t) => [
  index('idx_job_steps_job').on(t.jobId),
  index('idx_job_steps_provider').on(t.providerTaskId),
  // NOTE: No unique(job_id, step_code) — fan-out steps have multiple rows per step_code
]);

/**
 * JobStepItems — per-item fan-out for pipeline steps that execute across multiple items.
 * E.g., drama steps 7-12 run per-storyboard (~30 per episode).
 * Each item tracks its own status independently.
 */
export const jobStepItems = sqliteTable('job_step_items', {
  id: idCol(),
  jobId: text('job_id').notNull(),
  stepId: text('step_id').notNull(),
  itemId: text('item_id').notNull(), // e.g., storyboard_id
  status: text('status').notNull().default('pending'),
  executionState: text('execution_state').notNull().default('normal'),
  providerName: text('provider_name'),
  providerTaskId: text('provider_task_id'),
  inputSnapshot: jsonCol('input_snapshot'),
  outputSnapshot: jsonCol('output_snapshot'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
}, (t) => [
  index('idx_job_step_items_job_step').on(t.jobId, t.stepId),
  index('idx_job_step_items_item').on(t.jobId, t.stepId, t.itemId),
  index('idx_job_step_items_provider').on(t.providerTaskId),
]);

export const jobEvents = sqliteTable('job_events', {
  id: idCol(),
  jobId: text('job_id').notNull(),
  stepId: text('step_id'),
  eventType: text('event_type').notNull(),
  payload: jsonCol('payload'),
  createdAt: createdAtCol(),
}, (t) => [
  index('idx_job_events_job').on(t.jobId),
]);

export const batchRuns = sqliteTable('batch_runs', {
  id: idCol(),
  bizType: text('biz_type').notNull(),
  productionId: text('production_id'),
  totalCount: integer('total_count').notNull().default(0),
  submittedCount: integer('submitted_count').notNull().default(0),
  runningCount: integer('running_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failedCount: integer('failed_count').notNull().default(0),
  cancelledCount: integer('cancelled_count').notNull().default(0),
  pausedReason: text('paused_reason'),
  status: text('status').notNull().default('queued'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
