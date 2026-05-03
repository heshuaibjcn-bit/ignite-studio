# 

以下内容按“**可直接进项目**”的方式给出。  
默认基于：

- TypeScript
- Drizzle ORM
- SQLite
- 你前面已经采用的 schema 文件

我会给出建议目录、完整初稿代码、以及少量实现说明。

---

# 一、建议目录结构

Ts

src/

  constants/

    job.ts

    biz.ts

    step.ts

    provider.ts

    index.ts

  types/

    job.ts

    biz.ts

    common.ts

    index.ts

  db/

    repositories/

      jobs.repository.ts

      job-steps.repository.ts

      job-events.repository.ts

      task-center.repository.ts

      index.ts

---

# 二、《状态枚举与 TS 类型常量文件》

---

## 2.1 `src/constants/biz.ts`

Ts

export const BIZ_STATUS = {

  DRAFT: 'draft',

  READY: 'ready',

  PROCESSING: 'processing',

  PARTIAL_READY: 'partial_ready',

  BLOCKED: 'blocked',

  COMPLETED: 'completed',

  FAILED: 'failed',

  ARCHIVED: 'archived',

} as const;

export const PRODUCTION_MODE = {

  TALKING_HEAD: 'talking_head',

  REMIX: 'remix',

  DRAMA: 'drama',

} as const;

export const BIZ_TYPE = {

  TALKING_HEAD_TASK: 'talking_head_task',

  REMIX_TASK: 'remix_task',

  EPISODE: 'episode',

  STORYBOARD: 'storyboard',

  ASSET_IMPORT: 'asset_import',

} as const;

export const REVIEWABLE_STEP = {

  STORYBOARD_REVIEW: 'storyboard_review',

  VIDEO_REVIEW: 'video_review',

} as const;

---

## 2.2 `src/constants/step.ts`

Ts

export const STEP_STATUS = {

  PENDING: 'pending',

  QUEUED: 'queued',

  RUNNING: 'running',

  SUCCEEDED: 'succeeded',

  FAILED: 'failed',

  SKIPPED: 'skipped',

  CANCELLED: 'cancelled',

  STALE: 'stale',

} as const;

export const EXECUTION_STATE = {

  NORMAL: 'normal',

  WAITING_REVIEW: 'waiting_review',

  WAITING_CALLBACK: 'waiting_callback',

  WAITING_POLLING: 'waiting_polling',

} as const;

/**

 * 图文口播 pipeline steps

 */

export const TALKING_HEAD_PIPELINE_STEPS = {

  CONTENT_PREPARE: 'content_prepare',

  COPY_OPTIMIZE: 'copy_optimize',

  TTS_GENERATE: 'tts_generate',

  IMAGE_PREPARE: 'image_prepare',

  SUBTITLE_GENERATE: 'subtitle_generate',

  PREVIEW_COMPOSE: 'preview_compose',

  FINAL_COMPOSE: 'final_compose',

  EXPORT_FINALIZE: 'export_finalize',

} as const;

/**

 * 混剪 pipeline steps

 */

export const REMIX_PIPELINE_STEPS = {

  MATERIAL_VALIDATE: 'material_validate',

  CLIP_SPLIT: 'clip_split',

  SEQUENCE_PREPARE: 'sequence_prepare',

  NARRATION_GENERATE: 'narration_generate',

  TTS_GENERATE: 'tts_generate',

  SUBTITLE_GENERATE: 'subtitle_generate',

  PREVIEW_COMPOSE: 'preview_compose',

  FINAL_COMPOSE: 'final_compose',

} as const;

/**

 * AI 短剧 pipeline steps

 */

export const DRAMA_PIPELINE_STEPS = {

  SOURCE_VALIDATE: 'source_validate',

  SCRIPT_REWRITE: 'script_rewrite',

  CHARACTER_SCENE_EXTRACT: 'character_scene_extract',

  VOICE_ASSIGN: 'voice_assign',

  STORYBOARD_GENERATE: 'storyboard_generate',

  STORYBOARD_REVIEW: 'storyboard_review',

  CHARACTER_IMAGE_GENERATE: 'character_image_generate',

  SCENE_IMAGE_GENERATE: 'scene_image_generate',

  FRAME_IMAGE_GENERATE: 'frame_image_generate',

  VIDEO_GENERATE: 'video_generate',

  VIDEO_REVIEW: 'video_review',

  SHOT_COMPOSE: 'shot_compose',

  EPISODE_MERGE: 'episode_merge',

  EXPORT_FINALIZE: 'export_finalize',

} as const;

---

## 2.3 `src/constants/job.ts`

Ts

export const JOB_STATUS = {

  QUEUED: 'queued',

  RUNNING: 'running',

  PARTIAL_SUCCESS: 'partial_success',

  SUCCESS: 'success',

  FAILED: 'failed',

  CANCELLED: 'cancelled',

} as const;

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

