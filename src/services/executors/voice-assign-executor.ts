// @ts-nocheck — AI SDK v6 tool() type overloads don't resolve with z.object({}) + execute
/**
 * Voice Assign Executor
 * Uses LLM agent to assign TTS voices to characters.
 */
import { tool } from 'ai';
import { z } from 'zod';
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { runAgent, loadSkillPrompt } from '../agents';
import { getDb } from '@/db/client';
import { characters, episodeCharacters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { EDGE_TTS_CHINESE_VOICES } from '../adapters/edge-tts';
import { logger } from '@/lib/logger';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — AI SDK v6 tool() overloads don't resolve with z.object({}) + execute
function createVoiceTools(episodeId: string) {
  return {
    list_characters: tool({
      description: '列出当前剧集的所有角色',
      parameters: z.object({}),
      execute: async () => {
        const db = getDb();
        const links = await db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));
        if (links.length === 0) return { characters: [] };
        const chars = await Promise.all(
          links.map(l => db.select().from(characters).where(eq(characters.id, l.characterId)).then(r => r[0]))
        );
        return {
          characters: chars.filter(Boolean).map(c => ({
            id: c!.id, name: c!.name, gender: c!.gender, personality: c!.personality, voiceId: c!.voiceId,
          })),
        };
      },
    }),

    list_available_voices: tool({
      description: '列出可用的 TTS 语音列表',
      parameters: z.object({}),
      execute: async () => {
        return { voices: EDGE_TTS_CHINESE_VOICES };
      },
    }),

    assign_voice: tool({
      description: '为角色分配 TTS 语音',
      parameters: z.object({
        characterId: z.string().describe('角色ID'),
        voiceId: z.string().describe('TTS 语音ID，如 zh-CN-XiaoxiaoNeural'),
      }),
      execute: async ({ characterId, voiceId }: { characterId: string; voiceId: string }) => {
        const db = getDb();
        const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
        await db.update(characters).set({ voiceId, updatedAt: ts }).where(eq(characters.id, characterId));
        return { assigned: true, characterId, voiceId };
      },
    }),
  };
}

export class VoiceAssignExecutor implements StepExecutor {
  readonly stepCode = 'voice_assign';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const systemPrompt = loadSkillPrompt('voice_assigner');
      const tools = createVoiceTools(ctx.bizId);

      const result = await runAgent({
        agentType: 'voice_assigner',
        systemPrompt,
        userMessage: `请为当前剧集的角色分配合适的 TTS 语音。先调用 list_characters 查看角色列表，再调用 list_available_voices 查看可用语音，然后根据角色性别、年龄、性格为每个角色调用 assign_voice 分配语音。`,
        tools,
        maxSteps: 10,
      });

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId }, 'Voice assignment completed');

      return {
        status: 'succeeded',
        outputSnapshot: { agentResponse: result.text, toolResults: result.toolResults },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Voice assignment failed');
      return { status: 'failed', errorCode: 'VOICE_ASSIGN_FAILED', errorMessage: message };
    }
  }
}
