/**
 * Storyboard Agent Tools
 * Tools for the storyboard_breaker agent to generate, save, and update storyboards.
 * Ported from huobao-drama with character sync, rich fields, and update support.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { episodes, storyboards, characters, scenes, episodeCharacters, episodeScenes, storyboardCharacters } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';

function genId(prefix: string): string {
  return `${prefix}_${nanoid(21)}`;
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

/** Sync character associations for a storyboard */
async function syncStoryboardCharacters(db: ReturnType<typeof getDb>, storyboardId: string, characterIds: string[]) {
  await db.delete(storyboardCharacters).where(eq(storyboardCharacters.storyboardId, storyboardId));
  if (characterIds.length > 0) {
    for (const cid of characterIds) {
      await db.insert(storyboardCharacters).values({ storyboardId, characterId: cid });
    }
  }
}

/** Get valid scene IDs for the episode */
async function getEpisodeSceneIds(db: ReturnType<typeof getDb>, episodeId: string): Promise<Set<string>> {
  const links = await db.select().from(episodeScenes).where(eq(episodeScenes.episodeId, episodeId));
  return new Set(links.map(l => l.sceneId));
}

/** Get valid character IDs for the episode */
async function getEpisodeCharacterIds(db: ReturnType<typeof getDb>, episodeId: string): Promise<Set<string>> {
  const links = await db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));
  return new Set(links.map(l => l.characterId));
}

/** Validate that scene and character IDs belong to the episode */
function validateBindings(
  sceneIds: Set<string>,
  charIds: Set<string>,
  sceneId?: string,
  characterIds?: string[],
): string | null {
  if (sceneId && !sceneIds.has(sceneId)) {
    return `Scene ${sceneId} does not belong to this episode`;
  }
  if (characterIds?.length) {
    const invalid = characterIds.filter(id => !charIds.has(id));
    if (invalid.length > 0) {
      return `Characters do not belong to this episode: ${invalid.join(', ')}`;
    }
  }
  return null;
}

const storyboardSchema = z.object({
  shot_number: z.number().describe('镜头序号，从1开始'),
  title: z.string().optional().describe('镜头标题'),
  shot_type: z.string().optional().describe('景别：远景/全景/中景/近景/特写'),
  angle: z.string().optional().describe('镜头角度：平视/仰视/俯视/鸟瞰/斜角'),
  movement: z.string().optional().describe('镜头运动：固定/摇/移/推拉/跟'),
  location: z.string().optional().describe('场景地点（文本描述）'),
  time: z.string().optional().describe('时间：日/夜/黄昏/清晨'),
  action: z.string().optional().describe('动作描述'),
  dialogue: z.string().optional().describe('台词/旁白'),
  description: z.string().optional().describe('画面描述'),
  result: z.string().optional().describe('预期效果'),
  atmosphere: z.string().optional().describe('氛围：紧张/温馨/忧郁/欢快'),
  image_prompt: z.string().optional().describe('图片生成提示词'),
  video_prompt: z.string().optional().describe('视频生成提示词'),
  bgm_prompt: z.string().optional().describe('背景音乐提示词'),
  sound_effect: z.string().optional().describe('音效描述'),
  duration: z.number().optional().describe('建议时长（秒）'),
  scene_id: z.string().optional().describe('关联场景ID'),
  character_ids: z.array(z.string()).optional().describe('关联角色ID列表'),
});

