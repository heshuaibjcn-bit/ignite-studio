/**
 * Stub executor that returns waiting_review — human approval gate.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';

export class StubWaitingReviewExecutor extends BaseStepExecutor {
  constructor(
    override readonly stepCode: string,
    override readonly timeoutMs: number,
  ) {
    super();
  }

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    return {
      status: 'waiting_review',
      outputSnapshot: {
        stepCode: ctx.stepCode,
        bizId: ctx.bizId,
        status: 'awaiting_review',
        submittedAt: new Date().toISOString(),
      },
    };
  }
}
