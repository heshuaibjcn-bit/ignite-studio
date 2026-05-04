/**
 * Projects and Productions schema.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { idCol, createdAtCol, updatedAtCol, jsonCol } from './common';

export const projects = sqliteTable('projects', {
  id: idCol(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  coverAssetId: text('cover_asset_id'),
  status: text('status').notNull().default('active'),
  defaultVoiceId: text('default_voice_id'),
  ownerId: text('owner_id'),
  /** Production type: narrative_drama | narrated_image | commentary_mix */
  productionType: text('production_type').notNull().default('narrative_drama'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

export const productions = sqliteTable('productions', {
  id: idCol(),
  projectId: text('project_id').notNull(),
  mode: text('mode').notNull(), // talking_head | remix | drama
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  configSnapshot: jsonCol('config_snapshot'),
  templateIds: jsonCol('template_ids'),
  defaultVoiceId: text('default_voice_id'),
  ownerId: text('owner_id'),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});
