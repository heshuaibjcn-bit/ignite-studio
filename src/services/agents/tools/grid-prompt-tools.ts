/**
 * Grid Prompt Generator Agent Tools
 *
 * Factory function — injects episodeId + projectId.
 * Supports three types of image prompt generation:
 * 1. Character image prompts
 * 2. Scene image prompts
 * 3. Grid image prompts (first_frame, first_last, multi_ref modes)
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { characters, scenes, storyboards } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export function createGridPromptTools(
  episodeId: string,
  projectId: string,
): ToolSet {
  return {
    // ─── Character Prompts ───────────────────────────────

    read_characters: tool({
      description:
        'Read all characters for the current project. Returns character details for image prompt generation.',
      inputSchema: z.object({}),
      execute: async (): Promise<{
        characters: Array<{
          id: string;
          name: string;
          gender: string | null;
          description: string | null;
          appearancePrompt: string | null;
          personality: string | null;
        }>;
      }> => {
        const db = getDb();
        const chars = await db
          .select()
          .from(characters)
          .where(eq(characters.projectId, projectId));
        return {
          characters: chars.map((c) => ({
            id: c.id,
            name: c.name,
            gender: c.gender,
            description: c.description,
            appearancePrompt: c.appearancePrompt,
            personality: c.personality,
          })),
        };
      },
    }),

    generate_character_prompt: tool({
      description:
        'Generate an English image generation prompt for a specific character.',
      inputSchema: z.object({
        character_id: z.string().describe('Character ID to generate prompt for'),
      }),
      execute: async ({
        character_id,
      }): Promise<
        | { error: string }
        | {
            character_id: string;
            character_name: string;
            prompt: string;
          }
      > => {
        const db = getDb();
        const rows = await db
          .select()
          .from(characters)
          .where(eq(characters.id, character_id));
        if (rows.length === 0) return { error: 'Character not found' };
        const c = rows[0];

        const parts: string[] = [];
        if (c.appearancePrompt) parts.push(c.appearancePrompt);
        if (c.description) parts.push(c.description);
        if (c.gender) parts.push(c.gender);
        if (c.personality) parts.push(`personality: ${c.personality}`);

        const base = parts.join(', ');
        const prompt = `${base}, cinematic portrait, high quality, consistent art style, no text, no watermark`;

        return {
          character_id: c.id,
          character_name: c.name,
          prompt,
        };
      },
    }),

    // ─── Scene Prompts ───────────────────────────────────

    read_scenes: tool({
      description:
        'Read all scenes for the current project. Returns scene details for image prompt generation.',
      inputSchema: z.object({}),
      execute: async (): Promise<{
        scenes: Array<{
          id: string;
          name: string;
          locationDesc: string | null;
          timeDesc: string | null;
          styleDesc: string | null;
        }>;
      }> => {
        const db = getDb();
        const sceneRows = await db
          .select()
          .from(scenes)
          .where(eq(scenes.projectId, projectId));
        return {
          scenes: sceneRows.map((s) => ({
            id: s.id,
            name: s.name,
            locationDesc: s.locationDesc,
            timeDesc: s.timeDesc,
            styleDesc: s.styleDesc,
          })),
        };
      },
    }),

    generate_scene_prompt: tool({
      description:
        'Generate an English image generation prompt for a specific scene.',
      inputSchema: z.object({
        scene_id: z.string().describe('Scene ID to generate prompt for'),
      }),
      execute: async ({
        scene_id,
      }): Promise<
        | { error: string }
        | {
            scene_id: string;
            name: string;
            prompt: string;
          }
      > => {
        const db = getDb();
        const rows = await db
          .select()
          .from(scenes)
          .where(eq(scenes.id, scene_id));
        if (rows.length === 0) return { error: 'Scene not found' };
        const s = rows[0];

        const parts: string[] = [];
        if (s.locationDesc) parts.push(s.locationDesc);
        if (s.timeDesc) parts.push(s.timeDesc);
        if (s.styleDesc) parts.push(s.styleDesc);

        const base = parts.join(', ');
        const prompt = `${base}, cinematic scene, atmospheric lighting, high quality, consistent art style, no characters, no people, no text, no watermark`;

        return {
          scene_id: s.id,
          name: s.name,
          prompt,
        };
      },
    }),

    // ─── Grid Prompts ─────────────────────────────────────

    read_shots_for_grid: tool({
      description:
        'Read storyboard shot details for grid image prompt generation.',
      inputSchema: z.object({
        shot_ids: z
          .array(z.string())
          .describe('Storyboard IDs to include in the grid'),
      }),
      execute: async ({
        shot_ids,
      }): Promise<{
        shots: Array<{
          id: string;
          seq: number | null;
          title: string | null;
          visualDesc: string;
          shotType: string | null;
          dialogue: string | null;
          sceneId: string | null;
        }>;
      }> => {
        if (!shot_ids.length) return { shots: [] };
        const db = getDb();
        const shotRows = await db
          .select()
          .from(storyboards)
          .where(
            and(
              eq(storyboards.episodeId, episodeId),
              inArray(storyboards.id, shot_ids),
            ),
          );
        return {
          shots: shotRows.map((sb) => ({
            id: sb.id,
            seq: sb.seq,
            title: sb.title,
            visualDesc: sb.visualDesc,
            shotType: sb.shotType,
            dialogue: sb.dialogue,
            sceneId: sb.sceneId,
          })),
        };
      },
    }),

    generate_grid_prompt: tool({
      description:
        'Generate a grid image prompt with per-cell descriptions. Supports three modes: first_frame, first_last, multi_ref.',
      inputSchema: z.object({
        shots: z.array(
          z.object({
            id: z.string(),
            seq: z.number().nullable().optional(),
            title: z.string().nullable().optional(),
            visualDesc: z.string(),
            shotType: z.string().nullable().optional(),
            dialogue: z.string().nullable().optional(),
          }),
        ),
        rows: z.number().describe('Number of grid rows'),
        cols: z.number().describe('Number of grid columns'),
        mode: z
          .enum(['first_frame', 'first_last', 'multi_ref'])
          .describe('Grid mode'),
        reference_legend: z
          .string()
          .optional()
          .describe('Optional reference image mapping description'),
      }),
      execute: async ({
        shots,
        rows,
        cols,
        mode,
        reference_legend,
      }): Promise<{
        grid_prompt: string;
        cell_prompts: Array<{
          shot_id: string;
          frame_type: string;
          prompt: string;
        }>;
        error?: string;
      }> => {
        if (!shots.length)
          return { error: 'No shots provided', grid_prompt: '', cell_prompts: [] };

        const totalCells = rows * cols;
        const legendPrefix = reference_legend
          ? `参考图映射：${reference_legend}, `
          : '';

        if (mode === 'multi_ref') {
          const sb = shots[0];
          const gridPrompt = `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality, ${legendPrefix}${sb.visualDesc}, all cells with identical lighting and color palette, no merged panels, no missing panels, no text, no watermark`;
          const cellPrompts = Array.from({ length: totalCells }, (_, i) => ({
            shot_id: sb.id,
            frame_type: 'reference',
            prompt: `格${i + 1}：${reference_legend ? `参考${reference_legend}，` : ''}${sb.visualDesc}, cinematic lighting, consistent with other cells in the ${rows}x${cols} grid`,
          }));
          return { grid_prompt: gridPrompt, cell_prompts: cellPrompts };
        }

        if (mode === 'first_last') {
          const cellPrompts = [];
          for (let i = 0; i < totalCells; i++) {
            const s = shots[i % shots.length];
            const isFirst = i % 2 === 0;
            cellPrompts.push({
              shot_id: s.id,
              frame_type: isFirst ? 'first_frame' : 'last_frame',
              prompt: isFirst
                ? `格${i + 1}：${reference_legend ? `参考${reference_legend}，` : ''}${s.visualDesc}${s.shotType ? `, ${s.shotType}` : ''}, opening scene`
                : `格${i + 1}：${reference_legend ? `参考${reference_legend}，` : ''}${s.visualDesc}${s.shotType ? `, ${s.shotType}` : ''}, ending scene, continuous motion`,
            });
          }
          const gridPrompt = `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality, ${legendPrefix}${shots.map((s) => s.visualDesc).join(' | ')}, no merged panels, no missing panels, no text, no watermark`;
          return { grid_prompt: gridPrompt, cell_prompts: cellPrompts };
        }

        // first_frame mode (default)
        const cellPrompts = Array.from({ length: totalCells }, (_, i) => {
          const s = shots[i % shots.length];
          return {
            shot_id: s.id,
            frame_type: 'first_frame',
            prompt: `格${i + 1}：${reference_legend ? `参考${reference_legend}，` : ''}${s.visualDesc}${s.shotType ? `, ${s.shotType}` : ''}, opening scene`,
          };
        });
        const gridPrompt = `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality, ${legendPrefix}${shots.map((s) => s.visualDesc).join(' | ')}, no merged panels, no missing panels, no text, no watermark`;
        return { grid_prompt: gridPrompt, cell_prompts: cellPrompts };
      },
    }),
  };
}
