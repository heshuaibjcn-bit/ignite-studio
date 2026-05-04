/**
 * Executor + registry tests.
 * Tests the base executor, concrete executors, and the drama executor registry.
 */
import { describe, it, expect } from 'vitest';
import { BaseStepExecutor } from '@/services/executors/base-executor';
import { SourceValidateExecutor } from '@/services/executors/source-validate-executor';
import { ScriptRewriteExecutor } from '@/services/executors/script-rewrite-executor';
import { StubWaitingCallbackExecutor } from '@/services/executors/stub-waiting-callback-executor';
import { StubWaitingReviewExecutor } from '@/services/executors/stub-waiting-review-executor';
import { createDramaExecutors } from '@/services/executors';
import type { StepExecutionContext, StepExecutionResult } from '@/services/step-executor';

function makeCtx(overrides?: Partial<StepExecutionContext>): StepExecutionContext {
  return {
    jobId: 'job_test123',
    stepCode: 'test_step',
    stepId: 'step_test123',
    bizType: 'episode',
    bizId: 'ep_test123',
    ...overrides,
  };
}

describe('BaseStepExecutor', () => {
  it('wraps timeout correctly', async () => {
    class SlowExecutor extends BaseStepExecutor {
      readonly stepCode = 'slow';
      readonly timeoutMs = 100; // 100ms
      protected async doExecute(): Promise<StepExecutionResult> {
        await new Promise((r) => setTimeout(r, 500)); // 500ms
        return { status: 'succeeded' };
      }
    }

    const exec = new SlowExecutor();
    const result = await exec.execute(makeCtx());
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('STEP_TIMEOUT');
  });

  it('wraps thrown errors correctly', async () => {
    class ThrowingExecutor extends BaseStepExecutor {
      readonly stepCode = 'thrower';
      readonly timeoutMs = 5000;
      protected async doExecute(): Promise<StepExecutionResult> {
        throw new Error('Something broke');
      }
    }

    const exec = new ThrowingExecutor();
    const result = await exec.execute(makeCtx());
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('EXECUTOR_ERROR');
    expect(result.errorMessage).toContain('Something broke');
  });

  it('passes through successful results', async () => {
    class OkExecutor extends BaseStepExecutor {
      readonly stepCode = 'ok';
      readonly timeoutMs = 5000;
      protected async doExecute(): Promise<StepExecutionResult> {
        return { status: 'succeeded', outputSnapshot: { ok: true } };
      }
    }

    const exec = new OkExecutor();
    const result = await exec.execute(makeCtx());
    expect(result.status).toBe('succeeded');
    expect(result.outputSnapshot).toEqual({ ok: true });
  });
});

describe('SourceValidateExecutor', () => {
  it('fails when episode not found', async () => {
    const exec = new SourceValidateExecutor();
    const result = await exec.execute(makeCtx({ stepCode: 'source_validate', bizId: 'ep_nonexistent' }));
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.errorCode).toBe('ASSET_MISSING');
    }
  });
});

describe('ScriptRewriteExecutor', () => {
  it('returns waiting_callback with provider info', async () => {
    const exec = new ScriptRewriteExecutor();
    const result = await exec.execute(makeCtx({ stepCode: 'script_rewrite' }));
    expect(result.status).toBe('waiting_callback');
    if (result.status === 'waiting_callback') {
      expect(result.providerName).toBe('text_agent');
      expect(result.providerTaskId).toContain('task_');
    }
  });
});

describe('StubWaitingCallbackExecutor', () => {
  it('returns waiting_callback with custom provider', async () => {
    const exec = new StubWaitingCallbackExecutor('video_generate', 60000, 'video_provider');
    const result = await exec.execute(makeCtx({ stepCode: 'video_generate' }));
    expect(result.status).toBe('waiting_callback');
    if (result.status === 'waiting_callback') {
      expect(result.providerName).toBe('video_provider');
    }
  });
});

describe('StubWaitingReviewExecutor', () => {
  it('returns waiting_review', async () => {
    const exec = new StubWaitingReviewExecutor('storyboard_review', 0);
    const result = await exec.execute(makeCtx({ stepCode: 'storyboard_review' }));
    expect(result.status).toBe('waiting_review');
  });
});

describe('createDramaExecutors', () => {
  it('registers all 14 drama step codes', () => {
    const map = createDramaExecutors();
    const expectedCodes = [
      'source_validate', 'script_rewrite', 'character_scene_extract',
      'voice_assign', 'storyboard_generate', 'storyboard_review',
      'character_image_generate', 'scene_image_generate', 'frame_image_generate',
      'video_generate', 'video_review', 'shot_compose', 'episode_merge',
      'export_finalize',
    ];

    for (const code of expectedCodes) {
      expect(map.has(code), `Missing executor for ${code}`).toBe(true);
    }
    expect(map.size).toBe(14);
  });
});
