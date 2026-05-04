/**
 * Executor registry — wires step codes to their executors.
 */
import type { StepExecutor } from '../step-executor';
import { SourceValidateExecutor } from './source-validate-executor';
import { ScriptRewriteExecutor } from './script-rewrite-executor';
import { CharacterSceneExtractExecutor } from './character-scene-extract-executor';
import { VoiceAssignExecutor } from './voice-assign-executor';
import { StoryboardGenerateExecutor } from './storyboard-generate-executor';
import { StubWaitingCallbackExecutor } from './stub-waiting-callback-executor';
import { StubWaitingReviewExecutor } from './stub-waiting-review-executor';
import { CharacterImageGenerateExecutor } from './character-image-executor';
import { SceneImageGenerateExecutor } from './scene-image-executor';
import { FrameImageGenerateExecutor } from './frame-image-executor';
import { VideoGenerateExecutor } from './video-generate-executor';
import { ShotComposeExecutor } from './shot-compose-executor';
import { EpisodeMergeExecutor } from './episode-merge-executor';
import { ExportFinalizeExecutor } from './export-finalize-executor';
import { STEP_TIMEOUT_MS } from '@/constants/job';

export function createDramaExecutors(): Map<string, StepExecutor> {
  const map = new Map<string, StepExecutor>();

  // Phase 1 — validation
  map.set('source_validate', new SourceValidateExecutor());

  // Phase 4 — LLM agent steps
  map.set('script_rewrite', new ScriptRewriteExecutor());
  map.set('character_scene_extract', new CharacterSceneExtractExecutor());
  map.set('voice_assign', new VoiceAssignExecutor());
  map.set('storyboard_generate', new StoryboardGenerateExecutor());

  // Phase 4 — human review gates
  map.set('storyboard_review', new StubWaitingReviewExecutor('storyboard_review', 0));
  map.set('video_review', new StubWaitingReviewExecutor('video_review', 0));

  // Phase 4 — image/video/composition
  map.set('frame_image_generate', new FrameImageGenerateExecutor());
  map.set('video_generate', new VideoGenerateExecutor());
  map.set('shot_compose', new ShotComposeExecutor());
  map.set('episode_merge', new EpisodeMergeExecutor());
  map.set('export_finalize', new ExportFinalizeExecutor());

  // Phase 4 — character/scene image generation
  map.set('character_image_generate', new CharacterImageGenerateExecutor());
  map.set('scene_image_generate', new SceneImageGenerateExecutor());

  return map;
}
