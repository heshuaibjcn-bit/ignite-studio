/**
 * Shared column helpers for Drizzle schema definitions.
 * Reduces repetition across table definitions.
 */
import { text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/** Primary key — nanoid-generated text ID. */
export const idCol = (name = 'id') => text(name).primaryKey();

/** Created-at timestamp, defaults to CURRENT_TIMESTAMP. */
export const createdAtCol = () =>
  text('created_at').notNull().default(sql`(datetime('now'))`);

/** Updated-at timestamp, defaults to CURRENT_TIMESTAMP. */
export const updatedAtCol = () =>
  text('updated_at').notNull().default(sql`(datetime('now'))`);

/** Soft-delete timestamp. */
export const deletedAtCol = () => text('deleted_at');

/** Boolean stored as integer (0/1). */
export const boolCol = (name: string, defaultValue = false) =>
  integer(name, { mode: 'boolean' }).notNull().default(defaultValue);

/** Nullable text column. */
export const optTextCol = (name: string) => text(name);

/** JSON stored as text — must be parsed/serialized at application layer. */
export const jsonCol = (name: string) => text(name);

/** Error tracking columns — used on business objects and job steps. */
export const errorCols = () => ({
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
});

/** Step status column — defaults to 'pending'. */
export const stepStatusCol = (name: string) =>
  text(name).notNull().default('pending');

/** Business status column — defaults to 'draft'. */
export const bizStatusCol = () =>
  text('status').notNull().default('draft');
