/**
 * OpenClaw integration schema — API keys and call logs.
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, boolCol, jsonCol } from './common';

export const apiKeys = sqliteTable('api_keys', {
  id: idCol(),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull(),
  status: text('status').notNull().default('active'),
  dailyQuota: integer('daily_quota').notNull().default(500),
  perMinuteLimit: integer('per_minute_limit').notNull().default(60),
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
}, (t) => [
  index('idx_api_keys_prefix').on(t.keyPrefix),
]);

export const apiCallLogs = sqliteTable('api_call_logs', {
  id: idCol(),
  apiKeyId: text('api_key_id'),
  requestId: text('request_id').notNull(),
  skillName: text('skill_name'),
  path: text('path').notNull(),
  method: text('method').notNull(),
  bizType: text('biz_type'),
  bizId: text('biz_id'),
  jobId: text('job_id'),
  statusCode: integer('status_code').notNull(),
  success: boolCol('success', false),
  durationMs: integer('duration_ms'),
  errorCode: text('error_code'),
  requestPayload: jsonCol('request_payload'),
  responsePayload: jsonCol('response_payload'),
  clientIp: text('client_ip'),
  createdAt: createdAtCol(),
}, (t) => [
  index('idx_api_call_logs_key').on(t.apiKeyId),
  index('idx_api_call_logs_request').on(t.requestId),
]);
