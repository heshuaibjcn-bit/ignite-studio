/**
 * Audit log schema.
 */
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, jsonCol } from './common';

export const auditLogs = sqliteTable('audit_logs', {
  id: idCol(),
  actorType: text('actor_type').notNull(), // user | system | openclaw
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonCol('details'),
  createdAt: createdAtCol(),
}, (t) => [
  index('idx_audit_logs_target').on(t.targetType, t.targetId),
  index('idx_audit_logs_actor').on(t.actorType, t.actorId),
]);
