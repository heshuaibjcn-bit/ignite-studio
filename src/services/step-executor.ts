/**
 * Step executor interface.
 * Each pipeline step type implements this interface.
 * The job runner delegates step execution to the appropriate executor.
 */

export interface StepExecutionContext {
  jobId: string;
  stepCode: string;
  stepId: string;
  bizType: string;
  bizId: string;
  /** Snapshot of step inputs (from previous steps or business object). */
  inputSnapshot?: unknown;
}

export type StepExecutionStatus =
  | 'succeeded'
  | 'failed'
  | 'waiting_callback'
  | 'waiting_polling'
  | 'waiting_review'
  | 'skipped';

export interface StepExecutionResult {
  status: StepExecutionStatus;
  /** Arbitrary output to store as step result. */
  outputSnapshot?: unknown;
  /** Provider info for async steps. */
  providerName?: string;
  providerTaskId?: string;
  /** Error info for failures. */
  errorCode?: string;
  errorMessage?: string;
}

export interface StepExecutor {
  /** The step code this executor handles (e.g., 'source_validate'). */
  readonly stepCode: string;
  /** Execute the step. */
  execute(ctx: StepExecutionContext): Promise<StepExecutionResult>;
}
