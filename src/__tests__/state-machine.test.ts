/**
 * State machine transition tests.
 *
 * Tests the 3-layer state model from the design doc:
 * - Business state machine (Section 6.1): 8 states, all transitions
 * - Step state machine (Section 6.2): 8 states, all transitions
 * - Job state machine (Section 6.3): 6 states, all transitions
 *
 * These are pure logic tests — no database required.
 */
import { describe, it, expect } from 'vitest';

// ─── Business State Machine ──────────────────────────────────────────

type BizStatus = 'draft' | 'ready' | 'processing' | 'partial_ready' | 'blocked' | 'completed' | 'failed' | 'archived';

const BIZ_TRANSITIONS: Record<BizStatus, Record<string, BizStatus>> = {
  draft: {
    'validate_pass': 'ready',
    'validate_fail': 'blocked',
  },
  blocked: {
    'dependency_resolved': 'ready',
  },
  ready: {
    'start_job': 'processing',
  },
  processing: {
    'all_required_done': 'completed',
    'partial_results': 'partial_ready',
    'failed_no_running_jobs': 'failed',
  },
  partial_ready: {
    'fix_and_rerun': 'processing',
    'all_results_complete': 'completed',
  },
  failed: {
    'fix_config': 'ready',
    'manual_retry': 'processing',
  },
  completed: {
    'upstream_changed': 'partial_ready',
    'archive': 'archived',
  },
  archived: {
    'restore': 'completed',
  },
};

function transitionBiz(current: BizStatus, event: string): BizStatus {
  const next = BIZ_TRANSITIONS[current]?.[event];
  if (!next) throw new Error(`Invalid transition: ${current} → ${event}`);
  return next;
}

// ─── Step State Machine ──────────────────────────────────────────────

type StepStatus = 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

const STEP_TRANSITIONS: Record<StepStatus, Record<string, StepStatus>> = {
  pending: {
    'enqueue': 'queued',
  },
  queued: {
    'start': 'running',
    'cancel': 'cancelled',
  },
  running: {
    'success': 'succeeded',
    'fail': 'failed',
    'cancel': 'cancelled',
  },
  succeeded: {
    'upstream_changed': 'stale',
  },
  failed: {
    'retry': 'queued',
  },
  cancelled: {
    'rerun': 'queued',
  },
  stale: {
    'reexecute': 'queued',
  },
  skipped: {
    'condition_changed': 'queued',
  },
};

function transitionStep(current: StepStatus, event: string): StepStatus {
  const next = STEP_TRANSITIONS[current]?.[event];
  if (!next) throw new Error(`Invalid step transition: ${current} → ${event}`);
  return next;
}

// ─── Job State Machine ───────────────────────────────────────────────

type JobStatus = 'queued' | 'running' | 'partial_success' | 'success' | 'failed' | 'cancelled';

const JOB_TRANSITIONS: Record<JobStatus, Record<string, JobStatus>> = {
  queued: {
    'claim': 'running',
    'cancel': 'cancelled',
  },
  running: {
    'all_required_succeeded': 'success',
    'optional_failed_results_usable': 'partial_success',
    'required_failed': 'failed',
    'cancel': 'cancelled',
  },
  partial_success: {
    'manual_rerun': 'queued', // creates new job in practice
  },
  failed: {
    'manual_retry': 'queued', // creates new job in practice
  },
  cancelled: {
    'manual_retry': 'queued', // creates new job in practice
  },
  success: {}, // terminal
};