export const JOB_TRIGGER_SOURCE = {

  USER: 'user',

  SYSTEM: 'system',

  OPENCLAW: 'openclaw',

  RETRY: 'retry',

} as const;

export const JOB_EVENT_TYPE = {

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

export const BATCH_RUN_STATUS = {

  QUEUED: 'queued',

  RUNNING: 'running',

  PAUSED_BY_SYSTEM: 'paused_by_system',

  PAUSED_BY_USER: 'paused_by_user',

  COMPLETED: 'completed',

  CANCELLED: 'cancelled',

} as const;

---

## 2.4 `src/constants/provider.ts`

Ts

export const PROVIDER_WAIT_MODE = {

  SYNC: 'sync',

  CALLBACK: 'callback',

  POLLING: 'polling',

  REVIEW: 'review',

} as const;

export const RETRYABLE_ERROR_CODE = {

  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',

  TEMP_NETWORK_ERROR: 'TEMP_NETWORK_ERROR',

  WEBHOOK_DELAYED: 'WEBHOOK_DELAYED',

  COMPOSE_RESOURCE_BUSY: 'COMPOSE_RESOURCE_BUSY',

} as const;

export const SYSTEM_ERROR_CODE = {

  JOB_WORKER_INTERRUPTED: 'JOB_WORKER_INTERRUPTED',

  JOB_CANCELLED: 'JOB_CANCELLED',

  INVALID_BIZ_STATE: 'INVALID_BIZ_STATE',

  STEP_TIMEOUT: 'STEP_TIMEOUT',

  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',

  WEBHOOK_STEP_NOT_FOUND: 'WEBHOOK_STEP_NOT_FOUND',

  WEBHOOK_STATUS_CONFLICT: 'WEBHOOK_STATUS_CONFLICT',

} as const;

---

## 2.5 `src/constants/index.ts`

Ts

export * from './biz';

export * from './step';

export * from './job';

export * from './provider';

---

# 三、TS 类型文件

---

## 3.1 `src/types/common.ts`

Ts

export type Id = string;

export type IsoDateTimeString = string;

export type JsonString = string;

---

## 3.2 `src/types/biz.ts`

Ts

import type { BIZ_STATUS, BIZ_TYPE, PRODUCTION_MODE, REVIEWABLE_STEP } from '@/constants';

export type BizStatus = (typeof BIZ_STATUS)[keyof typeof BIZ_STATUS];

export type BizType = (typeof BIZ_TYPE)[keyof typeof BIZ_TYPE];

export type ProductionMode = (typeof PRODUCTION_MODE)[keyof typeof PRODUCTION_MODE];

export type ReviewableStep = (typeof REVIEWABLE_STEP)[keyof typeof REVIEWABLE_STEP];

---

## 3.3 `src/types/job.ts`

Ts

import type {

  BATCH_RUN_STATUS,

  EXECUTION_STATE,

  JOB_EVENT_TYPE,

  JOB_RUN_TYPE,

  JOB_STATUS,

  JOB_TRIGGER_SOURCE,

  STEP_STATUS,

} from '@/constants';

export type StepStatus = (typeof STEP_STATUS)[keyof typeof STEP_STATUS];

export type ExecutionState = (typeof EXECUTION_STATE)[keyof typeof EXECUTION_STATE];

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export type JobRunType = (typeof JOB_RUN_TYPE)[keyof typeof JOB_RUN_TYPE];

export type JobTriggerSource = (typeof JOB_TRIGGER_SOURCE)[keyof typeof JOB_TRIGGER_SOURCE];

export type JobEventType = (typeof JOB_EVENT_TYPE)[keyof typeof JOB_EVENT_TYPE];

export type BatchRunStatus = (typeof BATCH_RUN_STATUS)[keyof typeof BATCH_RUN_STATUS];

export interface StepDefinition {

  stepCode: string;

  stepName: string;

  stepOrder: number;

  required: boolean;

}

export interface CreateJobInput {

  id: string;

  projectId?: string | null;

  productionId?: string | null;

  bizType: string;

  bizId: string;

  runType: string;

  triggerSource: string;

  priority?: number;

  idempotencyKey?: string | null;

  parentBatchId?: string | null;

  createdBy?: string | null;

  currentStep?: string | null;

  status?: JobStatus;

  retryCount?: number;

  errorCode?: string | null;

  errorMessage?: string | null;

  createdAt: string;

  updatedAt: string;

}

export interface CreateJobStepInput {

  id: string;

  jobId: string;

  stepCode: string;

  stepName: string;

  stepOrder: number;

  required: boolean;

  status?: StepStatus;

  executionState?: ExecutionState;

  providerName?: string | null;

  providerTaskId?: string | null;

  inputSnapshot?: string | null;

  outputSnapshot?: string | null;

  errorCode?: string | null;

  errorMessage?: string | null;

  retryCount?: number;

  startedAt?: string | null;

  finishedAt?: string | null;

  createdAt: string;

  updatedAt: string;

}

export interface CreateJobEventInput {

  id: string;

  jobId: string;

  stepId?: string | null;

  eventType: string;

  payload?: string | null;

  createdAt: string;

}

---

## 3.4 `src/types/index.ts`

Ts

export * from './common';

export * from './biz';

export * from './job';

---

# 四、《任务中心 Repository / DAO 初稿》

下面是重点。

---

## 4.1 Repository 设计目标

拆成 4 层职责：

1. `jobs.repository.ts`
    - Job 记录增删改查
2. `job-steps.repository.ts`
    - JobStep 增删改查
3. `job-events.repository.ts`
    - JobEvent 追加记录
4. `task-center.repository.ts`
    - 面向业务使用的聚合操作
    - 如：创建 pipeline job、领取 job、进入等待回调、标记成功失败等

---

# 五、`src/db/repositories/jobs.repository.ts`

Ts

import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';

import { jobs } from '@/db/schema';

import { JOB_STATUS } from '@/constants';

import type { CreateJobInput, JobStatus } from '@/types';

export class JobsRepository {

  async create(input: CreateJobInput) {

    await db.insert(jobs).values(input);

    return this.findById(input.id);

  }

  async findById(id: string) {

    const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);

    return rows[0] ?? null;

  }

  async findLatestByBiz(bizType: string, bizId: string) {

    const rows = await db

      .select()

      .from(jobs)

      .where(and(eq(jobs.bizType, bizType), eq(jobs.bizId, bizId)))

      .orderBy(desc(jobs.createdAt))

      .limit(1);

    return rows[0] ?? null;

  }

  async findByIdempotencyKey(

    bizType: string,

    bizId: string,

    runType: string,

    idempotencyKey: string,

  ) {

    const rows = await db

      .select()

      .from(jobs)

      .where(

        and(

          eq(jobs.bizType, bizType),

          eq(jobs.bizId, bizId),

          eq(jobs.runType, runType),

          eq(jobs.idempotencyKey, idempotencyKey),

        ),

      )

      .orderBy(desc(jobs.createdAt))

      .limit(1);

    return rows[0] ?? null;

  }

  async listQueueCandidates(limit = 20) {

    return db

      .select()

      .from(jobs)

      .where(eq(jobs.status, JOB_STATUS.QUEUED))

      .orderBy(jobs.priority, jobs.createdAt)

      .limit(limit);

  }

  /**

   * 原子领取 queued job

   * 返回 true 表示领取成功，false 表示已被其他 worker 领取

   */

  async claimQueuedJob(jobId: string, now: string) {

    const result = await db

      .update(jobs)

      .set({

        status: JOB_STATUS.RUNNING,

        startedAt: now,

        updatedAt: now,

      })

      .where(and(eq(jobs.id, jobId), eq(jobs.status, JOB_STATUS.QUEUED)));

    return (result.changes ?? 0) > 0;

  }

  async updateStatus(

    jobId: string,

    status: JobStatus,

    extra?: {

      currentStep?: string | null;

      errorCode?: string | null;

      errorMessage?: string | null;

      finishedAt?: string | null;

      startedAt?: string | null;

      cancelRequested?: boolean;

      retryCount?: number;

    },

  ) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        status,

        currentStep: extra?.currentStep,

        errorCode: extra?.errorCode,

        errorMessage: extra?.errorMessage,

        finishedAt: extra?.finishedAt,

        startedAt: extra?.startedAt,

        cancelRequested: extra?.cancelRequested,

        retryCount: extra?.retryCount,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

  async updateCurrentStep(jobId: string, currentStep: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        currentStep,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

  async requestCancel(jobId: string) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        cancelRequested: true,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

  async finishAsSuccess(jobId: string) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        status: JOB_STATUS.SUCCESS,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

  async finishAsPartialSuccess(jobId: string, errorMessage?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        status: JOB_STATUS.PARTIAL_SUCCESS,

        errorMessage: errorMessage ?? null,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

  async finishAsFailed(jobId: string, errorCode?: string | null, errorMessage?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        status: JOB_STATUS.FAILED,

        errorCode: errorCode ?? null,

        errorMessage: errorMessage ?? null,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

  async finishAsCancelled(jobId: string, errorMessage?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobs)

      .set({

        status: JOB_STATUS.CANCELLED,

        errorMessage: errorMessage ?? null,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobs.id, jobId));

    return this.findById(jobId);

  }

}

---

# 六、`src/db/repositories/job-steps.repository.ts`

Ts

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';

import { jobSteps } from '@/db/schema';

import { EXECUTION_STATE, STEP_STATUS } from '@/constants';

import type { CreateJobStepInput, ExecutionState, StepStatus } from '@/types';

export class JobStepsRepository {

  async createMany(inputs: CreateJobStepInput[]) {

    if (!inputs.length) return [];

    await db.insert(jobSteps).values(inputs);

    return this.listByJobId(inputs[0].jobId);

  }

  async listByJobId(jobId: string) {

    return db

      .select()

      .from(jobSteps)

      .where(eq(jobSteps.jobId, jobId))

      .orderBy(asc(jobSteps.stepOrder));

  }

  async findById(id: string) {

    const rows = await db.select().from(jobSteps).where(eq(jobSteps.id, id)).limit(1);

    return rows[0] ?? null;

  }

  async findByJobIdAndStepCode(jobId: string, stepCode: string) {

    const rows = await db

      .select()

      .from(jobSteps)

      .where(and(eq(jobSteps.jobId, jobId), eq(jobSteps.stepCode, stepCode)))

      .limit(1);

    return rows[0] ?? null;

  }

  async getNextExecutableStep(jobId: string) {

    const steps = await this.listByJobId(jobId);

    for (const step of steps) {

      if (step.status === STEP_STATUS.QUEUED) {

        return step;

      }

    }

    return null;

  }

  async markQueued(stepId: string) {

    return this.updateStatus(stepId, STEP_STATUS.QUEUED);

  }

  async markRunning(stepId: string) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.RUNNING,

        executionState: EXECUTION_STATE.NORMAL,

        startedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markSucceeded(stepId: string, outputSnapshot?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.SUCCEEDED,

        executionState: EXECUTION_STATE.NORMAL,

        outputSnapshot: outputSnapshot ?? undefined,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markFailed(stepId: string, errorCode?: string | null, errorMessage?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.FAILED,

        executionState: EXECUTION_STATE.NORMAL,

        errorCode: errorCode ?? null,

        errorMessage: errorMessage ?? null,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markSkipped(stepId: string) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.SKIPPED,

        executionState: EXECUTION_STATE.NORMAL,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markCancelled(stepId: string, errorMessage?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.CANCELLED,

        errorMessage: errorMessage ?? null,

        finishedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markWaitingCallback(

    stepId: string,

    providerName: string,

    providerTaskId: string,

    inputSnapshot?: string | null,

  ) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.RUNNING,

        executionState: EXECUTION_STATE.WAITING_CALLBACK,

        providerName,

        providerTaskId,

        inputSnapshot: inputSnapshot ?? undefined,

        startedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markWaitingPolling(

    stepId: string,

    providerName: string,

    providerTaskId: string,

    inputSnapshot?: string | null,

  ) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.RUNNING,

        executionState: EXECUTION_STATE.WAITING_POLLING,

        providerName,

        providerTaskId,

        inputSnapshot: inputSnapshot ?? undefined,

        startedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async markWaitingReview(stepId: string, outputSnapshot?: string | null) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.RUNNING,

        executionState: EXECUTION_STATE.WAITING_REVIEW,

        outputSnapshot: outputSnapshot ?? undefined,

        startedAt: now,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async bumpRetryCount(stepId: string) {

    const step = await this.findById(stepId);

    if (!step) return null;

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        retryCount: (step.retryCount ?? 0) + 1,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async updateStatus(

    stepId: string,

    status: StepStatus,

    extra?: {

      executionState?: ExecutionState;

      inputSnapshot?: string | null;

      outputSnapshot?: string | null;

      errorCode?: string | null;

      errorMessage?: string | null;

      providerName?: string | null;

      providerTaskId?: string | null;

      startedAt?: string | null;

      finishedAt?: string | null;

      retryCount?: number;

    },

  ) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status,

        executionState: extra?.executionState,

        inputSnapshot: extra?.inputSnapshot,

        outputSnapshot: extra?.outputSnapshot,

        errorCode: extra?.errorCode,

        errorMessage: extra?.errorMessage,

        providerName: extra?.providerName,

        providerTaskId: extra?.providerTaskId,

        startedAt: extra?.startedAt,

        finishedAt: extra?.finishedAt,

        retryCount: extra?.retryCount,

        updatedAt: now,

      })

      .where(eq(jobSteps.id, stepId));

    return this.findById(stepId);

  }

  async cancelPendingOrQueuedSteps(jobId: string) {

    const now = new Date().toISOString();

    await db

      .update(jobSteps)

      .set({

        status: STEP_STATUS.CANCELLED,

        finishedAt: now,

        updatedAt: now,

      })

      .where(

        and(

          eq(jobSteps.jobId, jobId),

          inArray(jobSteps.status, [STEP_STATUS.PENDING, STEP_STATUS.QUEUED]),

        ),

      );

    return this.listByJobId(jobId);

  }

  async findByProviderTaskId(providerTaskId: string) {

    const rows = await db

      .select()

      .from(jobSteps)

      .where(eq(jobSteps.providerTaskId, providerTaskId))

      .limit(1);

    return rows[0] ?? null;

  }

}

---

# 七、`src/db/repositories/job-events.repository.ts`

Ts

import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';

import { jobEvents } from '@/db/schema';

import type { CreateJobEventInput } from '@/types';

export class JobEventsRepository {

  async append(input: CreateJobEventInput) {

    await db.insert(jobEvents).values(input);

    return this.findById(input.id);

  }

  async findById(id: string) {

    const rows = await db.select().from(jobEvents).where(eq(jobEvents.id, id)).limit(1);

    return rows[0] ?? null;

  }

  async listByJobId(jobId: string) {

    return db

      .select()

      .from(jobEvents)

      .where(eq(jobEvents.jobId, jobId))

      .orderBy(asc(jobEvents.createdAt));

  }

}

---

# 八、`src/db/repositories/task-center.repository.ts`

这个文件是“能直接给服务层用”的聚合 Repository。

Ts

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';

import { jobs, jobSteps } from '@/db/schema';

import {

  EXECUTION_STATE,

  JOB_EVENT_TYPE,

  JOB_STATUS,

  STEP_STATUS,

  SYSTEM_ERROR_CODE,

} from '@/constants';

import type {

  CreateJobEventInput,

  CreateJobInput,

  CreateJobStepInput,

  StepDefinition,

} from '@/types';

import { JobsRepository } from './jobs.repository';

import { JobStepsRepository } from './job-steps.repository';

import { JobEventsRepository } from './job-events.repository';

export class TaskCenterRepository {

  constructor(

    private readonly jobsRepo = new JobsRepository(),

    private readonly jobStepsRepo = new JobStepsRepository(),

    private readonly jobEventsRepo = new JobEventsRepository(),

  ) {}

  async createPipelineJob(params: {

    job: CreateJobInput;

    steps: StepDefinition[];

  }) {

    const { job, steps } = params;

    return db.transaction(async (tx) => {

      await tx.insert(jobs).values(job);

      const stepRows: CreateJobStepInput[] = steps.map((step, idx) => ({

        id: `step_${crypto.randomUUID()}`,

        jobId: job.id,

        stepCode: step.stepCode,

        stepName: step.stepName,

        stepOrder: step.stepOrder ?? idx + 1,

        required: step.required,

        status: STEP_STATUS.QUEUED,

        executionState: EXECUTION_STATE.NORMAL,

        retryCount: 0,

        createdAt: job.createdAt,

        updatedAt: job.updatedAt,

      }));

      if (stepRows.length) {

        await tx.insert(jobSteps).values(stepRows);

      }

      const eventRows: CreateJobEventInput[] = [

        {

          id: `je_${crypto.randomUUID()}`,

          jobId: job.id,

          eventType: JOB_EVENT_TYPE.CREATED,

          payload: JSON.stringify({

            bizType: job.bizType,

            bizId: job.bizId,

            runType: job.runType,

            triggerSource: job.triggerSource,

          }),

          createdAt: job.createdAt,

        },

        {

          id: `je_${crypto.randomUUID()}`,

          jobId: job.id,

          eventType: JOB_EVENT_TYPE.QUEUED,

          payload: JSON.stringify({

            stepCount: stepRows.length,

          }),

          createdAt: job.createdAt,

        },

      ];

      await tx.insert(jobEvents).values(eventRows);

      return {

        job: await this.jobsRepo.findById(job.id),

        steps: await this.jobStepsRepo.listByJobId(job.id),

      };

    });

  }

  async getJobDetail(jobId: string) {

    const job = await this.jobsRepo.findById(jobId);

    if (!job) return null;

    const steps = await this.jobStepsRepo.listByJobId(jobId);

    const events = await this.jobEventsRepo.listByJobId(jobId);

    return { job, steps, events };

  }

  async claimJobForWorker(jobId: string) {

    const now = new Date().toISOString();

    const claimed = await this.jobsRepo.claimQueuedJob(jobId, now);

    if (!claimed) return null;

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      eventType: JOB_EVENT_TYPE.STARTED,

      payload: JSON.stringify({ startedAt: now }),

      createdAt: now,

    });

    return this.getJobDetail(jobId);

  }

  async markStepStarted(jobId: string, stepId: string, stepCode: string) {

    await this.jobsRepo.updateCurrentStep(jobId, stepCode);

    const step = await this.jobStepsRepo.markRunning(stepId);

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      stepId,

      eventType: JOB_EVENT_TYPE.STEP_STARTED,

      payload: JSON.stringify({ stepCode }),

      createdAt: new Date().toISOString(),

    });

    return step;

  }

  async markStepSucceeded(jobId: string, stepId: string, outputSnapshot?: unknown) {

    const step = await this.jobStepsRepo.markSucceeded(

      stepId,

      outputSnapshot ? JSON.stringify(outputSnapshot) : null,

    );

    return step;

  }

  async markStepFailed(

    jobId: string,

    stepId: string,

    errorCode?: string | null,

    errorMessage?: string | null,

  ) {

    const step = await this.jobStepsRepo.markFailed(stepId, errorCode, errorMessage);

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      stepId,

      eventType: JOB_EVENT_TYPE.STEP_FAILED,

      payload: JSON.stringify({

        errorCode,

        errorMessage,

      }),

      createdAt: new Date().toISOString(),

    });

    return step;

  }

  async markWaitingCallback(params: {

    jobId: string;

    stepId: string;

    providerName: string;

    providerTaskId: string;

    inputSnapshot?: unknown;

  }) {

    const step = await this.jobStepsRepo.markWaitingCallback(

      params.stepId,

      params.providerName,

      params.providerTaskId,

      params.inputSnapshot ? JSON.stringify(params.inputSnapshot) : null,

    );

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId: params.jobId,

      stepId: params.stepId,

      eventType: JOB_EVENT_TYPE.PROVIDER_SUBMITTED,

      payload: JSON.stringify({

        providerName: params.providerName,

        providerTaskId: params.providerTaskId,

      }),

      createdAt: new Date().toISOString(),

    });

    return step;

  }

  async markWaitingPolling(params: {

    jobId: string;

    stepId: string;

    providerName: string;

    providerTaskId: string;

    inputSnapshot?: unknown;

  }) {

    return this.jobStepsRepo.markWaitingPolling(

      params.stepId,

      params.providerName,

      params.providerTaskId,

      params.inputSnapshot ? JSON.stringify(params.inputSnapshot) : null,

    );

  }

  async markWaitingReview(params: {

    jobId: string;

    stepId: string;

    outputSnapshot?: unknown;

  }) {

    const step = await this.jobStepsRepo.markWaitingReview(

      params.stepId,

      params.outputSnapshot ? JSON.stringify(params.outputSnapshot) : null,

    );

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId: params.jobId,

      stepId: params.stepId,

      eventType: JOB_EVENT_TYPE.WAITING_REVIEW,

      payload: JSON.stringify({ waiting: true }),

      createdAt: new Date().toISOString(),

    });

    return step;

  }

  async completeJobSuccess(jobId: string) {

    const job = await this.jobsRepo.finishAsSuccess(jobId);

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      eventType: JOB_EVENT_TYPE.COMPLETED,

      payload: JSON.stringify({ status: JOB_STATUS.SUCCESS }),

      createdAt: new Date().toISOString(),

    });

    return job;

  }

  async completeJobPartialSuccess(jobId: string, errorMessage?: string | null) {

    const job = await this.jobsRepo.finishAsPartialSuccess(jobId, errorMessage);

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      eventType: JOB_EVENT_TYPE.PARTIAL_SUCCESS,

      payload: JSON.stringify({ status: JOB_STATUS.PARTIAL_SUCCESS, errorMessage }),

      createdAt: new Date().toISOString(),

    });

    return job;

  }

  async completeJobFailed(jobId: string, errorCode?: string | null, errorMessage?: string | null) {

    const job = await this.jobsRepo.finishAsFailed(jobId, errorCode, errorMessage);

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      eventType: JOB_EVENT_TYPE.FAILED,

      payload: JSON.stringify({

        status: JOB_STATUS.FAILED,

        errorCode,

        errorMessage,

      }),

      createdAt: new Date().toISOString(),

    });

    return job;

  }

  async cancelQueuedJob(jobId: string) {

    return db.transaction(async () => {

      await this.jobStepsRepo.cancelPendingOrQueuedSteps(jobId);

      const job = await this.jobsRepo.finishAsCancelled(jobId, 'Cancelled before execution');

      await this.jobEventsRepo.append({

        id: `je_${crypto.randomUUID()}`,

        jobId,

        eventType: JOB_EVENT_TYPE.CANCELLED,

        payload: JSON.stringify({ status: JOB_STATUS.CANCELLED }),

        createdAt: new Date().toISOString(),

      });

      return job;

    });

  }

  async requestCancelRunningJob(jobId: string) {

    const job = await this.jobsRepo.requestCancel(jobId);

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId,

      eventType: JOB_EVENT_TYPE.CANCEL_REQUESTED,

      payload: JSON.stringify({ cancelRequested: true }),

      createdAt: new Date().toISOString(),

    });

    return job;

  }

  async handleWorkerInterrupted(jobId: string, stepId?: string) {

    if (stepId) {

      await this.jobStepsRepo.markFailed(

        stepId,

        SYSTEM_ERROR_CODE.JOB_WORKER_INTERRUPTED,

        'Worker interrupted during local synchronous step',

      );

    }

    return this.completeJobFailed(

      jobId,

      SYSTEM_ERROR_CODE.JOB_WORKER_INTERRUPTED,

      'Worker interrupted during execution',

    );

  }

  async findStepByProviderTaskId(providerTaskId: string) {

    return this.jobStepsRepo.findByProviderTaskId(providerTaskId);

  }

  async handleProviderCallbackSuccess(params: {

    providerTaskId: string;

    outputSnapshot?: unknown;

  }) {

    const step = await this.jobStepsRepo.findByProviderTaskId(params.providerTaskId);

    if (!step) return null;

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId: step.jobId,

      stepId: step.id,

      eventType: JOB_EVENT_TYPE.PROVIDER_CALLBACK_RECEIVED,

      payload: JSON.stringify({

        providerTaskId: params.providerTaskId,

        success: true,

      }),

      createdAt: new Date().toISOString(),

    });

    return this.jobStepsRepo.markSucceeded(

      step.id,

      params.outputSnapshot ? JSON.stringify(params.outputSnapshot) : null,

    );

  }

  async handleProviderCallbackFailed(params: {

    providerTaskId: string;

    errorCode?: string | null;

    errorMessage?: string | null;

  }) {

    const step = await this.jobStepsRepo.findByProviderTaskId(params.providerTaskId);

    if (!step) return null;

    await this.jobEventsRepo.append({

      id: `je_${crypto.randomUUID()}`,

      jobId: step.jobId,

      stepId: step.id,

      eventType: JOB_EVENT_TYPE.PROVIDER_CALLBACK_RECEIVED,

      payload: JSON.stringify({

        providerTaskId: params.providerTaskId,

        success: false,

        errorCode: params.errorCode,

        errorMessage: params.errorMessage,

      }),

      createdAt: new Date().toISOString(),

    });

    return this.jobStepsRepo.markFailed(step.id, params.errorCode, params.errorMessage);

  }

  async getNextExecutableStep(jobId: string) {

    return this.jobStepsRepo.getNextExecutableStep(jobId);

  }

  async summarizeJob(jobId: string) {

    const detail = await this.getJobDetail(jobId);

    if (!detail) return null;

    const { job, steps } = detail;

    const total = steps.length;

    const succeeded = steps.filter((s) => s.status === STEP_STATUS.SUCCEEDED).length;

    const failed = steps.filter((s) => s.status === STEP_STATUS.FAILED).length;

    const running = steps.filter((s) => s.status === STEP_STATUS.RUNNING).length;

    const queued = steps.filter((s) => s.status === STEP_STATUS.QUEUED).length;

    const waitingReview = steps.filter(

      (s) => s.executionState === EXECUTION_STATE.WAITING_REVIEW,

    ).length;

    const waitingCallback = steps.filter(

      (s) =>

        s.executionState === EXECUTION_STATE.WAITING_CALLBACK ||

        s.executionState === EXECUTION_STATE.WAITING_POLLING,

    ).length;

    return {

      job,

      summary: {

        total,

        succeeded,

        failed,

        running,

        queued,

        waitingReview,

        waitingCallback,

      },

    };

  }

}

