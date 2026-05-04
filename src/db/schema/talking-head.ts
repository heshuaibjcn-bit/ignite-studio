/**
 * Talking Head module schema.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, jsonCol, stepStatusCol, bizStatusCol, errorCols } from './common';

export const talkingHeadTasks = sqliteTable('talking_head_tasks', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  productionId: text('production_id').notNull(),
  title: text('title').notNull(),
  originalContent: text('original_content').notNull(),
  optimizedContent: text('optimized_content'),
  voiceId: text('voice_id'),
  audioAssetId: text('audio_asset_id'),
  subtitleAssetId: text('subtitle_asset_id'),
  previewVideoAssetId: text('preview_video_asset_id'),
  finalVideoAssetId: text('final_video_asset_id'),
  status: bizStatusCol(),
  contentStatus: stepStatusCol('content_status'),
  optimizeStatus: stepStatusCol('optimize_status'),
  ttsStatus: stepStatusCol('tts_status'),
  imageStatus: stepStatusCol('image_status'),
  subtitleStatus: stepStatusCol('subtitle_status'),
  composeStatus: stepStatusCol('compose_status'),
  exportStatus: stepStatusCol('export_status'),
  configSnapshot: jsonCol('config_snapshot'),
  currentJobId: text('current_job_id'),
  ...errorCols(),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const contentSegments = sqliteTable('content_segments', {
  id: idCol(),
  taskId: text('task_id').notNull(),
  seq: integer('seq').notNull(),
  text: text('text').notNull(),
  optimizedText: text('optimized_text'),
  startMs: integer('start_ms'),
  endMs: integer('end_ms'),
  imageAssetId: text('image_asset_id'),
  visualItems: jsonCol('visual_items'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const talkingHeadExports = sqliteTable('talking_head_exports', {
  id: idCol(),
  taskId: text('task_id').notNull(),
  assetId: text('asset_id').notNull(),
  exportType: text('export_type').notNull(), // preview | final
  jobId: text('job_id'),
  createdAt: createdAtCol(),
});
