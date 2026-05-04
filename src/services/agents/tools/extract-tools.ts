/**
 * Extraction Agent Tools
 * Tools for the extractor agent to save characters and scenes with deduplication.
 * Ported from huobao-drama with readExisting + saveDedup pattern.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { episodes, characters, scenes, episodeCharacters, episodeScenes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';

function genId(prefix: string): string {
  return `${prefix}_${nanoid(21)}`;
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

export function createExtractTools(episodeId: string, projectId: string): ToolSet {
  return {
    /** Read the formatted screenplay for extraction */
    read_script: tool({
      description: '读取当前剧集的格式化剧本',
      inputSchema: z.object({}),
      execute: async () => {
        const db = getDb();
        const rows = await db.select().from(episodes).where(eq(episodes.id, episodeId));
        if (rows.length === 0) return { error: 'Episode not found' };
        return {
          episodeId: rows[0].id,
          title: rows[0].title,
          scriptContent: rows[0].scriptContent ?? rows[0].content,
        };
      },
    }),

    /** Read existing characters in the project for deduplication */
    read_existing_characters: tool({
      description: '读取项目中已有的角色列表，用于去重判断',
      inputSchema: z.object({}),
      execute: async () => {
        const db = getDb();

        // Get characters linked to this episode
        const epLinks = await db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));
        const epCharIds = epLinks.map(l => l.characterId);

        // Get all characters in the project
        const allChars = await db.select().from(characters).where(eq(characters.projectId, projectId));

        const episodeChars = allChars.filter(c => epCharIds.includes(c.id));

        return {
          count: allChars.length,
          characters: allChars.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            gender: c.gender,
            appearancePrompt: c.appearancePrompt,
            personality: c.personality,
          })),
          current_episode_characters: episodeChars.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
          })),
        };
      },
    }),

    /** Read existing scenes in the project for deduplication */
    read_existing_scenes: tool({
      description: '读取项目中已有的场景列表，用于去重判断',
      inputSchema: z.object({}),
      execute: async () => {
        const db = getDb();

        // Get scenes linked to this episode
        const epLinks = await db.select().from(episodeScenes).where(eq(episodeScenes.episodeId, episodeId));
        const epSceneIds = epLinks.map(l => l.sceneId);

        // Get all scenes in the project
        const allScenes = await db.select().from(scenes).where(eq(scenes.projectId, projectId));

        const episodeScns = allScenes.filter(s => epSceneIds.includes(s.id));

        return {
          count: allScenes.length,
          scenes: allScenes.map(s => ({
            id: s.id,
            name: s.name,
            locationDesc: s.locationDesc,
            timeDesc: s.timeDesc,
            styleDesc: s.styleDesc,
          })),
          current_episode_scenes: episodeScns.map(s => ({
            id: s.id,
            name: s.name,
            locationDesc: s.locationDesc,
          })),
        };
      },
    }),

    /** Save characters with name-based deduplication */
    save_dedup_characters: tool({
      description: '保存角色（自动去重，同名角色会合并更新）',
      inputSchema: z.object({
        characters: z.array(z.object({
          name: z.string().describe('角色名'),
          description: z.string().optional().describe('角色描述/定位'),
          gender: z.string().optional().describe('性别'),
          appearancePrompt: z.string().optional().describe('外貌描述，用于图片生成'),
          personality: z.string().optional().describe('性格特征'),
        })),
      }),
      execute: async ({ characters: chars }) => {
        const db = getDb();
        const ts = now();
        let created = 0;
        let merged = 0;

        // Fetch all existing project characters for dedup
        const existing = await db.select().from(characters).where(eq(characters.projectId, projectId));
        const nameMap = new Map(existing.map(c => [c.name, c]));

        for (const c of chars) {
          const existingChar = nameMap.get(c.name);

          if (existingChar) {
            // Merge: update fields that are provided, keep existing for nulls
            const updates: Record<string, unknown> = { updatedAt: ts };
            if (c.description) updates.description = c.description;
            if (c.gender) updates.gender = c.gender;
            if (c.appearancePrompt) updates.appearancePrompt = c.appearancePrompt;
            if (c.personality) updates.personality = c.personality;

            await db.update(characters).set(updates).where(eq(characters.id, existingChar.id));

            // Ensure linked to this episode
            const links = await db.select().from(episodeCharacters).where(
              and(eq(episodeCharacters.episodeId, episodeId), eq(episodeCharacters.characterId, existingChar.id)),
            );
            if (links.length === 0) {
              await db.insert(episodeCharacters).values({
                id: genId('ec'),
                episodeId,
                characterId: existingChar.id,
                createdAt: ts,
              });
            }
            merged++;
          } else {
            // Create new
            const id = genId('char');
            await db.insert(characters).values({
              id,
              projectId,
              name: c.name,
              description: c.description ?? null,
              gender: c.gender ?? null,
              appearancePrompt: c.appearancePrompt ?? null,
              personality: c.personality ?? null,
              createdAt: ts,
              updatedAt: ts,
            });
            await db.insert(episodeCharacters).values({
              id: genId('ec'),
              episodeId,
              characterId: id,
              createdAt: ts,
            });
            created++;
          }
        }

        logger.info({ episodeId, created, merged }, 'Characters saved with dedup');
        return { message: `Created ${created}, merged ${merged}`, created, merged };
      },
    }),

    /** Save scenes with location+time deduplication */
    save_dedup_scenes: tool({
      description: '保存场景（自动去重，同名同时间段场景会复用）',
      inputSchema: z.object({
        scenes: z.array(z.object({
          name: z.string().describe('场景名称'),
          locationDesc: z.string().optional().describe('地点描述'),
          timeDesc: z.string().optional().describe('时间段'),
          styleDesc: z.string().optional().describe('风格/氛围描述'),
        })),
      }),
      execute: async ({ scenes: scns }) => {
        const db = getDb();
        const ts = now();
        let created = 0;
        let reused = 0;

        // Fetch all existing project scenes for dedup
        const existing = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
        // Key: "name|time" for exact dedup
        const keyMap = new Map(existing.map(s => [`${s.name}|${s.timeDesc ?? ''}`, s]));

        for (const s of scns) {
          const key = `${s.name}|${s.timeDesc ?? ''}`;
          const existingScene = keyMap.get(key);

          if (existingScene) {
            // Reuse existing scene, ensure linked to episode
            const links = await db.select().from(episodeScenes).where(
              and(eq(episodeScenes.episodeId, episodeId), eq(episodeScenes.sceneId, existingScene.id)),
            );
            if (links.length === 0) {
              await db.insert(episodeScenes).values({
                id: genId('es'),
                episodeId,
                sceneId: existingScene.id,
                createdAt: ts,
              });
            }
            reused++;
          } else {
            // Create new scene
            const id = genId('scene');
            await db.insert(scenes).values({
              id,
              projectId,
              name: s.name,
              locationDesc: s.locationDesc ?? null,
              timeDesc: s.timeDesc ?? null,
              styleDesc: s.styleDesc ?? null,
              createdAt: ts,
              updatedAt: ts,
            });
            await db.insert(episodeScenes).values({
              id: genId('es'),
              episodeId,
              sceneId: id,
              createdAt: ts,
            });
            created++;
          }
        }

        logger.info({ episodeId, created, reused }, 'Scenes saved with dedup');
        return { message: `Created ${created}, reused ${reused}`, created, reused };
      },
    }),

    /** Legacy save_characters (no dedup — creates all as new) */
    save_characters: tool({
      description: '保存提取的角色列表（不去重，直接创建）',
      inputSchema: z.object({
        characters: z.array(z.object({
          name: z.string().describe('角色名'),
          description: z.string().describe('角色描述/定位'),
          gender: z.string().optional().describe('性别'),
          appearancePrompt: z.string().describe('外貌描述，用于图片生成'),
          personality: z.string().optional().describe('性格特征'),
        })),
      }),
      execute: async ({ characters: chars }) => {
        const db = getDb();
        const ts = now();
        const savedIds: string[] = [];

        for (const c of chars) {
          const id = genId('char');
          await db.insert(characters).values({
            id,
            projectId,
            name: c.name,
            description: c.description,
            gender: c.gender ?? null,
            appearancePrompt: c.appearancePrompt,
            personality: c.personality ?? null,
            createdAt: ts,
            updatedAt: ts,
          });
          await db.insert(episodeCharacters).values({
            id: genId('ec'),
            episodeId,
            characterId: id,
            createdAt: ts,
          });
          savedIds.push(id);
        }

        return { saved: savedIds.length, characterIds: savedIds };
      },
    }),

    /** Legacy save_scenes (no dedup — creates all as new) */
    save_scenes: tool({
      description: '保存提取的场景列表（不去重，直接创建）',
      inputSchema: z.object({
        scenes: z.array(z.object({
          name: z.string().describe('场景名称'),
          locationDesc: z.string().describe('地点描述'),
          timeDesc: z.string().optional().describe('时间段'),
          styleDesc: z.string().optional().describe('风格/氛围描述'),
        })),
      }),
      execute: async ({ scenes: scns }) => {
        const db = getDb();
        const ts = now();
        const savedIds: string[] = [];

        for (const s of scns) {
          const id = genId('scene');
          await db.insert(scenes).values({
            id,
            projectId,
            name: s.name,
            locationDesc: s.locationDesc,
            timeDesc: s.timeDesc ?? null,
            styleDesc: s.styleDesc ?? null,
            createdAt: ts,
            updatedAt: ts,
          });
          await db.insert(episodeScenes).values({
            id: genId('es'),
            episodeId,
            sceneId: id,
            createdAt: ts,
          });
          savedIds.push(id);
        }

        return { saved: savedIds.length, sceneIds: savedIds };
      },
    }),
  };
}
