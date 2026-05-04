/**
 * Step status and execution state constants.
 * These represent the lifecycle of individual pipeline steps.
 *
 * Source: design doc Section 3.3–3.5.
 */

/** Step status — the main state of a pipeline step. */
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

export type StepStatus = (typeof STEP_STATUS)[keyof typeof STEP_STATUS];

/** Execution state —附加态 for running steps awaiting external events. */
export const EXECUTION_STATE = {
  NORMAL: 'normal',
  WAITING_REVIEW: 'waiting_review',
  WAITING_CALLBACK: 'waiting_callback',
  WAITING_POLLING: 'waiting_polling',
} as const;

export type ExecutionState = (typeof EXECUTION_STATE)[keyof typeof EXECUTION_STATE];

/**
 * Talking-head pipeline steps (8 steps).
 * Source: design doc Section 7.1.
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
 * Remix pipeline steps (8 steps).
 * Source: design doc Section 7.2.
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
 * Drama pipeline steps (14 steps) — AUTHORITATIVE.
 * This is the corrected 14-step model from the design doc Section 7.3,
 * NOT the 11-step model from PRD Section 10.3.
 *
 * Three steps were missing from the PRD:
 * - storyboard_review (step 6) — human review of generated storyboards
 * - video_review (step 11) — human review of generated videos
 * - export_finalize (step 14) — export and asset registration
 *
 * Steps 7–12 fan out per-storyboard (~30 per episode).
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

export type DramaStepCode = (typeof DRAMA_PIPELINE_STEPS)[keyof typeof DRAMA_PIPELINE_STEPS];

/** Step definition with metadata. */
export interface StepDefinition {
  readonly stepCode: string;
  readonly stepName: string;
  readonly stepOrder: number;
  readonly required: boolean;
}

/** Drama pipeline step definitions with required/optional flags. */
export const DRAMA_PIPELINE_DEFINITIONS: readonly StepDefinition[] = [
  { stepCode: 'source_validate', stepName: '原始内容校验', stepOrder: 1, required: true },
  { stepCode: 'script_rewrite', stepName: '剧本改写', stepOrder: 2, required: true },
  { stepCode: 'character_scene_extract', stepName: '角色与场景提取', stepOrder: 3, required: true },
  { stepCode: 'voice_assign', stepName: '音色分配', stepOrder: 4, required: false },
  { stepCode: 'storyboard_generate', stepName: '分镜生成', stepOrder: 5, required: true },
  { stepCode: 'storyboard_review', stepName: '分镜人工确认', stepOrder: 6, required: false },
  { stepCode: 'character_image_generate', stepName: '角色图生成', stepOrder: 7, required: false },
  { stepCode: 'scene_image_generate', stepName: '场景图生成', stepOrder: 8, required: false },
  { stepCode: 'frame_image_generate', stepName: '镜头图生成', stepOrder: 9, required: true },
  { stepCode: 'video_generate', stepName: '镜头视频生成', stepOrder: 10, required: true },
  { stepCode: 'video_review', stepName: '镜头视频人工确认', stepOrder: 11, required: false },
  { stepCode: 'shot_compose', stepName: '单镜头合成', stepOrder: 12, required: true },
  { stepCode: 'episode_merge', stepName: '整集拼接', stepOrder: 13, required: true },
  { stepCode: 'export_finalize', stepName: '导出与资产落库', stepOrder: 14, required: true },
] as const;

/** Steps 7–12 fan out per-storyboard. */
export const DRAMA_FAN_OUT_STEPS: readonly string[] = [
  'character_image_generate',
  'scene_image_generate',
  'frame_image_generate',
  'video_generate',
  'video_review',
  'shot_compose',
] as const;

/** Steps that require human review (config-dependent). */
export const DRAMA_REVIEW_STEPS: readonly string[] = [
  'storyboard_review',
  'video_review',
] as const;
