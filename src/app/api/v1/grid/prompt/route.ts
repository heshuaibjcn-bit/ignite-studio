/**
 * Grid Prompt API
 * POST — generate grid image prompts using agent or fallback.
 *
 * Supports three modes: first_frame, first_last, multi_ref.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards, imageGenerations } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import {
  collectGridReferenceAssets,
  buildReferenceLegend,
  buildStoryboardReferenceHints,
  type ReferenceAsset,
} from '@/lib/storyboard-references';
import { runAgent, type AgentType } from '@/services/agents';
import { createGridPromptTools } from '@/services/agents/tools/grid-prompt-tools';

function cellLabel(i: number, rows: number, cols: number) {
  const r = Math.floor(i / cols) + 1;
  const c = (i % cols) + 1;
  return `格${i + 1}（row ${r} col ${c}）`;
}

function buildGridPrompt(
  mode: string,
  shotRows: Array<{
    id: string;
    seq: number | null;
    visualDesc: string;
    shotType: string | null;
    sceneId: string | null;
  }>,
  rows: number,
  cols: number,
  referenceAssets: ReferenceAsset[],
  characterIdMap: Map<string, string[]>,
): string {
  const totalCells = rows * cols;
  const legend = buildReferenceLegend(referenceAssets);

  const buildHints = (sb: (typeof shotRows)[0]) => {
    const hints: string[] = [];
    const charIds = characterIdMap.get(sb.id) || [];
    for (const asset of referenceAssets) {
      if (asset.kind === 'scene' && sb.sceneId && asset.sceneId === sb.sceneId) {
        hints.push(`${asset.imageLabel}（${asset.label}）`);
      }
      if (asset.kind === 'character' && asset.characterId && charIds.includes(asset.characterId)) {
        hints.push(`${asset.imageLabel}（${asset.label}）`);
      }
      if (asset.kind === 'storyboard' && asset.storyboardId === sb.id) {
        hints.push(`${asset.imageLabel}（${asset.label}）`);
      }
    }
    return [...new Set(hints)].slice(0, 4);
  };

  if (mode === 'multi_ref') {
    const sb = shotRows[0];
    const desc = sb.visualDesc || 'scene';
    const angles = [
      'wide establishing shot', 'medium shot character focus',
      'close-up detail', 'dramatic low angle', 'over-the-shoulder view',
      'bird eye view', 'side profile', 'atmospheric detail',
    ];
    const cells = Array.from({ length: totalCells }, (_, i) =>
      `${cellLabel(i, rows, cols)}: ${legend ? `参考${legend}，` : ''}${desc}, ${angles[i % angles.length]}`,
    );
    return [
      `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality,`,
      legend ? `参考图映射：${legend}` : '',
      `main scene: ${desc},`,
      ...cells,
      'same characters, same costumes, same location, consistent lighting, high quality, no merged panels, no missing panels, no text, no watermark',
    ].filter(Boolean).join('\n');
  }

  if (mode === 'first_last') {
    const cells = Array.from({ length: totalCells }, (_, i) => {
      const sb = shotRows[i % shotRows.length];
      const desc = sb.visualDesc || `shot ${i + 1}`;
      const refs = buildHints(sb);
      const isFirst = i % 2 === 0;
      return `${cellLabel(i, rows, cols)}: ${refs.length ? `参考${refs.join('、')}，` : ''}${desc}, ${isFirst ? 'opening moment' : 'closing moment, subtle motion change'}`;
    });
    return [
      `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality,`,
      legend ? `参考图映射：${legend}` : '',
      'first/last frame visual rhythm, alternating opening and closing beats,',
      ...cells,
      'continuous motion implied, same characters, same costumes, same location lighting, high quality, no merged panels, no missing panels, no text, no watermark',
    ].filter(Boolean).join('\n');
  }

  // first_frame (default)
  const cells = shotRows.slice(0, totalCells).map((sb, i) => {
    const desc = sb.visualDesc || `shot ${sb.seq || i + 1}`;
    const refs = buildHints(sb);
    return `${cellLabel(i, rows, cols)}: ${refs.length ? `参考${refs.join('、')}，` : ''}${desc}${sb.shotType ? `, ${sb.shotType}` : ''}`;
  });
  return [
    `${rows}x${cols} grid layout, exactly ${totalCells} visible panels, consistent art style, cinematic quality,`,
    legend ? `参考图映射：${legend}` : '',
    ...cells,
    'high quality, cinematic lighting, same color palette, no merged panels, no missing panels, no text, no watermark',
  ].filter(Boolean).join('\n');
}

function buildCellPrompts(
  mode: string,
  shotRows: Array<{ id: string; seq: number | null; visualDesc: string; shotType: string | null }>,
  rows: number,
  cols: number,
  referenceAssets: ReferenceAsset[],
  characterIdMap: Map<string, string[]>,
) {
  const totalCells = rows * cols;
  if (!shotRows.length) return [];

  if (mode === 'multi_ref') {
    const sb = shotRows[0];
    const desc = sb.visualDesc || 'scene';
    const angles = [
      'wide establishing shot', 'medium shot character focus',
      'close-up detail', 'dramatic low angle', 'over-the-shoulder view',
    ];
    return Array.from({ length: totalCells }, (_, i) => ({
      shot_number: sb.seq || 0,
      frame_type: 'reference',
      prompt: `${cellLabel(i, rows, cols)}: ${desc}, ${angles[i % angles.length]}, cinematic quality, consistent lighting`,
    }));
  }

  if (mode === 'first_last') {
    return Array.from({ length: totalCells }, (_, i) => {
      const sb = shotRows[i % shotRows.length];
      const isFirst = i % 2 === 0;
      return {
        shot_number: sb.seq || 0,
        frame_type: isFirst ? 'first_frame' : 'last_frame',
        prompt: `${cellLabel(i, rows, cols)}，${isFirst ? '首帧' : '尾帧'}：${sb.visualDesc}${sb.shotType ? `, ${sb.shotType}` : ''}, cinematic quality`,
      };
    });
  }

  return shotRows.slice(0, totalCells).map((sb, i) => ({
    shot_number: sb.seq || 0,
    frame_type: 'first_frame',
    prompt: `${cellLabel(i, rows, cols)}：${sb.visualDesc}${sb.shotType ? `, ${sb.shotType}` : ''}, opening scene, cinematic quality`,
  }));
}

// Try to extract JSON from agent output
function extractGridPayload(value: unknown): { grid_prompt: string; cell_prompts: unknown[] } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return extractGridPayload(JSON.parse(value));
    } catch {
      const match = value.match(/```json\s*([\s\S]*?)```/i);
      if (match?.[1]) {
        try { return extractGridPayload(JSON.parse(match[1].trim())); } catch { /* */ }
      }
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractGridPayload(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const gp = typeof obj.grid_prompt === 'string' ? obj.grid_prompt : typeof obj.gridPrompt === 'string' ? obj.gridPrompt : '';
    const cp = Array.isArray(obj.cell_prompts) ? obj.cell_prompts : Array.isArray(obj.cellPrompts) ? obj.cellPrompts : [];
    if (gp) return { grid_prompt: gp, cell_prompts: cp };
    for (const nested of Object.values(obj)) {
      const found = extractGridPayload(nested);
      if (found) return found;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storyboard_ids,
      episode_id,
      project_id,
      rows,
      cols,
      mode = 'first_frame',
    } = body;

    if (!storyboard_ids?.length) {
      return apiError('MISSING_PARAMS', 'storyboard_ids required', 400);
    }
    if (!rows || !cols) return apiError('MISSING_PARAMS', 'rows and cols required', 400);
    if (!episode_id) return apiError('MISSING_PARAMS', 'episode_id required', 400);

    const db = getDb();

    // Fetch storyboards
    const shotRows = await db
      .select()
      .from(storyboards)
      .where(inArray(storyboards.id, storyboard_ids));

    if (!shotRows.length) {
      return apiError('NOT_FOUND', 'No storyboards found', 404);
    }

    const effectiveProjectId = project_id || shotRows[0].episodeId;
    const referenceAssets = await collectGridReferenceAssets(shotRows);
    const referenceLegend = buildReferenceLegend(referenceAssets);

    // Build character-to-storyboard mapping for hints
    const characterIdMap = new Map<string, string[]>();

    // Try agent-based prompt generation
    try {
      const tools = createGridPromptTools(episode_id, effectiveProjectId);
      const userMessage = [
        '请为宫格图生成提示词，并优先调用工具完成。',
        `选中镜头ID：${JSON.stringify(storyboard_ids)}`,
        `行数：${rows}`,
        `列数：${cols}`,
        `模式：${mode}`,
        referenceLegend ? `参考图映射：${referenceLegend}` : '',
        `必须严格按 ${rows}x${cols} 生成，总共 exactly ${rows * cols} visible panels。`,
        '必须返回 JSON，结构为：{"grid_prompt":"...","cell_prompts":[{"shot_number":1,"frame_type":"first_frame","prompt":"..."}]}',
      ].filter(Boolean).join('\n');

      const result = await runAgent({
        agentType: 'grid_prompt_generator' as AgentType,
        userMessage,
        tools,
        maxSteps: 10,
      });

      const fromTools = extractGridPayload(result.toolResults);
      const fromText = extractGridPayload(result.text);
      const payload = fromTools || fromText;

      if (payload?.grid_prompt) {
        logger.info({ episode_id, mode, source: 'agent' }, 'Grid prompt generated via agent');
        return apiSuccess({
          ...payload,
          source: 'agent',
          grid: { rows, cols },
          storyboard_ids,
          mode,
        });
      }
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : 'Unknown' }, 'Agent grid prompt failed, using fallback');
    }

    // Fallback: rule-based prompt generation
    const gridPrompt = buildGridPrompt(mode, shotRows, rows, cols, referenceAssets, characterIdMap);
    const cellPrompts = buildCellPrompts(mode, shotRows, rows, cols, referenceAssets, characterIdMap);

    logger.info({ episode_id, mode, source: 'fallback' }, 'Grid prompt generated via fallback');
    return apiSuccess({
      grid_prompt: gridPrompt,
      cell_prompts: cellPrompts,
      source: 'fallback',
      grid: { rows, cols },
      storyboard_ids,
      mode,
    });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : 'Unknown' }, 'Grid prompt error');
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