function transitionJob(current: JobStatus, event: string): JobStatus {
  const next = JOB_TRANSITIONS[current]?.[event];
  if (!next) throw new Error(`Invalid job transition: ${current} → ${event}`);
  return next;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('Business State Machine', () => {
  it('happy path: draft → ready → processing → completed', () => {
    let state: BizStatus = 'draft';
    state = transitionBiz(state, 'validate_pass');
    expect(state).toBe('ready');
    state = transitionBiz(state, 'start_job');
    expect(state).toBe('processing');
    state = transitionBiz(state, 'all_required_done');
    expect(state).toBe('completed');
  });

  it('blocked → ready → processing', () => {
    let state: BizStatus = 'draft';
    state = transitionBiz(state, 'validate_fail');
    expect(state).toBe('blocked');
    state = transitionBiz(state, 'dependency_resolved');
    expect(state).toBe('ready');
    state = transitionBiz(state, 'start_job');
    expect(state).toBe('processing');
  });

  it('processing → partial_ready → completed', () => {
    let state: BizStatus = 'ready';
    state = transitionBiz(state, 'start_job');
    state = transitionBiz(state, 'partial_results');
    expect(state).toBe('partial_ready');
    state = transitionBiz(state, 'all_results_complete');
    expect(state).toBe('completed');
  });

  it('processing → failed → ready (fix config)', () => {
    let state: BizStatus = 'ready';
    state = transitionBiz(state, 'start_job');
    state = transitionBiz(state, 'failed_no_running_jobs');
    expect(state).toBe('failed');
    state = transitionBiz(state, 'fix_config');
    expect(state).toBe('ready');
  });

  it('processing → failed → processing (manual retry)', () => {
    let state: BizStatus = 'ready';
    state = transitionBiz(state, 'start_job');
    state = transitionBiz(state, 'failed_no_running_jobs');
    expect(state).toBe('failed');
    state = transitionBiz(state, 'manual_retry');
    expect(state).toBe('processing');
  });

  it('completed → partial_ready (upstream change)', () => {
    let state: BizStatus = 'ready';
    state = transitionBiz(state, 'start_job');
    state = transitionBiz(state, 'all_required_done');
    expect(state).toBe('completed');
    state = transitionBiz(state, 'upstream_changed');
    expect(state).toBe('partial_ready');
  });

  it('completed → archived → completed (restore)', () => {
    let state: BizStatus = 'ready';
    state = transitionBiz(state, 'start_job');
    state = transitionBiz(state, 'all_required_done');
    expect(state).toBe('completed');
    state = transitionBiz(state, 'archive');
    expect(state).toBe('archived');
    state = transitionBiz(state, 'restore');
    expect(state).toBe('completed');
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionBiz('draft', 'start_job')).toThrow();
    expect(() => transitionBiz('completed', 'start_job')).toThrow();
    expect(() => transitionBiz('archived', 'start_job')).toThrow();
  });
});

describe('Step State Machine', () => {
  it('happy path: pending → queued → running → succeeded', () => {
    let state: StepStatus = 'pending';
    state = transitionStep(state, 'enqueue');
    expect(state).toBe('queued');
    state = transitionStep(state, 'start');
    expect(state).toBe('running');
    state = transitionStep(state, 'success');
    expect(state).toBe('succeeded');
  });

  it('failure path: queued → running → failed → queued (retry)', () => {
    let state: StepStatus = 'pending';
    state = transitionStep(state, 'enqueue');
    state = transitionStep(state, 'start');
    state = transitionStep(state, 'fail');
    expect(state).toBe('failed');
    state = transitionStep(state, 'retry');
    expect(state).toBe('queued');
  });

  it('cancel from queued', () => {
    let state: StepStatus = 'pending';
    state = transitionStep(state, 'enqueue');
    state = transitionStep(state, 'cancel');
    expect(state).toBe('cancelled');
  });

  it('cancel from running', () => {
    let state: StepStatus = 'pending';
    state = transitionStep(state, 'enqueue');
    state = transitionStep(state, 'start');
    state = transitionStep(state, 'cancel');
    expect(state).toBe('cancelled');
  });

  it('stale cascade: succeeded → stale → queued (re-execute)', () => {
    let state: StepStatus = 'pending';
    state = transitionStep(state, 'enqueue');
    state = transitionStep(state, 'start');
    state = transitionStep(state, 'success');
    expect(state).toBe('succeeded');
    state = transitionStep(state, 'upstream_changed');
    expect(state).toBe('stale');
    state = transitionStep(state, 'reexecute');
    expect(state).toBe('queued');
  });

  it('skipped step can be re-queued', () => {
    let state: StepStatus = 'skipped';
    state = transitionStep(state, 'condition_changed');
    expect(state).toBe('queued');
  });

  it('cancelled step can be re-queued', () => {
    let state: StepStatus = 'pending';
    state = transitionStep(state, 'enqueue');
    state = transitionStep(state, 'cancel');
    expect(state).toBe('cancelled');
    state = transitionStep(state, 'rerun');
    expect(state).toBe('queued');
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionStep('pending', 'start')).toThrow();
    expect(() => transitionStep('succeeded', 'fail')).toThrow();
    expect(() => transitionStep('failed', 'success')).toThrow();
  });
});

