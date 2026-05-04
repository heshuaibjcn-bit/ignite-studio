/**
 * Remix module schema.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, jsonCol, stepStatusCol, bizStatusCol, boolCol, errorCols } from './common';

export const sourceMaterials = sqliteTable('source_materials', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  productionId: text('production_id').notNull(),
  assetId: text('asset_id').notNull(),
  title: text('title').notNull(),
  importType: text('import_type').notNull(), // upload | url
  sourceUrl: text('source_url'),
  durationMs: integer('duration_ms'),
  width: integer('width'),
  height: integer('height'),
  fps: integer('fps'),
  audioTracks: integer('audio_tracks'),
  status: text('status').notNull().default('pending'),
  ...errorCols(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const clips = sqliteTable('clips', {
  id: idCol(),
  sourceMaterialId: text('source_material_id').notNull(),
  versionNo: integer('version_no').notNull().default(1),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  summary: text('summary'),
  transcript: text('transcript'),
  tagsJson: jsonCol('tags_json'),
  score: integer('score'),
  confidence: integer('confidence'),
  splitMethod: text('split_method').notNull(), // scene | asr | semantic | manual
  manualAdjusted: boolCol('manual_adjusted', false),
  previewAssetId: text('preview_asset_id'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const remixTasks = sqliteTable('remix_tasks', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  productionId: text('production_id').notNull(),
  title: text('title').notNull(),
  narrationScript: text('narration_script'),
  finalVideoAssetId: text('final_video_asset_id'),
  status: bizStatusCol(),
  materialStatus: stepStatusCol('material_status'),
  splitStatus: stepStatusCol('split_status'),
  sequenceStatus: stepStatusCol('sequence_status'),
  narrationStatus: stepStatusCol('narration_status'),
  ttsStatus: stepStatusCol('tts_status'),
  subtitleStatus: stepStatusCol('subtitle_status'),
  previewStatus: stepStatusCol('preview_status'),
  finalComposeStatus: stepStatusCol('final_compose_status'),
  configSnapshot: jsonCol('config_snapshot'),
  currentJobId: text('current_job_id'),
  ...errorCols(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const remixTaskMaterials = sqliteTable('remix_task_materials', {
  id: idCol(),
  remixTaskId: text('remix_task_id').notNull(),
  sourceMaterialId: text('source_material_id').notNull(),
  createdAt: createdAtCol(),
});

export const clipSequenceItems = sqliteTable('clip_sequence_items', {
  id: idCol(),
  remixTaskId: text('remix_task_id').notNull(),
  clipId: text('clip_id').notNull(),
  seq: integer('seq').notNull(),
  sourceMaterialId: text('source_material_id').notNull(),
  trimInMs: integer('trim_in_ms'),
  trimOutMs: integer('trim_out_ms'),
  playbackRate: integer('playback_rate'), // stored as *100, e.g. 100=1.0
  keepOriginalAudio: boolCol('keep_original_audio', false),
  muteOriginalAudio: boolCol('mute_original_audio', false),
  transitionAfter: text('transition_after'), // fade | cut | slide | none
  overlaySubtitleMode: text('overlay_subtitle_mode'), // none | burn | external
  notes: text('notes'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const remixExports = sqliteTable('remix_exports', {
  id: idCol(),
  remixTaskId: text('remix_task_id').notNull(),
  assetId: text('asset_id').notNull(),
  exportType: text('export_type').notNull(), // preview | final
  jobId: text('job_id'),
  createdAt: createdAtCol(),
});
