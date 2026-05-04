import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';

/**
 * No-op executor — succeeds immediately for any step.
 * Used for testing the pipeline end-to-end without external dependencies.
 */
export class NoopExecutor implements StepExecutor {
  readonly stepCode = '*'; // wildcard — handles any step

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    return {
      status: 'succeeded',
      outputSnapshot: {
        stepCode: ctx.stepCode,
        bizId: ctx.bizId,
        noop: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
