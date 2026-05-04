/**
 * Storyboard Reference Collection
 *
 * Collects reference images (character, scene, storyboard first/last frame)
 * for grid prompt generation. Builds reference legends and per-storyboard hints.
 */
import { getDb } from '@/db/client';
import { characters, scenes, storyboards, episodeCharacters, episodeScenes } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface ReferenceAsset {
  path: string;
  label: string;
  kind: 'scene' | 'character' | 'storyboard';
  imageIndex: number;
  imageLabel: string;
  sceneId?: string;
  characterId?: string;
  storyboardId?: string;
}

function safeParseJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  try {
    const parsed = JSON.parse(value as string);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Collect all reference assets for a set of storyboards.
 * Gathers: storyboard first/last frames, storyboard reference images,
 * linked scene images, and linked character images.
 * Returns at most 6 images to stay within provider limits.
 */
export async function collectGridReferenceAssets(
  storyboardRows: Array<{
    id: string;
    episodeId: string;
    sceneId: string | null;
    selectedImageAssetId: string | null;
    imageCandidateAssetIds: unknown;
  }>,
): Promise<ReferenceAsset[]> {
  const db = getDb();
  const storyboardIds = storyboardRows.map((sb) => sb.id);
  const episodeId = storyboardRows[0]?.episodeId;

  // Get episode-character and episode-scene links
  let charLinks: Array<{ characterId: string; episodeId: string }> = [];
  let sceneLinks: Array<{ sceneId: string; episodeId: string }> = [];
  if (episodeId) {
    charLinks = await db
      .select()
      .from(episodeCharacters)
      .where(eq(episodeCharacters.episodeId, episodeId));
    sceneLinks = await db
      .select()
      .from(episodeScenes)
      .where(eq(episodeScenes.episodeId, episodeId));
  }

  const characterIds = [...new Set(charLinks.map((l) => l.characterId).filter(Boolean))];
  const sceneIds = [
    ...new Set([
      ...storyboardRows.map((sb) => sb.sceneId).filter((id): id is string => !!id),
      ...sceneLinks.map((l) => l.sceneId).filter((id): id is string => !!id),
    ]),
  ];

  // Fetch character and scene records
  const charRecords =
    characterIds.length > 0
      ? await db
          .select({ id: characters.id, name: characters.name, imageAssetId: characters.imageAssetId })
          .from(characters)
          .where(inArray(characters.id, characterIds))
      : [];
  const sceneRecords =
    sceneIds.length > 0
      ? await db
          .select({ id: scenes.id, name: scenes.name, imageAssetId: scenes.imageAssetId })
          .from(scenes)
          .where(inArray(scenes.id, sceneIds))
      : [];

  const assets: Array<{
    path: string;
    label: string;
    kind: 'scene' | 'character' | 'storyboard';
    sceneId?: string;
    characterId?: string;
    storyboardId?: string;
  }> = [];
  const seen = new Set<string>();

  const pushAsset = (
    path: string | null | undefined,
    label: string,
    kind: 'scene' | 'character' | 'storyboard',
    extra: { sceneId?: string; characterId?: string; storyboardId?: string } = {},
  ) => {
    if (!path || seen.has(path) || assets.length >= 6) return;
    seen.add(path);
    assets.push({ path, label, kind, ...extra });
  };

  // Storyboard-level images
  for (const sb of storyboardRows) {
    // Use selectedImageAssetId as the storyboard's main image
    if (sb.selectedImageAssetId) {
      pushAsset(sb.selectedImageAssetId, `镜头图`, 'storyboard', { storyboardId: sb.id });
    }
    // Reference images from candidates
    const candidates = safeParseJsonArray(sb.imageCandidateAssetIds);
    for (const ref of candidates) {
      pushAsset(ref, `镜头参考图`, 'storyboard', { storyboardId: sb.id });
    }
  }

  // Scene images
  for (const scene of sceneRecords) {
    if (scene.imageAssetId) {
      pushAsset(scene.imageAssetId, `${scene.name}场景`, 'scene', { sceneId: scene.id });
    }
  }

  // Character images
  for (const char of charRecords) {
    if (char.imageAssetId) {
      pushAsset(char.imageAssetId, `${char.name}角色`, 'character', { characterId: char.id });
    }
  }

  return assets.map((asset, index) => ({
    ...asset,
    imageIndex: index + 1,
    imageLabel: `图片${index + 1}`,
  }));
}

/**
 * Build a reference legend string: "图片1=角色A；图片2=场景B"
 */
export function buildReferenceLegend(
  referenceAssets: Array<{ imageLabel: string; label: string }>,
): string {
  if (!referenceAssets.length) return '';
  return referenceAssets.map((a) => `${a.imageLabel}=${a.label}`).join('；');
}

/**
 * Build reference hints for a specific storyboard.
 * Returns which reference images are relevant to this storyboard.
 */
export function buildStoryboardReferenceHints(
  storyboardId: string,
  sceneId: string | null,
  referenceAssets: ReferenceAsset[],
  linkedCharacterIds: string[],
): string[] {
  const hints: string[] = [];

  for (const asset of referenceAssets) {
    if (asset.kind === 'scene' && sceneId && asset.sceneId === sceneId) {
      hints.push(`${asset.imageLabel}（${asset.label}）`);
    }
    if (
      asset.kind === 'character' &&
      asset.characterId &&
      linkedCharacterIds.includes(asset.characterId)
    ) {
      hints.push(`${asset.imageLabel}（${asset.label}）`);
    }
    if (asset.kind === 'storyboard' && asset.storyboardId === storyboardId) {
      hints.push(`${asset.imageLabel}（${asset.label}）`);
    }
  }

  return [...new Set(hints)].slice(0, 4);
}
