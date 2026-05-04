/**
 * AI Service Configs, Agent Configs, Voices, and Templates schema.
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, boolCol, jsonCol } from './common';

export const aiServiceConfigs = sqliteTable('ai_service_configs', {
  id: idCol(),
  name: text('name').notNull(),
  serviceType: text('service_type').notNull(), // text | image | video | audio | asr
  provider: text('provider').notNull(),
  model: text('model'),
  apiBase: text('api_base'),
  apiKeyEncrypted: text('api_key_encrypted'),
  configPayload: jsonCol('config_payload'),
  isActive: boolCol('is_active', true),
  priority: integer('priority').notNull().default(100),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const agentConfigs = sqliteTable('agent_configs', {
  id: idCol(),
  agentType: text('agent_type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  enabled: boolCol('enabled', true),
  modelConfigId: text('model_config_id'),
  /** LLM model override for this agent (e.g., 'gpt-4o', 'claude-3.5-sonnet') */
  model: text('model'),
  /** Temperature for generation (0.0 - 2.0) */
  temperature: real('temperature'),
  /** Maximum tokens for generation */
  maxTokens: integer('max_tokens'),
  /** Custom system prompt (appended to skill prompt) */
  systemPrompt: text('system_prompt'),
  promptTemplate: jsonCol('prompt_template'),
  toolConfig: jsonCol('tool_config'),
  extraConfig: jsonCol('extra_config'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const aiVoices = sqliteTable('ai_voices', {
  id: idCol(),
  provider: text('provider').notNull(),
  providerVoiceId: text('provider_voice_id').notNull(),
  name: text('name').notNull(),
  gender: text('gender'),
  language: text('language'),
  style: text('style'),
  previewAssetId: text('preview_asset_id'),
  isActive: boolCol('is_active', true),
  sortOrder: integer('sort_order').notNull().default(100),
  extraPayload: jsonCol('extra_payload'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const templates = sqliteTable('templates', {
  id: idCol(),
  type: text('type').notNull(), // talking_head_config | remix_config | drama_config | subtitle_style
  name: text('name').notNull(),
  description: text('description'),
  payload: jsonCol('payload'),
  versionNo: integer('version_no').notNull().default(1),
  isActive: boolCol('is_active', true),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