---

# 九、`src/db/repositories/index.ts`

Ts

export * from './jobs.repository';

export * from './job-steps.repository';

export * from './job-events.repository';

export * from './task-center.repository';

---

# 十、推荐补一个 Pipeline Step 定义文件

这不是你刚才明确要的，但非常建议一起做，不然服务层还会散落硬编码。

## `src/constants/pipelines.ts`

Ts

import {

  DRAMA_PIPELINE_STEPS,

  REMIX_PIPELINE_STEPS,

  TALKING_HEAD_PIPELINE_STEPS,

} from './step';

import type { StepDefinition } from '@/types';

export const TALKING_HEAD_PIPELINE_DEFINITION: StepDefinition[] = [

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.CONTENT_PREPARE, stepName: '内容准备', stepOrder: 1, required: true },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.COPY_OPTIMIZE, stepName: '文案优化', stepOrder: 2, required: false },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.TTS_GENERATE, stepName: '生成配音', stepOrder: 3, required: true },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.IMAGE_PREPARE, stepName: '视觉准备', stepOrder: 4, required: true },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.SUBTITLE_GENERATE, stepName: '生成字幕', stepOrder: 5, required: true },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.PREVIEW_COMPOSE, stepName: '预览合成', stepOrder: 6, required: false },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.FINAL_COMPOSE, stepName: '正式合成', stepOrder: 7, required: true },

  { stepCode: TALKING_HEAD_PIPELINE_STEPS.EXPORT_FINALIZE, stepName: '导出收尾', stepOrder: 8, required: true },

];