describe('Job State Machine', () => {
  it('happy path: queued → running → success', () => {
    let state: JobStatus = 'queued';
    state = transitionJob(state, 'claim');
    expect(state).toBe('running');
    state = transitionJob(state, 'all_required_succeeded');
    expect(state).toBe('success');
  });

  it('partial success path', () => {
    let state: JobStatus = 'queued';
    state = transitionJob(state, 'claim');
    state = transitionJob(state, 'optional_failed_results_usable');
    expect(state).toBe('partial_success');
  });

  it('failure path: queued → running → failed → queued (retry)', () => {
    let state: JobStatus = 'queued';
    state = transitionJob(state, 'claim');
    state = transitionJob(state, 'required_failed');
    expect(state).toBe('failed');
    state = transitionJob(state, 'manual_retry');
    expect(state).toBe('queued');
  });

  it('cancel from queued', () => {
    let state: JobStatus = 'queued';
    state = transitionJob(state, 'cancel');
    expect(state).toBe('cancelled');
  });

  it('cancel from running', () => {
    let state: JobStatus = 'queued';
    state = transitionJob(state, 'claim');
    state = transitionJob(state, 'cancel');
    expect(state).toBe('cancelled');
  });

  it('cancelled job can be retried', () => {
    let state: JobStatus = 'queued';
    state = transitionJob(state, 'cancel');
    state = transitionJob(state, 'manual_retry');
    expect(state).toBe('queued');
  });

  it('success is terminal', () => {
    expect(() => transitionJob('success', 'claim')).toThrow();
    expect(() => transitionJob('success', 'cancel')).toThrow();
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionJob('queued', 'all_required_succeeded')).toThrow();
    expect(() => transitionJob('failed', 'claim')).toThrow();
  });
});

// ─── Drama Pipeline Validation ───────────────────────────────────────

describe('Drama Pipeline Definitions', () => {
  it('has exactly 14 steps', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    expect(DRAMA_PIPELINE_DEFINITIONS).toHaveLength(14);
  });

  it('has required first step (source_validate)', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    expect(DRAMA_PIPELINE_DEFINITIONS[0].stepCode).toBe('source_validate');
    expect(DRAMA_PIPELINE_DEFINITIONS[0].required).toBe(true);
  });

  it('has required last step (export_finalize)', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    const last = DRAMA_PIPELINE_DEFINITIONS[13];
    expect(last.stepCode).toBe('export_finalize');
    expect(last.required).toBe(true);
  });

  it('includes storyboard_review at position 6', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    expect(DRAMA_PIPELINE_DEFINITIONS[5].stepCode).toBe('storyboard_review');
  });

  it('includes video_review at position 11', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    expect(DRAMA_PIPELINE_DEFINITIONS[10].stepCode).toBe('video_review');
  });

  it('fan-out steps are correct', async () => {
    const { DRAMA_FAN_OUT_STEPS } = await import('@/constants/step');
    expect(DRAMA_FAN_OUT_STEPS).toHaveLength(6);
    expect(DRAMA_FAN_OUT_STEPS[0]).toBe('character_image_generate');
    expect(DRAMA_FAN_OUT_STEPS[5]).toBe('shot_compose');
  });

  it('step orders are sequential 1-14', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    const orders = DRAMA_PIPELINE_DEFINITIONS.map(d => d.stepOrder);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('has correct required/optional flags', async () => {
    const { DRAMA_PIPELINE_DEFINITIONS } = await import('@/constants/step');
    const requiredCodes = DRAMA_PIPELINE_DEFINITIONS.filter(d => d.required).map(d => d.stepCode);
    const optionalCodes = DRAMA_PIPELINE_DEFINITIONS.filter(d => !d.required).map(d => d.stepCode);

    expect(requiredCodes).toEqual([
      'source_validate', 'script_rewrite', 'character_scene_extract',
      'storyboard_generate', 'frame_image_generate', 'video_generate',
      'shot_compose', 'episode_merge', 'export_finalize',
    ]);
    expect(optionalCodes).toEqual([
      'voice_assign', 'storyboard_review', 'character_image_generate',
      'scene_image_generate', 'video_review',
    ]);
  });
});
