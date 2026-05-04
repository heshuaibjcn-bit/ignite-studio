/**
 * Job center constants.
 * Source: design doc Sections 3.4, 4.1, 8.1.
 */

/** Job status — the main state of a job execution. */
export const JOB_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  PARTIAL_SUCCESS: 'partial_success',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

/** Job run types — what the job is executing. */
export const JOB_RUN_TYPE = {
  PIPELINE: 'pipeline',
  TTS: 'tts',
  COMPOSE: 'compose',
  EXPORT: 'export',
  MERGE: 'merge',
  IMAGE_GENERATE: 'image_generate',
  VIDEO_GENERATE: 'video_generate',
  REVIEW: 'review',
} as const;

export type JobRunType = (typeof JOB_RUN_TYPE)[keyof typeof JOB_RUN_TYPE];

/** Job trigger source — who initiated the job. */
export const JOB_TRIGGER_SOURCE = {
  USER: 'user',
  SYSTEM: 'system',
  OPENCLAW: 'openclaw',
  RETRY: 'retry',
} as const;

export type JobTriggerSource = (typeof JOB_TRIGGER_SOURCE)[keyof typeof JOB_TRIGGER_SOURCE];

/** Error codes that are automatically retryable. */
export const RETRYABLE_ERROR_CODES = [
  'PROVIDER_TIMEOUT',
  'TEMP_NETWORK_ERROR',
  'WEBHOOK_DELAYD',
  'COMPOSE_RESOURCE_BUSY',
] as const;

/** System error codes. */
export const SYSTEM_ERROR_CODES = {
  JOB_WORKER_INTERRUPTED: 'JOB_WORKER_INTERRUPTED',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  TEMP_NETWORK_ERROR: 'TEMP_NETWORK_ERROR',
  WEBHOOK_DELAYED: 'WEBHOOK_DELAYED',
  COMPOSE_RESOURCE_BUSY: 'COMPOSE_RESOURCE_BUSY',
  STEP_TIMEOUT: 'STEP_TIMEOUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONFIG_MISSING: 'CONFIG_MISSING',
  ASSET_MISSING: 'ASSET_MISSING',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/** Job event types. */
export const JOB_EVENT_TYPES = {
  CREATED: 'created',
  QUEUED: 'queued',
  STARTED: 'started',
  STEP_STARTED: 'step_started',
  PROVIDER_SUBMITTED: 'provider_submitted',
  PROVIDER_CALLBACK_RECEIVED: 'provider_callback_received',
  PROVIDER_POLLED: 'provider_polled',
  WAITING_REVIEW: 'waiting_review',
  REVIEW_APPROVED: 'review_approved',
  REVIEW_REJECTED: 'review_rejected',
  REVIEW_REGENERATED: 'review_regenerated',
  RETRY_SCHEDULED: 'retry_scheduled',
  STEP_FAILED: 'step_failed',
  FAILED: 'failed',
  PARTIAL_SUCCESS: 'partial_success',
  COMPLETED: 'completed',
  CANCEL_REQUESTED: 'cancel_requested',
  CANCELLED: 'cancelled',
  RESTORED_AFTER_RESTART: 'restored_after_restart',
} as const;

/** Batch run status. */
export const BATCH_RUN_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  PAUSED_BY_SYSTEM: 'paused_by_system',
  PAUSED_BY_USER: 'paused_by_user',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/** Retry defaults. */
export const RETRY_DEFAULTS = {
  MAX_AUTO_RETRIES: 2,
  DELAYS_MS: [30_000, 120_000], // 30s, 120s
} as const;

/** Step timeout defaults (ms). */
export const STEP_TIMEOUT_MS: Record<string, number> = {
  text_agent: 2 * 60 * 1000,       // 2 min
  tts: 5 * 60 * 1000,              // 5 min
  image_generate: 10 * 60 * 1000,  // 10 min
  video_generate: 30 * 60 * 1000,  // 30 min
  ffmpeg_compose: 20 * 60 * 1000,  // 20 min
  file_download: 10 * 60 * 1000,   // 10 min
  // waiting_review: no auto-timeout (human-controlled)
} as const;
