/**
 * Character Detail API
 * GET — get a character by ID.
 * PUT — update a character.
 * DELETE — delete a character and its episode links.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { characters, episodeCharacters, storyboardCharacters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(characters).where(eq(characters.id, id));
    if (!rows.length) return apiNotFound('Character', id);
    const c = rows[0];
    return apiSuccess({
      id: c.id,
      project_id: c.projectId,
      name: c.name,
      description: c.description,
      gender: c.gender,
      age_desc: c.ageDesc,
      personality: c.personality,
      appearance_prompt: c.appearancePrompt,
      voice_id: c.voiceId,
      voice_provider: c.voiceProvider,
      voice_sample_url: c.voiceSampleUrl,
      image_asset_id: c.imageAssetId,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const rows = await db.select().from(characters).where(eq(characters.id, id));
    if (!rows.length) return apiNotFound('Character', id);

    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const updates: Record<string, unknown> = { updatedAt: now };

    // Map snake_case request fields to camelCase DB columns
    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      gender: 'gender',
      age_desc: 'ageDesc',
      personality: 'personality',
      appearance_prompt: 'appearancePrompt',
      voice_id: 'voiceId',
      voice_provider: 'voiceProvider',
      voice_sample_url: 'voiceSampleUrl',
      image_asset_id: 'imageAssetId',
    };
    for (const [bodyKey, colKey] of Object.entries(fieldMap)) {
      if (bodyKey in body) updates[colKey] = body[bodyKey];
    }

    await db.update(characters).set(updates).where(eq(characters.id, id));
    return apiSuccess({ updated: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = await db.select().from(characters).where(eq(characters.id, id));
    if (!rows.length) return apiNotFound('Character', id);

    // Remove episode links
    await db.delete(episodeCharacters).where(eq(episodeCharacters.characterId, id));
    // Remove storyboard links
    await db.delete(storyboardCharacters).where(eq(storyboardCharacters.characterId, id));
    // Delete character
    await db.delete(characters).where(eq(characters.id, id));

    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
