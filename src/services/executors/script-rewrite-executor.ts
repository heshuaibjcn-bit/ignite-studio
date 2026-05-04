/**
 * Script rewrite executor — rewrites script via AI text agent.
 * Phase 4: uses AI SDK generateText with tool calling.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';
import { runAgent, loadSkillPrompt } from '../agents';
import { createScriptTools } from '../agents/tools/script-tools';
import { logger } from '@/lib/logger';

export class ScriptRewriteExecutor extends BaseStepExecutor {
  readonly stepCode = 'script_rewrite';
  readonly timeoutMs = 5 * 60 * 1000; // 5 min for LLM processing

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const systemPrompt = loadSkillPrompt('script_rewriter');
      const tools = createScriptTools(ctx.bizId);

      const result = await runAgent({
        agentType: 'script_rewriter',
        systemPrompt,
        userMessage: `请改写当前剧集的剧本。先调用 read_episode_script 读取原始内容，然后按照改写指南进行改写，最后调用 save_rewritten_script 保存改写后的格式化剧本。`,
        tools,
        maxSteps: 5,
      });

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId }, 'Script rewrite completed');

      return {
        status: 'succeeded',
        outputSnapshot: { agentResponse: result.text, toolResults: result.toolResults },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Script rewrite failed');
      return { status: 'failed', errorCode: 'SCRIPT_REWRITE_FAILED', errorMessage: message };
    }
  }
}
