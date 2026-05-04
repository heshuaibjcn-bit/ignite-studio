/**
 * Drama module schema.
 *
 * IMPORTANT: Episode table uses 14 step status columns (corrected from the
 * original 12-column draft). The design doc Section 7.3 defines the authoritative
 * 14-step pipeline. Missing columns that were added:
 * - storyboardReviewStatus (step 6)
 * - videoReviewStatus (step 11)
 *
 * Steps 7–12 fan out per-storyboard. See job_step_items in jobs.ts.
 */
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, jsonCol, stepStatusCol, bizStatusCol, errorCols } from './common';

export const characters = sqliteTable('characters', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  gender: text('gender'),
  ageDesc: text('age_desc'),
  personality: text('personality'),
  appearancePrompt: text('appearance_prompt'),
  voiceId: text('voice_id'),
  imageAssetId: text('image_asset_id'),
  /** TTS voice provider (e.g., 'edge', 'minimax', 'openai') */
  voiceProvider: text('voice_provider'),
  /** Generated voice sample URL for preview */
  voiceSampleUrl: text('voice_sample_url'),
  extraPayload: jsonCol('extra_payload'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const scenes = sqliteTable('scenes', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  locationDesc: text('location_desc'),
  timeDesc: text('time_desc'),
  styleDesc: text('style_desc'),
  imageAssetId: text('image_asset_id'),
  extraPayload: jsonCol('extra_payload'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const episodeCharacters = sqliteTable('episode_characters', {
  id: idCol(),
  episodeId: text('episode_id').notNull(),
  characterId: text('character_id').notNull(),
  createdAt: createdAtCol(),
}, (t) => [
  uniqueIndex('idx_episode_characters_uniq').on(t.episodeId, t.characterId),
]);

export const episodeScenes = sqliteTable('episode_scenes', {
  id: idCol(),
  episodeId: text('episode_id').notNull(),
  sceneId: text('scene_id').notNull(),
  createdAt: createdAtCol(),
}, (t) => [
  uniqueIndex('idx_episode_scenes_uniq').on(t.episodeId, t.sceneId),
]);

export const episodes = sqliteTable('episodes', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  productionId: text('production_id').notNull(),
  episodeNo: integer('episode_no').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  scriptContent: text('script_content'),
  finalVideoAssetId: text('final_video_asset_id'),
  status: bizStatusCol(),
  // 14 step status columns (corrected from 12)
  sourceValidateStatus: stepStatusCol('source_validate_status'),
  scriptRewriteStatus: stepStatusCol('script_rewrite_status'),
  characterSceneExtractStatus: stepStatusCol('character_scene_extract_status'),
  voiceAssignStatus: stepStatusCol('voice_assign_status'),
  storyboardGenerateStatus: stepStatusCol('storyboard_generate_status'),
  storyboardReviewStatus: stepStatusCol('storyboard_review_status'),     // ← WAS MISSING
  characterImageGenerateStatus: stepStatusCol('character_image_generate_status'),
  sceneImageGenerateStatus: stepStatusCol('scene_image_generate_status'),
  frameImageGenerateStatus: stepStatusCol('frame_image_generate_status'),
  videoGenerateStatus: stepStatusCol('video_generate_status'),
  videoReviewStatus: stepStatusCol('video_review_status'),               // ← WAS MISSING
  shotComposeStatus: stepStatusCol('shot_compose_status'),
  episodeMergeStatus: stepStatusCol('episode_merge_status'),
  exportFinalizeStatus: stepStatusCol('export_finalize_status'),
  waitingReviewStep: text('waiting_review_step'),
  currentJobId: text('current_job_id'),
  configSnapshot: jsonCol('config_snapshot'),
  ...errorCols(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const storyboardCharacters = sqliteTable('storyboard_characters', {
  storyboardId: text('storyboard_id').notNull(),
  characterId: text('character_id').notNull(),
}, (t) => [
  uniqueIndex('idx_storyboard_characters_pk').on(t.storyboardId, t.characterId),
]);

export const storyboards = sqliteTable('storyboards', {
  id: idCol(),
  episodeId: text('episode_id').notNull(),
  seq: integer('seq').notNull(),
  title: text('title'),
  shotType: text('shot_type'),
  visualDesc: text('visual_desc').notNull(),
  dialogue: text('dialogue'),
  actionDesc: text('action_desc'),
  durationSec: integer('duration_sec'),
  sceneId: text('scene_id'),
  promptText: text('prompt_text'),
  /** Camera angle: 平视/仰视/俯视/鸟瞰/斜角 etc. */
  angle: text('angle'),
  /** Camera movement: 固定/摇/移/推拉/跟 etc. */
  movement: text('movement'),
  /** Atmosphere/mood: 紧张/温馨/忧郁/欢快 etc. */
  atmosphere: text('atmosphere'),
  /** Video generation prompt */
  videoPrompt: text('video_prompt'),
  /** BGM prompt for composition */
  bgmPrompt: text('bgm_prompt'),
  /** Sound effect description */
  soundEffect: text('sound_effect'),
  /** TTS-generated audio asset path */
  ttsAudioAssetId: text('tts_audio_asset_id'),
  selectedImageAssetId: text('selected_image_asset_id'),
  selectedVideoAssetId: text('selected_video_asset_id'),
  composedVideoAssetId: text('composed_video_asset_id'),
  imageCandidateAssetIds: jsonCol('image_candidate_asset_ids'),
  videoCandidateAssetIds: jsonCol('video_candidate_asset_ids'),
  status: bizStatusCol(),
  ...errorCols(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
}, (t) => [
  index('idx_storyboards_episode').on(t.episodeId),
]);

export const imageGenerations = sqliteTable('image_generations', {
  id: idCol(),
  projectId: text('project_id'),
  episodeId: text('episode_id'),
  storyboardId: text('storyboard_id'),
  targetType: text('target_type').notNull(), // character | scene | frame
  targetId: text('target_id'),
  promptText: text('prompt_text'),
  provider: text('provider'),
  model: text('model'),
  jobId: text('job_id'),
  assetId: text('asset_id'),
  status: text('status').notNull().default('queued'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const videoGenerations = sqliteTable('video_generations', {
  id: idCol(),
  projectId: text('project_id'),
  episodeId: text('episode_id'),
  storyboardId: text('storyboard_id'),
  imageAssetId: text('image_asset_id'),
  promptText: text('prompt_text'),
  provider: text('provider'),
  model: text('model'),
  jobId: text('job_id'),
  assetId: text('asset_id'),
  status: text('status').notNull().default('queued'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const videoMerges = sqliteTable('video_merges', {
  id: idCol(),
  episodeId: text('episode_id').notNull(),
  inputAssetIds: jsonCol('input_asset_ids'),
  outputAssetId: text('output_asset_id'),
  status: text('status').notNull().default('pending'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