export const REMIX_PIPELINE_DEFINITION: StepDefinition[] = [

  { stepCode: REMIX_PIPELINE_STEPS.MATERIAL_VALIDATE, stepName: '素材校验', stepOrder: 1, required: true },

  { stepCode: REMIX_PIPELINE_STEPS.CLIP_SPLIT, stepName: '自动拆条', stepOrder: 2, required: false },

  { stepCode: REMIX_PIPELINE_STEPS.SEQUENCE_PREPARE, stepName: '序列准备', stepOrder: 3, required: true },

  { stepCode: REMIX_PIPELINE_STEPS.NARRATION_GENERATE, stepName: '生成解说词', stepOrder: 4, required: false },

  { stepCode: REMIX_PIPELINE_STEPS.TTS_GENERATE, stepName: '解说配音', stepOrder: 5, required: false },

  { stepCode: REMIX_PIPELINE_STEPS.SUBTITLE_GENERATE, stepName: '字幕生成', stepOrder: 6, required: false },

  { stepCode: REMIX_PIPELINE_STEPS.PREVIEW_COMPOSE, stepName: '预览合成', stepOrder: 7, required: false },

  { stepCode: REMIX_PIPELINE_STEPS.FINAL_COMPOSE, stepName: '正式导出', stepOrder: 8, required: true },

];

