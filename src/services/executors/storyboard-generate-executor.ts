/**
 * Storyboard Generate Executor
 * Uses LLM agent to break the script into visual storyboards.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { runAgent, loadSkillPrompt } from '../agents';
import { createStoryboardTools } from '../agents/tools/storyboard-tools';
import { logger } from '@/lib/logger';

export class StoryboardGenerateExecutor implements StepExecutor {
  readonly stepCode = 'storyboard_generate';

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const systemPrompt = loadSkillPrompt('storyboard_breaker');
      const tools = createStoryboardTools(ctx.bizId);

      const result = await runAgent({
        agentType: 'storyboard_breaker',
        systemPrompt,
        userMessage: `请将当前剧集拆解为分镜。先调用 read_script_and_assets 读取剧本和已提取的角色/场景，然后生成分镜并调用 save_storyboards 保存。每个镜头需要包含画面描述、图片提示词、视频提示词、台词和音效。`,
        tools,
        maxSteps: 5,
      });

      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId }, 'Storyboard generation completed');

      return {
        status: 'succeeded',
        outputSnapshot: { agentResponse: result.text, toolResults: result.toolResults },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message, stepCode: this.stepCode }, 'Storyboard generation failed');
      return { status: 'failed', errorCode: 'STORYBOARD_FAILED', errorMessage: message };
    }
  }
}
