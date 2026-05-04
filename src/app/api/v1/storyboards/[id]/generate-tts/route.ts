/**
 * Storyboard TTS Generation
 * POST — generate TTS audio from storyboard dialogue, matching character voices.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { storyboards, episodes, characters, episodeCharacters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { generateTTS } from '@/services/tts-generation';
import { logTaskStart, logTaskSuccess, logTaskError } from '@/lib/task-logger';

const IGNORE_TTS_SPEAKERS = /^(环境音|环境声|音效|效果音|sfx|sound ?effect|bgm|背景音|背景音乐|ambient)$/i;
const IGNORE_TTS_TEXT = /^(无|无对白|无台词|无旁白|无需配音|无需对白|none|null|n\/a|na|环境音|环境声|音效|效果音|纯音效|纯环境音|只有环境音|仅环境音|背景音|背景音乐|bgm|sfx|ambient)$/i;

function parseDialogueForTTS(dialogue?: string | null) {
  const raw = dialogue?.trim() || '';
  if (!raw) return { speaker: '', pureText: '', ignorable: true };
  const speakerMatch = raw.match(/^(.+?)[:：]/);
  const speaker = speakerMatch ? speakerMatch[1].replace(/[（(].+?[)）]/g, '').trim() : '';
  const pureText = raw.replace(/^.+?[:：]\s*/, '').replace(/[（(].+?[)）]/g, '').trim();
  const ignorable = (!!speaker && IGNORE_TTS_SPEAKERS.test(speaker)) || !pureText || IGNORE_TTS_TEXT.test(pureText);
  return { speaker, pureText, ignorable };
}

async function findVoiceForSpeaker(projectId: string, speaker: string): Promise<string | null> {
  const db = getDb();
  const normalized = speaker.trim();
  const chars = await db.select().from(characters).where(eq(characters.projectId, projectId));

  const exact = chars.find((c) => c.name === normalized);
  if (exact?.voiceId) return exact.voiceId;

  if (/^(旁白|画外音|narrator)$/i.test(normalized)) {
    const narrator = chars.find((c) => /旁白|画外音|narrator/i.test(`${c.name} ${c.description || ''}`));
    if (narrator?.voiceId) return narrator.voiceId;
  }
  if (/^(解说|commentator)$/i.test(normalized)) {
    const commentator = chars.find((c) => /解说|commentator/i.test(`${c.name} ${c.description || ''}`));
    if (commentator?.voiceId) return commentator.voiceId;
  }
  return null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const db = getDb();

    const sbRows = await db.select().from(storyboards).where(eq(storyboards.id, id));
    if (!sbRows.length) return apiError('NOT_FOUND', 'Storyboard not found', 404);

    const sb = sbRows[0];
    const parsed = parseDialogueForTTS(sb.dialogue);

    if (parsed.ignorable) {
      return apiError('NO_DIALOGUE', '该镜头没有可生成的对白或旁白', 400);
    }

    logTaskStart('StoryboardTTS', 'generate', {
      storyboardId: id,
      episodeId: sb.episodeId,
      speaker: parsed.speaker,
    });

    // Find voice for the speaker
    let voiceId = 'alloy';

    if (parsed.speaker) {
      // Get episode to find projectId
      const epRows = await db.select().from(episodes).where(eq(episodes.id, sb.episodeId));
      if (epRows.length) {
        const found = await findVoiceForSpeaker(epRows[0].projectId, parsed.speaker);
        if (found) voiceId = found;
      }
    }

    const pureDialogue = parsed.pureText;
    if (!pureDialogue) {
      return apiError('NO_TEXT', '未提取到可合成的文本', 400);
    }

    const result = await generateTTS({
      text: pureDialogue,
      voiceId,
    });

    // Update storyboard with TTS audio path
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    await db
      .update(storyboards)
      .set({ ttsAudioAssetId: result.localPath, updatedAt: now })
      .where(eq(storyboards.id, id));

    logTaskSuccess('StoryboardTTS', 'generate', {
      storyboardId: id,
      voiceId,
      path: result.localPath,
      textLength: pureDialogue.length,
    });

    return apiSuccess({
      tts_audio_path: result.localPath,
      voice_id: voiceId,
      text: pureDialogue,
    });
  } catch (err) {
    logTaskError('StoryboardTTS', 'generate', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
