/**
 * Text versioning schema — tracks changes to text fields across business objects.
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol } from './common';

export const textVersions = sqliteTable('text_versions', {
  id: idCol(),
  bizType: text('biz_type').notNull(),
  bizId: text('biz_id').notNull(),
  fieldName: text('field_name').notNull(),
  versionNo: integer('version_no').notNull(),
  content: text('content').notNull(),
  sourceType: text('source_type').notNull(), // manual | agent | system | rollback
  createdBy: text('created_by'),
  createdAt: createdAtCol(),
}, (t) => [
  index('idx_text_versions_biz').on(t.bizType, t.bizId, t.fieldName),
]);
