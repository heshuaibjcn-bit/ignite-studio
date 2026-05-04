/**
 * Script rewrite executor — rewrites script via AI text agent.
 * Phase 1.5: returns waiting_callback to simulate async AI processing.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';

export class ScriptRewriteExecutor extends BaseStepExecutor {
  readonly stepCode = 'script_rewrite';
  readonly timeoutMs = 2 * 60 * 1000; // 2 min

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    return {
      status: 'waiting_callback',
      providerName: 'text_agent',
      providerTaskId: `task_${ctx.jobId}_${ctx.stepCode}`,
      outputSnapshot: {
        stepCode: ctx.stepCode,
        bizId: ctx.bizId,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      },
    };
  }
}