export function createStoryboardTools(episodeId: string): ToolSet {
  return {
    /** Read episode script, characters, scenes, and existing storyboards */
    read_script_and_assets: tool({
      description: '读取剧本、角色、场景和已有分镜信息，用于分镜规划',
      inputSchema: z.object({}),
      execute: async () => {
        const db = getDb();
        const [epRows, charLinks, sceneLinks] = await Promise.all([
          db.select().from(episodes).where(eq(episodes.id, episodeId)),
          db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId)),
          db.select().from(episodeScenes).where(eq(episodeScenes.episodeId, episodeId)),
        ]);
        if (epRows.length === 0) return { error: 'Episode not found' };

        const charIds = charLinks.map(l => l.characterId);
        const sceneIds = sceneLinks.map(l => l.sceneId);

        const [chars, scns, existingBoards] = await Promise.all([
          charIds.length > 0
            ? db.select().from(characters).where(inArray(characters.id, charIds))
            : Promise.resolve([]),
          sceneIds.length > 0
            ? db.select().from(scenes).where(inArray(scenes.id, sceneIds))
            : Promise.resolve([]),
          db.select().from(storyboards).where(eq(storyboards.episodeId, episodeId)),
        ]);

        return {
          episode: {
            id: epRows[0].id,
            title: epRows[0].title,
            scriptContent: epRows[0].scriptContent ?? epRows[0].content,
          },
          characters: chars.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            appearancePrompt: c.appearancePrompt,
          })),
          scenes: scns.map(s => ({
            id: s.id,
            name: s.name,
            locationDesc: s.locationDesc,
            styleDesc: s.styleDesc,
          })),
          existing_storyboards: existingBoards.map(b => ({
            id: b.id,
            seq: b.seq,
            title: b.title,
            shot_type: b.shotType,
            angle: b.angle,
            movement: b.movement,
            visual_desc: b.visualDesc,
            dialogue: b.dialogue,
            action_desc: b.actionDesc,
            atmosphere: b.atmosphere,
            image_prompt: b.promptText,
            video_prompt: b.videoPrompt,
            bgm_prompt: b.bgmPrompt,
            sound_effect: b.soundEffect,
            duration_sec: b.durationSec,
            scene_id: b.sceneId,
            status: b.status,
          })),
        };
      },
    }),

    /** Save storyboards — replaces all existing for the episode */
    save_storyboards: tool({
      description: '保存生成的分镜列表（会替换该集所有已有分镜）',
      inputSchema: z.object({
        storyboards: z.array(storyboardSchema),
      }),
      execute: async ({ storyboards: boards }) => {
        const db = getDb();
        const ts = now();

        // Validate bindings
        const [validSceneIds, validCharIds] = await Promise.all([
          getEpisodeSceneIds(db, episodeId),
          getEpisodeCharacterIds(db, episodeId),
        ]);

        for (const b of boards) {
          const err = validateBindings(validSceneIds, validCharIds, b.scene_id, b.character_ids);
          if (err) return { error: err };
        }

        // Delete existing storyboards and character links for this episode
        const existing = await db.select({ id: storyboards.id }).from(storyboards).where(eq(storyboards.episodeId, episodeId));
        if (existing.length > 0) {
          const existingIds = existing.map(e => e.id);
          for (const eid of existingIds) {
            await db.delete(storyboardCharacters).where(eq(storyboardCharacters.storyboardId, eid));
          }
          await db.delete(storyboards).where(inArray(storyboards.id, existingIds));
        }

        // Save new storyboards
        const savedIds: string[] = [];
        for (const b of boards) {
          const id = genId('sb');
          await db.insert(storyboards).values({
            id,
            episodeId,
            seq: b.shot_number,
            title: b.title ?? null,
            shotType: b.shot_type ?? null,
            angle: b.angle ?? null,
            movement: b.movement ?? null,
            sceneId: b.scene_id ?? null,
            visualDesc: b.description ?? b.action ?? '',
            dialogue: b.dialogue ?? null,
            actionDesc: b.action ?? null,
            durationSec: b.duration ?? 10,
            promptText: b.image_prompt ?? null,
            videoPrompt: b.video_prompt ?? null,
            atmosphere: b.atmosphere ?? null,
            bgmPrompt: b.bgm_prompt ?? null,
            soundEffect: b.sound_effect ?? null,
            status: 'draft',
            createdAt: ts,
            updatedAt: ts,
          });

          // Sync character associations
          if (b.character_ids?.length) {
            await syncStoryboardCharacters(db, id, b.character_ids);
          }
          savedIds.push(id);
        }

        logger.info({ episodeId, count: savedIds.length }, 'Storyboards saved');
        return { saved: savedIds.length, storyboardIds: savedIds };
      },
    }),

    /** Update a single storyboard */
    update_storyboard: tool({
      description: '更新单个分镜的属性',
      inputSchema: z.object({
        storyboard_id: z.string().describe('要更新的分镜ID'),
        title: z.string().optional(),
        shot_type: z.string().optional(),
        angle: z.string().optional(),
        movement: z.string().optional(),
        description: z.string().optional(),
        dialogue: z.string().optional(),
        action: z.string().optional(),
        atmosphere: z.string().optional(),
        image_prompt: z.string().optional(),
        video_prompt: z.string().optional(),
        bgm_prompt: z.string().optional(),
        sound_effect: z.string().optional(),
        duration: z.number().optional(),
        scene_id: z.string().optional(),
        character_ids: z.array(z.string()).optional(),
      }),
      execute: async (params) => {
        const db = getDb();
        const { storyboard_id, ...fields } = params;

        // Verify storyboard exists
        const rows = await db.select().from(storyboards).where(eq(storyboards.id, storyboard_id));
        if (!rows.length) return { error: `Storyboard ${storyboard_id} not found` };

        // Validate bindings if provided
        const [validSceneIds, validCharIds] = await Promise.all([
          getEpisodeSceneIds(db, episodeId),
          getEpisodeCharacterIds(db, episodeId),
        ]);
        const err = validateBindings(validSceneIds, validCharIds, fields.scene_id, fields.character_ids);
        if (err) return { error: err };

        const ts = now();
        const updates: Record<string, unknown> = { updatedAt: ts };

        if (fields.title !== undefined) updates.title = fields.title;
        if (fields.shot_type !== undefined) updates.shotType = fields.shot_type;
        if (fields.angle !== undefined) updates.angle = fields.angle;
        if (fields.movement !== undefined) updates.movement = fields.movement;
        if (fields.description !== undefined) updates.visualDesc = fields.description;
        if (fields.dialogue !== undefined) {
          updates.dialogue = fields.dialogue;
          updates.ttsAudioAssetId = null; // Reset TTS when dialogue changes
        }
        if (fields.action !== undefined) updates.actionDesc = fields.action;
        if (fields.atmosphere !== undefined) updates.atmosphere = fields.atmosphere;
        if (fields.image_prompt !== undefined) updates.promptText = fields.image_prompt;
        if (fields.video_prompt !== undefined) updates.videoPrompt = fields.video_prompt;
        if (fields.bgm_prompt !== undefined) updates.bgmPrompt = fields.bgm_prompt;
        if (fields.sound_effect !== undefined) updates.soundEffect = fields.sound_effect;
        if (fields.duration !== undefined) updates.durationSec = fields.duration;
        if (fields.scene_id !== undefined) updates.sceneId = fields.scene_id;

        await db.update(storyboards).set(updates).where(eq(storyboards.id, storyboard_id));

        // Sync character associations if provided
        if (fields.character_ids !== undefined) {
          await syncStoryboardCharacters(db, storyboard_id, fields.character_ids);
        }

        logger.info({ storyboardId: storyboard_id }, 'Storyboard updated via agent tool');
        return { updated: true };
      },
    }),

    /** Generate grid prompt for storyboard visualization */
    generate_grid_prompt: tool({
      description: '为分镜生成网格图提示词，用于批量图片生成',
      inputSchema: z.object({
        shots: z.array(z.object({
          shot_number: z.number(),
          description: z.string(),
          shot_type: z.string().optional(),
          dialogue: z.string().optional(),
        })),
        rows: z.number().describe('网格行数'),
        cols: z.number().describe('网格列数'),
        mode: z.enum(['first_frame', 'first_last', 'multi_ref']).describe('生成模式'),
      }),
      execute: async ({ shots, rows, cols, mode }) => {
        const totalCells = rows * cols;

        if (mode === 'multi_ref') {
          // Reference-style grid: all shots in one prompt
          const cellPrompts = shots.slice(0, totalCells).map((s, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            return {
              row,
              col,
              shot_number: s.shot_number,
              prompt: `Shot ${s.shot_number}: ${s.description}${s.shot_type ? `, ${s.shot_type}` : ''}`,
            };
          });
          return {
            grid_prompt: `A ${rows}x${cols} reference grid of storyboard shots, cinematic style, consistent quality`,
            cell_prompts: cellPrompts,
          };
        }

        if (mode === 'first_last') {
          // First and last frame for each shot
          const cellPrompts: Array<{ row: number; col: number; shot_number: number; frame: string; prompt: string }> = [];
          for (let i = 0; i < Math.min(shots.length, Math.floor(totalCells / 2)); i++) {
            const s = shots[i];
            const baseRow = Math.floor((i * 2) / cols);
            const baseCol = (i * 2) % cols;
            cellPrompts.push({
              row: baseRow,
              col: baseCol,
              shot_number: s.shot_number,
              frame: 'first',
              prompt: `First frame of shot ${s.shot_number}: ${s.description}, beginning of the scene`,
            });
            if (baseCol + 1 < cols) {
              cellPrompts.push({
                row: baseRow,
                col: baseCol + 1,
                shot_number: s.shot_number,
                frame: 'last',
                prompt: `Last frame of shot ${s.shot_number}: ${s.description}, end of the scene`,
              });
            }
          }
          return {
            grid_prompt: `A ${rows}x${cols} storyboard grid showing first and last frames, cinematic, detailed`,
            cell_prompts: cellPrompts,
          };
        }

        // Default: first_frame mode
        const cellPrompts = shots.slice(0, totalCells).map((s, i) => ({
          row: Math.floor(i / cols),
          col: i % cols,
          shot_number: s.shot_number,
          prompt: `Cinematic frame: ${s.description}${s.shot_type ? `, ${s.shot_type} shot` : ''}${s.dialogue ? `, dialogue: "${s.dialogue}"` : ''}`,
        }));
        return {
          grid_prompt: `A ${rows}x${cols} cinematic storyboard grid, high quality, consistent style`,
          cell_prompts: cellPrompts,
        };
      },
    }),
  };
}
