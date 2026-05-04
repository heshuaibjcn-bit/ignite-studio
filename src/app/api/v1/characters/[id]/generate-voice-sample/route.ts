/**
 * Character Voice Sample Generation API
 * POST — generate a TTS voice sample for a character.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { characters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { generateVoiceSample } from '@/services/tts-generation';
import { logTaskStart, logTaskSuccess, logTaskError } from '@/lib/task-logger';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const db = getDb();
    const rows = await db.select().from(characters).where(eq(characters.id, id));
    if (!rows.length) return apiError('NOT_FOUND', 'Character not found', 404);

    const char = rows[0];
    if (!char.voiceId) {
      return apiError('MISSING_VOICE', '请先分配音色', 400);
    }

    logTaskStart('VoiceSample', 'generate', {
      characterId: id,
      characterName: char.name,
      voiceId: char.voiceId,
    });

    const result = await generateVoiceSample(
      char.voiceId,
      char.voiceProvider || undefined,
    );

    // Update character with voice sample URL
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await db
      .update(characters)
      .set({ voiceSampleUrl: result.localPath, updatedAt: now })
      .where(eq(characters.id, id));

    logTaskSuccess('VoiceSample', 'generate', { characterId: id, path: result.localPath });

    return apiSuccess({ voice_sample_url: result.localPath });
  } catch (err) {
    logTaskError('VoiceSample', 'generate', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
