/**
 * AI Voices API
 * GET — list voices for a provider.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { aiVoices } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'edge';

  const db = getDb();
  const rows = await db
    .select()
    .from(aiVoices)
    .where(eq(aiVoices.provider, provider));

  const parsed = rows.map((r) => ({
    id: r.id,
    voice_id: r.providerVoiceId,
    voice_name: r.name,
    gender: r.gender,
    language: r.language,
    style: r.style,
    provider: r.provider,
  }));

  return NextResponse.json({ voices: parsed });
}
