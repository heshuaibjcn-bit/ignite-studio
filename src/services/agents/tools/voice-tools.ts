/**
 * Voice Agent Tools
 * Tools for the voice_assigner agent to assign TTS voices to characters.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { episodes, characters, episodeCharacters, aiVoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export function createVoiceTools(episodeId: string): ToolSet {
  return {
    read_characters: tool({
      description: '读取当前剧集的角色列表',
      inputSchema: z.object({}),
      execute: async () => {
        const db = getDb();
        const links = await db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));

        if (links.length === 0) return { characters: [] };

        const charIds = links.map(l => l.characterId);
        const chars = await Promise.all(
          charIds.map(id => db.select().from(characters).where(eq(characters.id, id)).then(r => r[0]))
        );

        return {
          characters: chars.filter(Boolean).map(c => ({
            id: c!.id,
            name: c!.name,
            description: c!.description,
            gender: c!.gender,
            personality: c!.personality,
          })),
        };
      },
    }),

    list_available_voices: tool({
      description: '列出可用的TTS语音（支持筛选性别、语言）',
      inputSchema: z.object({
        gender: z.string().optional().describe('性别筛选：male/female'),
        language: z.string().optional().describe('语言筛选：zh-CN/en-US'),
      }),
      execute: async ({ gender, language }) => {
        const db = getDb();
        const conditions = [];

        if (gender) {
          conditions.push(eq(aiVoices.gender, gender));
        }
        if (language) {
          conditions.push(eq(aiVoices.language, language));
        }

        let voices;
        if (conditions.length === 0) {
          voices = await db.select().from(aiVoices).where(eq(aiVoices.isActive, true));
        } else if (conditions.length === 1) {
          voices = await db.select().from(aiVoices).where(conditions[0]);
        } else {
          voices = await db.select().from(aiVoices).where(and(...conditions));
        }

        return {
          voices: voices.map(v => ({
            id: v.id,
            name: v.name,
            provider: v.provider,
            gender: v.gender,
            language: v.language,
            style: v.style,
          })),
        };
      },
    }),

    assign_voices: tool({
      description: '为角色分配TTS语音',
      inputSchema: z.object({
        assignments: z.array(z.object({
          characterId: z.string().describe('角色ID'),
          voiceId: z.string().describe('语音ID'),
        })),
      }),
      execute: async ({ assignments }) => {
        const db = getDb();
        const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);

        const results = [];
        for (const a of assignments) {
          await db.update(characters)
            .set({ voiceId: a.voiceId, updatedAt: ts })
            .where(eq(characters.id, a.characterId));
          results.push({ characterId: a.characterId, voiceId: a.voiceId });
        }

        return { assigned: results.length, assignments: results };
      },
    }),
  };
}
