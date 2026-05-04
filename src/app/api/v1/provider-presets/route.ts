/**
 * Provider Presets API
 * GET — list provider presets, optionally filtered by service type.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPresetsForService, PROVIDER_PRESETS } from '@/lib/provider-presets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceType = searchParams.get('serviceType') as
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'asr'
    | null;

  if (serviceType) {
    const presets = getPresetsForService(serviceType);
    return NextResponse.json({ presets });
  }

  return NextResponse.json({ presets: PROVIDER_PRESETS });
}
