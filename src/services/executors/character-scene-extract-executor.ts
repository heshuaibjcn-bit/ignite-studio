/**
 * Character & Scene Extract Executor
 * Uses LLM agent to extract characters and scenes from the script.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { runAgent, loadSkillPrompt } from '../agents';
import { createExtractTools } from '../agents/tools/extract-tools';
import { getDb } from '@/db/client';
import { episodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export class CharacterSceneExtractExecutor implements StepExecutor {
  readonly stepCode = 'character_scene_extract';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // Get episode's production ID for linking
      const db = getDb();
      const epRows = await db.select().from(episodes).where(eq(episodes.id, ctx.bizId));
      if (epRows.length === 0) {
        return { status: 'failed', errorCode: 'EPISODE_NOT_FOUND', errorMessage: `Episode ${ctx.bizId} not found` };
      }
      const projectId = epRows[0].projectId;

      const systemPrompt = loadSkillPrompt('extractor');
      const tools = createExtractTools(ctx.bizId, projectId);

      const result = await runAgent({
        agentType: 'extractor',
        systemPrompt,
        userMessage: `请从当前剧集中提取所有角色和场景。先调用 read_script 读取剧本，然后分析并调用 save_characters 和 save_scenes 保存结果。`,
        tools,
        maxSteps: 5,
      });

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, toolResults: result.toolResults.length }, 'Extraction completed');

      return {
        status: 'succeeded',
        outputSnapshot: { agentResponse: result.text, toolResults: result.toolResults },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Extraction failed');
      return { status: 'failed', errorCode: 'EXTRACTION_FAILED', errorMessage: message };
    }
  }
}
