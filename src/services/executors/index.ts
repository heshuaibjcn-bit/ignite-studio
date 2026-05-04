/**
 * Executor registry — wires step codes to their executors.
 */
import type { StepExecutor } from '../step-executor';
import { NoopExecutor } from './noop-executor';
import { SourceValidateExecutor } from './source-validate-executor';
import { ScriptRewriteExecutor } from './script-rewrite-executor';
import { StubWaitingCallbackExecutor } from './stub-waiting-callback-executor';
import { StubWaitingReviewExecutor } from './stub-waiting-review-executor';
import { STEP_TIMEOUT_MS } from '@/constants/job';

export function createDramaExecutors(): Map<string, StepExecutor> {
  const map = new Map<string, StepExecutor>();

  // Real executors
  map.set('source_validate', new SourceValidateExecutor());
  map.set('script_rewrite', new ScriptRewriteExecutor());

  // Review steps (waiting_review — no auto-timeout, human-controlled)
  map.set('storyboard_review', new StubWaitingReviewExecutor('storyboard_review', 0));
  map.set('video_review', new StubWaitingReviewExecutor('video_review', 0));

  // AI/Provider steps (waiting_callback)
  map.set('character_scene_extract', new StubWaitingCallbackExecutor(
    'character_scene_extract', STEP_TIMEOUT_MS.text_agent, 'text_agent',
  ));
  map.set('voice_assign', new StubWaitingCallbackExecutor(
    'voice_assign', STEP_TIMEOUT_MS.tts, 'tts_provider',
  ));
  map.set('storyboard_generate', new StubWaitingCallbackExecutor(
    'storyboard_generate', STEP_TIMEOUT_MS.text_agent, 'text_agent',
  ));
  map.set('character_image_generate', new StubWaitingCallbackExecutor(
    'character_image_generate', STEP_TIMEOUT_MS.image_generate, 'image_provider',
  ));
  map.set('scene_image_generate', new StubWaitingCallbackExecutor(
    'scene_image_generate', STEP_TIMEOUT_MS.image_generate, 'image_provider',
  ));
  map.set('frame_image_generate', new StubWaitingCallbackExecutor(
    'frame_image_generate', STEP_TIMEOUT_MS.image_generate, 'image_provider',
  ));
  map.set('video_generate', new StubWaitingCallbackExecutor(
    'video_generate', STEP_TIMEOUT_MS.video_generate, 'video_provider',
  ));
  map.set('shot_compose', new StubWaitingCallbackExecutor(
    'shot_compose', STEP_TIMEOUT_MS.ffmpeg_compose, 'ffmpeg',
  ));
  map.set('episode_merge', new StubWaitingCallbackExecutor(
    'episode_merge', STEP_TIMEOUT_MS.ffmpeg_compose, 'ffmpeg',
  ));
  map.set('export_finalize', new StubWaitingCallbackExecutor(
    'export_finalize', STEP_TIMEOUT_MS.file_download, 'system',
  ));

  return map;
}
