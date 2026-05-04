/**
 * Assets and Asset References schema.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, deletedAtCol, boolCol } from './common';

export const assets = sqliteTable('assets', {
  id: idCol(),
  projectId: text('project_id'),
  productionId: text('production_id'),
  type: text('type').notNull(), // image | video | audio | subtitle | template | document
  sourceType: text('source_type').notNull(), // upload | generated | imported | extracted | system
  sourceProvider: text('source_provider'),
  originJobId: text('origin_job_id'),
  title: text('title'),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  checksum: text('checksum'),
  localPath: text('local_path').notNull(),
  previewUrl: text('preview_url'),
  thumbnailUrl: text('thumbnail_url'),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  fps: integer('fps'),
  sampleRate: integer('sample_rate'),
  channels: integer('channels'),
  status: text('status').notNull().default('active'),
  versionNo: integer('version_no').notNull().default(1),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
  deletedAt: deletedAtCol(),
});

export const assetReferences = sqliteTable('asset_references', {
  id: idCol(),
  assetId: text('asset_id').notNull(),
  refType: text('ref_type').notNull(), // talking_head_task | episode | storyboard | ...
  refId: text('ref_id').notNull(),
  refField: text('ref_field').notNull(),
  isCurrent: boolCol('is_current', true),
  createdAt: createdAtCol(),
});
