/**
 * Project Type Definitions
 *
 * Defines project types (narrative_drama, narrated_image, commentary_mix)
 * with their goals and workflow hints for agents and pipeline steps.
 */
import { getDb } from '@/db/client';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const PROJECT_TYPES = {
  narrative_drama: {
    label: '剧情短剧型',
    narratorName: '旁白',
    scriptGoal:
      '把素材改写为可拍摄的剧情短剧剧本，强调角色冲突、场景动作和对白潜台词。',
    storyboardGoal:
      '拆成角色表演镜头、首尾帧、视频片段、配音和最终合成。',
  },
  narrated_image: {
    label: '图文旁白型',
    narratorName: '旁白',
    scriptGoal:
      '把素材整理成适合图文视频的旁白稿，强调开场钩子、信息层次、画面配图点和金句收束。',
    storyboardGoal:
      '拆成旁白驱动的画面段落，每段对应一张可生成视觉图和一个轻运动视频片段。',
  },
  commentary_mix: {
    label: '混剪解说型',
    narratorName: '解说',
    scriptGoal:
      '把素材整理成适合混剪视频的解说稿，强调观点节奏、素材提示、转折卡点和结论记忆点。',
    storyboardGoal:
      '拆成解说驱动的素材段落，每段包含素材画面方向、节奏点、配音和可生成混剪片段。',
  },
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;

export function normalizeProjectType(value?: string | null): ProjectType {
  if (
    value === 'narrated_image' ||
    value === 'commentary_mix' ||
    value === 'narrative_drama'
  ) {
    return value;
  }
  return 'narrative_drama';
}

export function getProjectTypeLabel(value?: string | null) {
  return PROJECT_TYPES[normalizeProjectType(value)].label;
}

export async function getProjectProjectType(projectId: string): Promise<ProjectType> {
  const db = getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  // Check productionType column if it exists
  const type = (rows[0] as Record<string, unknown>)?.productionType as string | undefined;
  return normalizeProjectType(type);
}

export async function getProjectTypeContext(projectId: string): Promise<string> {
  const projectType = await getProjectProjectType(projectId);
  const profile = PROJECT_TYPES[projectType];
  return [
    `当前项目类型：${profile.label}（${projectType}）。`,
    `剧本目标：${profile.scriptGoal}`,
    `分镜目标：${profile.storyboardGoal}`,
    projectType === 'narrated_image'
      ? '工作流重点：不强制真人角色形象；可只保留"旁白"音色；场景/镜头图承担主体视觉；视频生成以轻推、平移、景深、粒子、局部动效为主。'
      : '',
    projectType === 'commentary_mix'
      ? '工作流重点：不强制真人角色形象；可只保留"解说"音色；每条分镜必须给出素材/画面方向和剪辑节奏；视频生成以 B-roll、资料感画面、动势转场和观点卡点为主。'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}
