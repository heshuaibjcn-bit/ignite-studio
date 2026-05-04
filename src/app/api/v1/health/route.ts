/**
 * Health check route — GET /api/v1/health
 *
 * Validates Next.js 16 Route Handler patterns and DB connectivity.
 */
import { NextResponse } from 'next/server';
import { getSqlite } from '@/db/client';

const startTime = Date.now();

export async function GET() {
  let dbStatus: string;
  try {
    const sqlite = getSqlite();
    sqlite.prepare('SELECT 1').get();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  return NextResponse.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    version: '0.1.0',
    db: dbStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
}
