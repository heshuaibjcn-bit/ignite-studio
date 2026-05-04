/**
 * Standard API response helpers.
 * All routes use the same envelope: { success, data, error }.
 */
import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data, error: null }, { status });
}

export function apiError(code: string, message: string, status = 400): NextResponse {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status },
  );
}

export function apiNotFound(resource: string, id: string): NextResponse {
  return apiError('NOT_FOUND', `${resource} ${id} not found`, 404);
}

export function apiInternalError(message: string): NextResponse {
  return apiError('INTERNAL_ERROR', message, 500);
}
