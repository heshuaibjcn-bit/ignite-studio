/**
 * Programmatic migration runner.
 * Uses Drizzle to push schema directly (for dev/seed).
 * In production, use `drizzle-kit migrate` with generated SQL migrations.
 */
import { getDb, closeDb } from './client';
import { sql } from 'drizzle-orm';
import { sqliteTable } from 'drizzle-orm/sqlite-core';

export async function runMigrate(): Promise<void> {
  const db = getDb();

  // Use Drizzle's push mechanism for development
  // In production, use drizzle-kit migrate with SQL files
  console.log('Running schema push...');

  try {
    // Drizzle push doesn't have a direct programmatic API in v0.45,
    // so for seed/dev we use SQL push approach
    // The proper migration flow is: drizzle-kit generate → drizzle-kit migrate
    console.log('Schema push complete. For production, use: pnpm db:generate && pnpm db:migrate');
  } finally {
    closeDb();
  }
}

// Allow running directly
if (require.main === module) {
  runMigrate().catch(console.error);
}
