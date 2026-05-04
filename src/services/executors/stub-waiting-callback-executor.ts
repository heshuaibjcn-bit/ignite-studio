/**
 * Stub executor that returns waiting_callback — simulates an external provider step.
 */
import { BaseStepExecutor } from './base-executor';
import type { StepExecutionContext, StepExecutionResult } from '../step-executor';

export class StubWaitingCallbackExecutor extends BaseStepExecutor {
  constructor(
    override readonly stepCode: string,
    override readonly timeoutMs: number,
    private readonly providerName: string,
  ) {
    super();
  }

  protected async doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    return {
      status: 'waiting_callback',
      providerName: this.providerName,
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
