/**
 * Episode Pipeline Status API
 * GET — returns comprehensive 14-step pipeline progress for an episode.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { episodes, storyboards, episodeCharacters, episodeScenes, characters, scenes } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { apiSuccess, apiNotFound, apiInternalError } from '@/lib/api-response';

interface Props {
  params: Promise<{ id: string }>;
}

interface StepStatus {
  step: string;
  status: string | null;
  label: string;
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const epRows = await db.select().from(episodes).where(eq(episodes.id, id));
    if (!epRows.length) return apiNotFound('Episode', id);
    const ep = epRows[0];

    // Define the 14 pipeline steps
    const steps: StepStatus[] = [
      { step: 'source_validate', status: ep.sourceValidateStatus, label: '素材验证' },
      { step: 'script_rewrite', status: ep.scriptRewriteStatus, label: '剧本改写' },
      { step: 'character_scene_extract', status: ep.characterSceneExtractStatus, label: '角色场景提取' },
      { step: 'voice_assign', status: ep.voiceAssignStatus, label: '音色分配' },
      { step: 'storyboard_generate', status: ep.storyboardGenerateStatus, label: '分镜生成' },
      { step: 'storyboard_review', status: ep.storyboardReviewStatus, label: '分镜审核' },
      { step: 'character_image_generate', status: ep.characterImageGenerateStatus, label: '角色图片生成' },
      { step: 'scene_image_generate', status: ep.sceneImageGenerateStatus, label: '场景图片生成' },
      { step: 'frame_image_generate', status: ep.frameImageGenerateStatus, label: '帧图片生成' },
      { step: 'video_generate', status: ep.videoGenerateStatus, label: '视频生成' },
      { step: 'video_review', status: ep.videoReviewStatus, label: '视频审核' },
      { step: 'shot_compose', status: ep.shotComposeStatus, label: '镜头合成' },
      { step: 'episode_merge', status: ep.episodeMergeStatus, label: '剧集合并' },
      { step: 'export_finalize', status: ep.exportFinalizeStatus, label: '导出完成' },
    ];

    // Gather counts
    const [charLinks, sceneLinks, boards] = await Promise.all([
      db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, id)),
      db.select().from(episodeScenes).where(eq(episodeScenes.episodeId, id)),
      db.select().from(storyboards).where(eq(storyboards.episodeId, id)),
    ]);

    // Count images generated for characters
    const charIds = charLinks.map(l => l.characterId);
    let charactersWithImages = 0;
    if (charIds.length > 0) {
      const charRows = await db.select().from(characters).where(inArray(characters.id, charIds));
      charactersWithImages = charRows.filter(c => c.imageAssetId).length;
    }

    // Count images generated for scenes
    const sceneIds = sceneLinks.map(l => l.sceneId);
    let scenesWithImages = 0;
    if (sceneIds.length > 0) {
      const sceneRows = await db.select().from(scenes).where(inArray(scenes.id, sceneIds));
      scenesWithImages = sceneRows.filter(s => s.imageAssetId).length;
    }

    // Count storyboard progress
    const boardsWithImage = boards.filter(b => b.selectedImageAssetId).length;
    const boardsWithVideo = boards.filter(b => b.selectedVideoAssetId).length;
    const boardsComposed = boards.filter(b => b.composedVideoAssetId).length;

    // Overall progress
    const completedSteps = steps.filter(s => s.status === 'done' || s.status === 'complete').length;
    const failedSteps = steps.filter(s => s.status === 'error' || s.status === 'failed').length;
    const waitingSteps = steps.filter(s => s.status === 'waiting_review').length;
    const pendingSteps = steps.length - completedSteps - failedSteps - waitingSteps;

    return apiSuccess({
      episode_id: id,
      episode_title: ep.title,
      overall: {
        total_steps: steps.length,
        completed: completedSteps,
        failed: failedSteps,
        waiting_review: waitingSteps,
        pending: pendingSteps,
        progress_pct: Math.round((completedSteps / steps.length) * 100),
      },
      steps,
      counts: {
        characters: charIds.length,
        characters_with_image: charactersWithImages,
        scenes: sceneIds.length,
        scenes_with_image: scenesWithImages,
        storyboards: boards.length,
        storyboards_with_image: boardsWithImage,
        storyboards_with_video: boardsWithVideo,
        storyboards_composed: boardsComposed,
      },
      final_video_asset_id: ep.finalVideoAssetId,
      waiting_review_step: ep.waitingReviewStep,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