export const DRAMA_PIPELINE_DEFINITION: StepDefinition[] = [

  { stepCode: DRAMA_PIPELINE_STEPS.SOURCE_VALIDATE, stepName: '内容校验', stepOrder: 1, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.SCRIPT_REWRITE, stepName: '改写剧本', stepOrder: 2, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.CHARACTER_SCENE_EXTRACT, stepName: '角色场景提取', stepOrder: 3, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.VOICE_ASSIGN, stepName: '音色分配', stepOrder: 4, required: false },

  { stepCode: DRAMA_PIPELINE_STEPS.STORYBOARD_GENERATE, stepName: '分镜生成', stepOrder: 5, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.STORYBOARD_REVIEW, stepName: '分镜确认', stepOrder: 6, required: false },

  { stepCode: DRAMA_PIPELINE_STEPS.CHARACTER_IMAGE_GENERATE, stepName: '角色图生成', stepOrder: 7, required: false },

  { stepCode: DRAMA_PIPELINE_STEPS.SCENE_IMAGE_GENERATE, stepName: '场景图生成', stepOrder: 8, required: false },

  { stepCode: DRAMA_PIPELINE_STEPS.FRAME_IMAGE_GENERATE, stepName: '镜头图生成', stepOrder: 9, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.VIDEO_GENERATE, stepName: '镜头视频生成', stepOrder: 10, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.VIDEO_REVIEW, stepName: '视频确认', stepOrder: 11, required: false },

  { stepCode: DRAMA_PIPELINE_STEPS.SHOT_COMPOSE, stepName: '单镜头合成', stepOrder: 12, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.EPISODE_MERGE, stepName: '整集拼接', stepOrder: 13, required: true },

  { stepCode: DRAMA_PIPELINE_STEPS.EXPORT_FINALIZE, stepName: '导出收尾', stepOrder: 14, required: true },

];

