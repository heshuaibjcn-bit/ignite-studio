/**
 * Script Agent Tools
 * Tools for the script_rewriter agent to read and save scripts.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { episodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export function createScriptTools(episodeId: string): ToolSet {
  return {
    read_episode_script: tool({
      description: '读取当前剧集的原始内容/剧本',
      inputSchema: z.object({}),
      execute: async (): Promise<{
        episodeId: string;
        title: string;
        content: string;
      } | { error: string }> => {
        const db = getDb();
        const rows = await db.select().from(episodes).where(eq(episodes.id, episodeId));
        if (rows.length === 0) return { error: 'Episode not found' };
        const ep = rows[0];
        return {
          episodeId: ep.id,
          title: ep.title,
          content: ep.content,
        };
      },
    }),

    save_rewritten_script: tool({
      description: '保存改写后的格式化剧本到剧集记录',
      inputSchema: z.object({
        script: z.string().describe('改写后的完整格式化剧本'),
      }),
      execute: async ({ script }): Promise<{ saved: boolean; episodeId: string; scriptLength: number }> => {
        const db = getDb();
        const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
        await db.update(episodes).set({
          scriptContent: script,
          updatedAt: now,
        }).where(eq(episodes.id, episodeId));
        return { saved: true, episodeId, scriptLength: script.length };
      },
    }),
  };
}
