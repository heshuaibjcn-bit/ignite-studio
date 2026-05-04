/**
 * Base step executor — wraps doExecute() with timeout + error handling + logging.
 */
import type { StepExecutor, StepExecutionContext, StepExecutionResult } from '../step-executor';
import { logger } from '@/lib/logger';

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export abstract class BaseStepExecutor implements StepExecutor {
  abstract readonly stepCode: string;
  abstract readonly timeoutMs: number;

  async execute(ctx: StepExecutionContext): Promise<StepExecutionResult> {
    const startMs = Date.now();
    logger.info({ stepCode: this.stepCode, jobId: ctx.jobId }, 'Step execution started');

    try {
      const result = this.timeoutMs > 0
        ? await this.withTimeout(this.doExecute(ctx), this.timeoutMs)
        : await this.doExecute(ctx);

      const durationMs = Date.now() - startMs;
      logger.info({ stepCode: this.stepCode, jobId: ctx.jobId, status: result.status, durationMs }, 'Step execution completed');

      return result;
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ stepCode: this.stepCode, jobId: ctx.jobId, err, durationMs }, 'Step execution threw');

      if (err instanceof TimeoutError) {
        return {
          status: 'failed',
          errorCode: 'STEP_TIMEOUT',
          errorMessage: `Step ${this.stepCode} timed out after ${this.timeoutMs}ms`,
        };
      }

      return {
        status: 'failed',
        errorCode: 'EXECUTOR_ERROR',
        errorMessage: message,
      };
    }
  }

  /** Subclass implements actual step logic here. */
  protected abstract doExecute(ctx: StepExecutionContext): Promise<StepExecutionResult>;

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }
}