---

# 十一、当前 DAO 初稿的能力边界

这套 repository 初稿已经能支撑：

## 已覆盖

- 创建 Job
- 批量创建 JobStep
- 记录 JobEvent
- 领取 queued job
- 标记 step running / success / fail
- 标记 waiting_callback / waiting_polling / waiting_review
- Job success / partial_success / failed / cancelled
- running job 请求取消
- provider callback 成功 / 失败回写
- 任务详情查询
- step 汇总摘要

## 还没覆盖但建议下一步补

- 手动重试创建新 Job
- 从失败 step 继续复制快照
- 业务对象状态回写
- 批量运行聚合
- webhook 幂等去重
- step 超时扫描
- restart recovery 扫描器
- review approve / reject / regenerate

---

# 十二、建议马上再补的两个文件

如果你下一步真要让后端直接进入开发，我最建议接着补这两个：

## 1. `TaskCenterService`

把 repository 组织成真正业务流程：

- `runTalkingHeadPipeline`
- `runDramaEpisodePipeline`
- `approveReviewStep`
- `retryFailedJob`

## 2. `BizStatusUpdater`

统一负责把 Job / Step 结果回写到：

- `talking_head_tasks`
- `remix_tasks`
- `episodes`

否则状态回写逻辑会散落在很多 service 里。

---

# 结论

这份内容已经提供了两块可直接落地的基础：

## 1. 状态枚举与 TS 类型常量

解决“字符串散落、容易拼错、前后端不一致”的问题。

## 2. 任务中心 Repository / DAO 初稿

解决“Job / JobStep / JobEvent 如何以可编码方式落库和推进”的问题。

后端现在已经可以基于这套初稿开始写：

- scheduler
- worker
- webhook handler
- review handler
- pipeline service