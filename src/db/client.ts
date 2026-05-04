/**
 * Database client — SQLite via better-sqlite3 with Drizzle ORM.
 *
 * - Uses WAL mode for better concurrent read performance.
 * - Reads DB path from DATABASE_URL env var (default: ./data/ignite-studio.db).
 * - Creates parent directory if it doesn't exist.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;
let _sqlite: Database.Database | null = null;

function getDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || './data/ignite-studio.db';
  // Strip file: prefix if present
  const cleanPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl;
  return path.resolve(cleanPath);
}

function ensureDataDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb() {
  if (_db) return _db;

  const dbPath = getDbPath();
  ensureDataDir(dbPath);

  _sqlite = new Database(dbPath);
  // Enable WAL mode for better concurrent read performance
  _sqlite.pragma('journal_mode = WAL');
  // Enable foreign keys
  _sqlite.pragma('foreign_keys = ON');

  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function getSqlite(): Database.Database {
  if (!_sqlite) {
    getDb(); // initializes _sqlite
  }
  return _sqlite!;
}

/** Close the database connection. Useful for tests and graceful shutdown. */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _db = null;
    _sqlite = null;
  }
}

/** Check if the database is reachable. */
export function isDbHealthy(): boolean {
  try {
    const sqlite = getSqlite();
    sqlite.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
