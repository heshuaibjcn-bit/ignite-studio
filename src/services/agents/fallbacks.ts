/**
 * Agent Orchestrated Fallbacks
 * When the LLM doesn't trigger tool calls, these functions provide
 * local orchestration to complete the task anyway.
 *
 * Ported from huobao-drama with async/await and Drizzle ORM adaptations.
 */
import { getDb } from '@/db/client';
import {
  episodes, characters, scenes, storyboards,
  episodeCharacters, episodeScenes, storyboardCharacters,
  aiServiceConfigs, aiVoices,
} from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getProjectProjectType, type ProjectType } from '@/lib/project-types';
import { logger } from '@/lib/logger';

function genId(prefix: string): string {
  return `${prefix}_${nanoid(21)}`;
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

// ---------------------------------------------------------------------------
// Script Rewriter Fallback
// ---------------------------------------------------------------------------

function firstSentence(text: string, maxLen: number): string {
  const s = text.replace(/\n/g, ' ').trim();
  const dot = s.search(/[。！？.!?]/);
  if (dot > 0 && dot <= maxLen) return s.slice(0, dot + 1);
  return s.slice(0, maxLen) + (s.length > maxLen ? '…' : '');
}

function extractSourceKeywords(source: string): string[] {
  const stopWords = new Set(['的', '了', '是', '在', '和', '与', '有', '为', '中', '等', '及', '不', '对', '这', '那', '一', '个', '人', '被', '也', '上', '下']);
  const words = source.replace(/[^一-鿿]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
}

function buildNarratedScript(source: string): string {
  const hook = firstSentence(source, 54);
  const keywords = extractSourceKeywords(source);
  const keywordText = keywords.length ? keywords.join('、') : '核心信息';
  return [
    '# 图文旁白稿', '',
    '## P01 | 开场钩子 | 6秒',
    `旁白：${hook}。先别急着划走，这里面真正值得看的，是它背后的${keywordText}。`,
    '画面提示：用一张强情绪主视觉建立主题，主体清晰，背景留出字幕空间。', '',
    '## P02 | 信息展开 | 8秒',
    `旁白：我们先把事情拆开看：${firstSentence(source, 86)}。关键不是信息有多少，而是观众能不能立刻理解它和自己有什么关系。`,
    '画面提示：信息图、资料图、关键物件和场景化背景交替出现，画面干净，层次明确。', '',
    '## P03 | 记忆点收束 | 6秒',
    '旁白：所以这条内容最重要的不是看完，而是记住一个判断：把复杂信息变成能被转述的一句话，传播才真正开始。',
    '画面提示：回到主题主视觉，加入轻微光效或镜头慢推，形成结尾落点。',
  ].join('\n');
}

function buildCommentaryScript(source: string): string {
  const hook = firstSentence(source, 60);
  const keywords = extractSourceKeywords(source);
  const keywordText = keywords.length ? keywords.join('、') : '关键细节';
  return [
    '# 混剪解说稿', '',
    '## M01 | 开场钩子 | 5秒',
    `解说：${hook}。但如果只看表面，你很可能会错过真正的重点。`,
    `素材方向：快速切入主题画面，突出${keywordText}。`, '',
    '## M02 | 关键拆解 | 8秒',
    `解说：这件事要从三个层面看：第一是表面信息，第二是背后的动机，第三是它会带来的连锁反应。${firstSentence(source, 76)}。`,
    '素材方向：资料感 B-roll、局部特写、关键词动效。', '',
    '## M03 | 观点落点 | 6秒',
    '解说：真正能留下来的观点，一定不是信息本身，而是信息背后的判断。',
    '素材方向：结论标题卡、主题象征画面。',
  ].join('\n');
}

export async function runScriptRewriterFallback(episodeId: string, projectId: string) {
  const db = getDb();
  const epRows = await db.select().from(episodes).where(eq(episodes.id, episodeId));
  if (!epRows.length) throw new Error('Episode not found');
  const ep = epRows[0];
  const source = ep.scriptContent ?? ep.content ?? '';
  if (!source.trim()) throw new Error('Episode has no content');

  const projectType = await getProjectProjectType(projectId);
  let screenplay: string;

  if (projectType === 'narrated_image') {
    screenplay = buildNarratedScript(source);
  } else if (projectType === 'commentary_mix') {
    screenplay = buildCommentaryScript(source);
  } else {
    screenplay = `## S01 | 内景 · 未命名地点 | 夜\n\n${source.trim()}`;
  }

  await db.update(episodes).set({ scriptContent: screenplay, updatedAt: now() }).where(eq(episodes.id, episodeId));

  logger.info({ episodeId, projectType, length: screenplay.length }, 'Script rewriter fallback completed');
  return {
    type: 'done' as const,
    text: `已使用本地编排兜底完成文稿整理并保存。`,
    toolCalls: [
      { toolName: 'read_script', args: {} },
      { toolName: 'save_script', args: { content: screenplay } },
    ],
    toolResults: [
      { toolName: 'read_script', result: { episode_id: episodeId, word_count: source.length, project_type: projectType } },
      { toolName: 'save_script', result: { message: 'Script saved', word_count: screenplay.length } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Extractor Fallback
// ---------------------------------------------------------------------------

async function saveFallbackCharacter(episodeId: string, projectId: string, name: string) {
  const db = getDb();
  const ts = now();
  const existing = (await db.select().from(characters).where(eq(characters.projectId, projectId)))
    .find(c => c.name === name);

  if (existing) {
    // Ensure linked to episode
    const links = await db.select().from(episodeCharacters).where(
      and(eq(episodeCharacters.episodeId, episodeId), eq(episodeCharacters.characterId, existing.id)),
    );
    if (links.length === 0) {
      await db.insert(episodeCharacters).values({ id: genId('ec'), episodeId, characterId: existing.id, createdAt: ts });
    }
    return { name, id: existing.id, mode: 'merged' };
  }

  const id = genId('char');
  await db.insert(characters).values({
    id, projectId, name,
    description: `${name}的角色描述`,
    appearancePrompt: `${name}的外貌描述`,
    createdAt: ts, updatedAt: ts,
  });
  await db.insert(episodeCharacters).values({ id: genId('ec'), episodeId, characterId: id, createdAt: ts });
  return { name, id, mode: 'created' };
}

async function saveFallbackScene(episodeId: string, projectId: string, scene: { location: string; time: string }) {
  const db = getDb();
  const ts = now();
  const existing = (await db.select().from(scenes).where(eq(scenes.projectId, projectId)))
    .find(s => s.locationDesc === scene.location && s.timeDesc === scene.time);

  if (existing) {
    const links = await db.select().from(episodeScenes).where(
      and(eq(episodeScenes.episodeId, episodeId), eq(episodeScenes.sceneId, existing.id)),
    );
    if (links.length === 0) {
      await db.insert(episodeScenes).values({ id: genId('es'), episodeId, sceneId: existing.id, createdAt: ts });
    }
    return { ...scene, id: existing.id, mode: 'reused' };
  }

  const id = genId('scene');
  await db.insert(scenes).values({
    id, projectId,
    name: scene.location,
    locationDesc: scene.location,
    timeDesc: scene.time,
    styleDesc: `${scene.location} ${scene.time} 的场景风格`,
    createdAt: ts, updatedAt: ts,
  });
  await db.insert(episodeScenes).values({ id: genId('es'), episodeId, sceneId: id, createdAt: ts });
  return { ...scene, id, mode: 'created' };
}

export async function runExtractorFallback(episodeId: string, projectId: string) {
  const db = getDb();
  const epRows = await db.select().from(episodes).where(eq(episodes.id, episodeId));
  if (!epRows.length) throw new Error('Episode not found');
  const script = epRows[0].scriptContent ?? epRows[0].content ?? '';
  if (!script.trim()) throw new Error('Episode has no script');

  const projectType = await getProjectProjectType(projectId);
  const savedCharacters: Array<{ name: string; id: string; mode: string }> = [];
  const savedScenes: Array<{ location: string; time: string; id: string; mode: string }> = [];

  if (projectType === 'narrated_image' || projectType === 'commentary_mix') {
    const narratorName = projectType === 'commentary_mix' ? '解说' : '旁白';
    savedCharacters.push(await saveFallbackCharacter(episodeId, projectId, narratorName));
    const sceneSpecs = projectType === 'commentary_mix'
      ? [{ location: '素材混剪画面', time: '观点推进' }, { location: '资料证据画面', time: '信息拆解' }, { location: '结论标题画面', time: '收束' }]
      : [{ location: '主题视觉背景', time: '开场' }, { location: '信息图画面', time: '展开' }, { location: '金句收束画面', time: '结尾' }];
    for (const scene of sceneSpecs) savedScenes.push(await saveFallbackScene(episodeId, projectId, scene));
  } else {
    // Extract speaker names from dialogue format
    const speakerNames = [...script.matchAll(/^([^：:\n]{1,8})[：:]/gm)]
      .map(m => m[1].replace(/[（(].+?[)）]/g, '').trim())
      .filter(name => name && !/旁白|环境音|音效|sfx|bgm/i.test(name));
    const names = [...new Set(speakerNames)];
    for (const name of names) savedCharacters.push(await saveFallbackCharacter(episodeId, projectId, name));

    // Extract scenes from screenplay headers
    const sceneMatches = [...script.matchAll(/^##\s*S\d+\s*\|\s*(?:内景|外景)\s*·\s*(.+?)\s*\|\s*(.+)$/gm)];
    const sceneSpecs = sceneMatches.length
      ? sceneMatches.map(m => ({ location: m[1].trim(), time: m[2].trim() }))
      : [{ location: '未命名场景', time: '日' }];
    for (const scene of sceneSpecs) savedScenes.push(await saveFallbackScene(episodeId, projectId, scene));
  }

  logger.info({ episodeId, charsSaved: savedCharacters.length, scenesSaved: savedScenes.length }, 'Extractor fallback completed');
  return {
    type: 'done' as const,
    text: `已使用本地编排兜底保存 ${savedCharacters.length} 个角色、${savedScenes.length} 个场景。`,
    toolCalls: [
      { toolName: 'read_existing_characters', args: {} },
      { toolName: 'save_dedup_characters', args: { characters: savedCharacters } },
      { toolName: 'save_dedup_scenes', args: { scenes: savedScenes } },
    ],
    toolResults: [
      { toolName: 'save_dedup_characters', result: { count: savedCharacters.length, characters: savedCharacters } },
      { toolName: 'save_dedup_scenes', result: { count: savedScenes.length, scenes: savedScenes } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Storyboard Fallback
// ---------------------------------------------------------------------------

interface FallbackStoryboard {
  shot_number: number;
  title: string;
  shot_type?: string;
  angle?: string;
  movement?: string;
  action?: string;
  dialogue?: string;
  description?: string;
  atmosphere?: string;
  image_prompt?: string;
  video_prompt?: string;
  duration: number;
  scene_id?: string;
  character_ids?: string[];
}

function makeNarrativeStoryboards(script: string, chars: Array<{ id: string; name: string }>, sceneList: Array<{ id: string; name: string }>): FallbackStoryboard[] {
  // Split script into paragraphs for shot generation
  const paragraphs = script.split(/\n{2,}/).filter(p => p.trim());
  const boards: FallbackStoryboard[] = [];

  for (let i = 0; i < Math.min(paragraphs.length, 20); i++) {
    const p = paragraphs[i].trim();
    const dialogueMatch = p.match(/^(.{1,8})[：:]\s*(.+)$/m);

    boards.push({
      shot_number: i + 1,
      title: `镜头 ${i + 1}`,
      shot_type: i === 0 ? '全景' : i === paragraphs.length - 1 ? '远景' : '中景',
      description: p.slice(0, 200),
      dialogue: dialogueMatch ? dialogueMatch[2] : undefined,
      action: dialogueMatch ? undefined : p.slice(0, 150),
      atmosphere: i === 0 ? '开场' : i === paragraphs.length - 1 ? '收束' : '推进',
      image_prompt: `Cinematic shot: ${p.slice(0, 100)}`,
      video_prompt: `Video: ${p.slice(0, 80)}`,
      duration: 8,
      scene_id: sceneList[Math.min(i, sceneList.length - 1)]?.id,
      character_ids: dialogueMatch
        ? chars.filter(c => p.includes(c.name)).map(c => c.id)
        : undefined,
    });
  }

  return boards;
}

function makeNarratedStoryboards(script: string): FallbackStoryboard[] {
  const sections = script.split(/^##\s+/m).filter(s => s.trim());
  return sections.slice(0, 6).map((section, i) => {
    const lines = section.split('\n').filter(l => l.trim());
    const header = lines[0] || `P${i + 1}`;
    const dialogueMatch = section.match(/旁白[：:]\s*(.+)$/m);
    return {
      shot_number: i + 1,
      title: header.split('|')[0]?.trim() || `段落 ${i + 1}`,
      shot_type: '中景',
      description: lines.slice(1).join(' ').slice(0, 200),
      dialogue: dialogueMatch?.[1] || undefined,
      atmosphere: i === 0 ? '开场' : i === sections.length - 1 ? '收束' : '展开',
      image_prompt: `Narration visual: ${lines.slice(1).join(' ').slice(0, 100)}`,
      duration: 6,
    };
  });
}

export async function runStoryboardFallback(episodeId: string, projectId: string) {
  const db = getDb();
  const epRows = await db.select().from(episodes).where(eq(episodes.id, episodeId));
  if (!epRows.length) throw new Error('Episode not found');
  const script = epRows[0].scriptContent ?? epRows[0].content ?? '';
  if (!script.trim()) throw new Error('Episode has no script');

  const projectType = await getProjectProjectType(projectId);

  // Fetch characters and scenes linked to this episode
  const charLinks = await db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));
  const sceneLinks = await db.select().from(episodeScenes).where(eq(episodeScenes.episodeId, episodeId));
  const charIds = charLinks.map(l => l.characterId);
  const sceneIds = sceneLinks.map(l => l.sceneId);

  const [charRows, sceneRows] = await Promise.all([
    charIds.length > 0 ? db.select({ id: characters.id, name: characters.name }).from(characters).where(inArray(characters.id, charIds)) : Promise.resolve([]),
    sceneIds.length > 0 ? db.select({ id: scenes.id, name: scenes.name }).from(scenes).where(inArray(scenes.id, sceneIds)) : Promise.resolve([]),
  ]);

  const boards = projectType === 'narrated_image' || projectType === 'commentary_mix'
    ? makeNarratedStoryboards(script)
    : makeNarrativeStoryboards(script, charRows, sceneRows);

  // Delete existing storyboards for this episode
  const existing = await db.select({ id: storyboards.id }).from(storyboards).where(eq(storyboards.episodeId, episodeId));
  if (existing.length > 0) {
    for (const e of existing) {
      await db.delete(storyboardCharacters).where(eq(storyboardCharacters.storyboardId, e.id));
    }
    await db.delete(storyboards).where(inArray(storyboards.id, existing.map(e => e.id)));
  }

  // Save new storyboards
  const ts = now();
  const saved: Array<FallbackStoryboard & { id: string }> = [];
  for (const sb of boards) {
    const id = genId('sb');
    await db.insert(storyboards).values({
      id,
      episodeId,
      seq: sb.shot_number,
      title: sb.title ?? null,
      shotType: sb.shot_type ?? null,
      angle: sb.angle ?? null,
      movement: sb.movement ?? null,
      visualDesc: sb.description ?? sb.action ?? '',
      dialogue: sb.dialogue ?? null,
      actionDesc: sb.action ?? null,
      atmosphere: sb.atmosphere ?? null,
      promptText: sb.image_prompt ?? null,
      videoPrompt: sb.video_prompt ?? null,
      durationSec: sb.duration ?? 8,
      sceneId: sb.scene_id ?? null,
      status: 'draft',
      createdAt: ts,
      updatedAt: ts,
    });

    // Sync character associations
    if (sb.character_ids?.length) {
      for (const cid of sb.character_ids) {
        await db.insert(storyboardCharacters).values({ storyboardId: id, characterId: cid });
      }
    }
    saved.push({ ...sb, id });
  }

  logger.info({ episodeId, count: saved.length, projectType }, 'Storyboard fallback completed');
  return {
    type: 'done' as const,
    text: `已使用本地编排兜底保存 ${saved.length} 条分镜。`,
    toolCalls: [
      { toolName: 'read_script_and_assets', args: {} },
      { toolName: 'save_storyboards', args: { storyboards: boards } },
    ],
    toolResults: [
      { toolName: 'read_script_and_assets', result: { characters: charRows.length, scenes: sceneRows.length, project_type: projectType } },
      { toolName: 'save_storyboards', result: { message: `Saved ${saved.length} storyboards`, count: saved.length } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Voice Assigner Fallback
// ---------------------------------------------------------------------------

function inferCharacterVoiceGender(char: { gender?: string | null; description?: string | null; personality?: string | null }): string {
  if (char.gender === '女' || char.gender === 'female') return '女声';
  if (char.gender === '男' || char.gender === 'male') return '男声';
  const text = `${char.description ?? ''} ${char.personality ?? ''}`.toLowerCase();
  if (/她|女|小姐|姐|妈|奶奶/.test(text)) return '女声';
  if (/他|男|先生|哥|爸|爷爷/.test(text)) return '男声';
  return '中性';
}

function inferVoiceGender(voiceId: string, desc: string[]): string {
  const id = voiceId.toLowerCase();
  const descText = desc.join(' ').toLowerCase();
  if (/female|woman|女|小姐姐|girl/i.test(id) || /女声|female|woman/i.test(descText)) return '女声';
  if (/male|man|男|大叔|boy/i.test(id) || /男声|male|man/i.test(descText)) return '男声';
  return '中性';
}

function parseVoiceDescription(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [String(raw)];
  }
}

function scoreVoiceForCharacter(char: { gender?: string | null; description?: string | null; personality?: string | null }, voice: { providerVoiceId: string; name: string; gender: string | null; style: string | null; language: string | null }) {
  let score = 0;
  const roleText = `${char.description ?? ''} ${char.personality ?? ''}`.toLowerCase();
  const voiceText = `${voice.name ?? ''} ${voice.style ?? ''}`.toLowerCase();
  const voiceGender = inferVoiceGender(voice.providerVoiceId, [voice.name ?? '', voice.style ?? '']);
  const targetGender = inferCharacterVoiceGender(char);

  if (targetGender !== '中性') {
    if (voiceGender === targetGender) score += 30;
    else if (voiceGender !== '中性') score -= 30;
  }

  if (/zh-cn/i.test(voice.providerVoiceId)) score += 3;
  if (/zh-tw/i.test(voice.providerVoiceId)) score += roleText.includes('台') ? 2 : 0;

  if (/[女|白领|她|温柔]/i.test(roleText) && voiceGender === '女声') score += 5;
  if (/[男|先生|他|成熟|冷静]/i.test(roleText) && voiceGender === '男声') score += 5;

  if (/旁白|解说|叙事/i.test(roleText)) {
    if (/news|narration|general|professional|clear|自然|讲述|旁白/i.test(voiceText)) score += 10;
    if (/child|kid|cartoon|童声|可爱/i.test(voiceText)) score -= 8;
  }

  return score;
}

export async function runVoiceAssignerFallback(episodeId: string, projectId: string) {
  const db = getDb();

  // Find active audio config
  const configs = (await db.select().from(aiServiceConfigs))
    .filter(c => c.serviceType === 'audio' && c.isActive);
  const providersWithVoices = new Set(
    (await db.select().from(aiVoices)).map(v => v.provider),
  );
  const audioConfig = configs.find(c => providersWithVoices.has(c.provider ?? ''));
  const provider = audioConfig?.provider ?? 'minimax';

  // Get voices for provider
  const voices = (await db.select().from(aiVoices)).filter(v => v.provider === provider);
  if (!voices.length) throw new Error(`No synced voices found for provider: ${provider}`);

  // Get characters for this episode
  const charLinks = await db.select().from(episodeCharacters).where(eq(episodeCharacters.episodeId, episodeId));
  const charIds = charLinks.map(l => l.characterId);
  if (!charIds.length) {
    return {
      type: 'done' as const,
      text: '当前剧集没有可分配音色的角色。',
      toolCalls: [],
      toolResults: [],
      assigned: [],
      skipped: [],
    };
  }

  const charRows = await db.select().from(characters).where(inArray(characters.id, charIds));
  const ts = now();

  const assigned: Array<{ character_id: string; character_name: string; voice_id: string; reason: string }> = [];
  const skipped: Array<{ character_id: string; character_name: string; voice_id: string }> = [];

  for (const char of charRows) {
    // Skip if already has matching voice
    if (char.voiceId && char.voiceProvider === provider) {
      skipped.push({ character_id: char.id, character_name: char.name, voice_id: char.voiceId });
      continue;
    }

    // Score and rank voices
    const ranked = voices
      .map(v => ({ voice: v, score: scoreVoiceForCharacter(char, v) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0]?.voice;
    if (!best) continue;

    const desc = [best.name, best.style].filter(Boolean);
    const reason = `根据角色设定匹配为 ${best.providerVoiceId}：${desc.length ? desc.slice(0, 3).join('、') : '中文通用音色'}`;

    await db.update(characters).set({
      voiceId: best.providerVoiceId,
      voiceProvider: provider,
      voiceSampleUrl: null,
      updatedAt: ts,
    }).where(eq(characters.id, char.id));

    assigned.push({ character_id: char.id, character_name: char.name, voice_id: best.providerVoiceId, reason });
  }

  logger.info({ episodeId, assigned: assigned.length, skipped: skipped.length }, 'Voice assigner fallback completed');
  return {
    type: 'done' as const,
    text: assigned.length
      ? `已完成 ${assigned.length} 个角色的音色分配。${assigned.map(a => `${a.character_name} -> ${a.voice_id}`).join('；')}`
      : `所有角色都已有音色，无需重新分配。`,
    toolCalls: [
      { toolName: 'list_voices', args: {} },
      ...assigned.map(a => ({ toolName: 'assign_voice', args: { character_id: a.character_id, voice_id: a.voice_id, reason: a.reason } })),
    ],
    toolResults: [
      { toolName: 'list_voices', result: { provider, count: voices.length } },
      ...assigned.map(a => ({ toolName: 'assign_voice', result: { message: `Assigned "${a.voice_id}" to ${a.character_name}`, reason: a.reason } })),
    ],
    assigned,
    skipped,
  };
}

// ---------------------------------------------------------------------------
// Main Orchestrated Fallback Dispatcher
// ---------------------------------------------------------------------------

export async function runOrchestratedFallback(
  agentType: string,
  episodeId: string,
  projectId: string,
): Promise<{
  type: 'done';
  text: string;
  toolCalls: Array<{ toolName: string; args: unknown }>;
  toolResults: Array<{ toolName: string; result: unknown }>;
}> {
  switch (agentType) {
    case 'script_rewriter':
      return runScriptRewriterFallback(episodeId, projectId);
    case 'extractor':
      return runExtractorFallback(episodeId, projectId);
    case 'storyboard_breaker':
      return runStoryboardFallback(episodeId, projectId);
    case 'voice_assigner':
      return runVoiceAssignerFallback(episodeId, projectId);
    default:
      throw new Error(`No fallback available for agent type: ${agentType}`);
  }
}
