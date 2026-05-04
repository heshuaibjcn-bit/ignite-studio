/**
 * Batch Characters Save API
 * PUT — batch save/update characters for a project.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { characters, episodeCharacters } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';
import { nanoid } from 'nanoid';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { episode_id, characters: chars } = body;

    if (!Array.isArray(chars)) {
      return apiNotFound('Request', 'characters array is required');
    }

    const db = getDb();
    const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    let created = 0;
    let updated = 0;

    for (const c of chars) {
      if (!c.name) continue;

      const existing = (await db.select().from(characters).where(eq(characters.projectId, projectId)))
        .find(ch => ch.name === c.name);

      if (existing) {
        const updates: Record<string, unknown> = { updatedAt: ts };
        if (c.description) updates.description = c.description;
        if (c.gender) updates.gender = c.gender;
        if (c.appearance_prompt || c.appearancePrompt) updates.appearancePrompt = c.appearance_prompt ?? c.appearancePrompt;
        if (c.personality) updates.personality = c.personality;
        if (c.voice_id || c.voiceId) updates.voiceId = c.voice_id ?? c.voiceId;
        if (c.voice_provider || c.voiceProvider) updates.voiceProvider = c.voice_provider ?? c.voiceProvider;

        await db.update(characters).set(updates).where(eq(characters.id, existing.id));
        updated++;
      } else {
        const charId = `char_${nanoid(21)}`;
        await db.insert(characters).values({
          id: charId,
          projectId,
          name: c.name,
          description: c.description ?? null,
          gender: c.gender ?? null,
          appearancePrompt: c.appearance_prompt ?? c.appearancePrompt ?? null,
          personality: c.personality ?? null,
          createdAt: ts,
          updatedAt: ts,
        });
        created++;
      }
    }

    // If episode_id provided, link all characters to the episode
    if (episode_id) {
      const allChars = await db.select().from(characters).where(eq(characters.projectId, projectId));
      for (const ch of allChars) {
        const links = await db.select().from(episodeCharacters).where(
          and(eq(episodeCharacters.episodeId, episode_id), eq(episodeCharacters.characterId, ch.id)),
        );
        if (links.length === 0) {
          await db.insert(episodeCharacters).values({
            id: `ec_${nanoid(21)}`,
            episodeId: episode_id,
            characterId: ch.id,
            createdAt: ts,
          });
        }
      }
    }

    return apiSuccess({ created, updated, total: chars.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
