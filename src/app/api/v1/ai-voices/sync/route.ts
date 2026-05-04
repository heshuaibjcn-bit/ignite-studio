/**
 * Voice Sync API
 * POST — sync voice list from provider and store in database.
 *
 * Supports: edge (Edge TTS), openai, minimax.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { aiVoices, aiServiceConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

function extractLanguage(voiceId: string, voiceName: string): string {
  const text = `${voiceId} ${voiceName}`.toLowerCase();
  if (text.includes('cantonese') || text.includes('粤')) return '粤语';
  if (text.includes('english') || text.includes('aussie')) return '英语';
  if (text.includes('japanese') || text.includes('日语')) return '日语';
  if (text.includes('korean') || text.includes('韩')) return '韩语';
  if (text.includes('chinese') || text.includes('mandarin') || text.includes('中文')) return '中文';
  return '其他';
}

function getOpenAICompatibleVoices() {
  return [
    { voice_id: 'alloy', voice_name: 'Alloy', gender: 'neutral', description: '平衡、自然、通用叙述' },
    { voice_id: 'ash', voice_name: 'Ash', gender: 'male', description: '沉稳、冷静、成熟角色' },
    { voice_id: 'coral', voice_name: 'Coral', gender: 'female', description: '明亮、亲和、温暖' },
    { voice_id: 'echo', voice_name: 'Echo', gender: 'male', description: '低沉、稳重、男性角色' },
    { voice_id: 'fable', voice_name: 'Fable', gender: 'male', description: '温暖、故事感、表现力强' },
    { voice_id: 'nova', voice_name: 'Nova', gender: 'female', description: '温柔、甜润、女主' },
    { voice_id: 'onyx', voice_name: 'Onyx', gender: 'male', description: '深沉、有力、权威' },
    { voice_id: 'sage', voice_name: 'Sage', gender: 'neutral', description: '成熟、从容、旁白' },
    { voice_id: 'shimmer', voice_name: 'Shimmer', gender: 'female', description: '活泼、年轻、少女' },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedProvider = String(body.provider || '').trim().toLowerCase();

    const db = getDb();

    // Get active audio config
    const configRows = await db
      .select()
      .from(aiServiceConfigs)
      .where(eq(aiServiceConfigs.serviceType, 'audio'));

    const activeConfigs = configRows.filter(
      (r) => r.isActive && (!requestedProvider || r.provider === requestedProvider),
    );

    if (!activeConfigs.length) {
      return apiError(
        'NO_CONFIG',
        requestedProvider
          ? `No active ${requestedProvider} audio config found`
          : 'No active audio config found',
        400,
      );
    }

    const config = activeConfigs[0];
    const provider = String(config.provider || '').toLowerCase();

    let voices: Array<{
      voice_id: string;
      voice_name: string;
      gender?: string;
      description?: string;
      language?: string;
    }> = [];

    if (provider === 'openai' || provider === 'openrouter' || provider === 'chatfire') {
      voices = getOpenAICompatibleVoices();
    } else if (provider === 'edge') {
      // Edge TTS voice list — fetch from Microsoft endpoint
      try {
        const resp = await fetch(
          'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
          {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
          },
        );

        if (resp.ok) {
          const result = (await resp.json()) as Array<Record<string, string>>;
          voices = (Array.isArray(result) ? result : [])
            .filter((v) => {
              const locale = String(v.Locale || '');
              return (
                locale.startsWith('zh-CN') ||
                locale.startsWith('zh-HK') ||
                locale.startsWith('zh-TW')
              );
            })
            .map((v) => ({
              voice_id: v.ShortName || '',
              voice_name: v.FriendlyName || v.ShortName || '',
              gender: /female/i.test(v.Gender || '') ? 'female' : 'male',
              description: `${v.Locale || ''} ${v.Gender || ''}`,
              language: extractLanguage(v.ShortName || '', v.FriendlyName || ''),
            }));
        }
      } catch {
        logger.warn('Edge TTS voice list fetch failed');
      }
    } else if (provider === 'minimax') {
      // MiniMax voice list
      try {
        const baseUrl = config.apiBase?.replace(/\/+$/, '') || 'https://api.minimax.chat/v1';
        const resp = await fetch(`${baseUrl}/get_voice`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKeyEncrypted}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voice_type: 'all' }),
        });

        if (resp.ok) {
          const result = (await resp.json()) as Record<string, unknown>;
          const systemVoice = (result.system_voice || []) as Array<Record<string, string>>;
          voices = systemVoice
            .filter((v) => {
              const lang = extractLanguage(v.voice_id || '', v.voice_name || '');
              return lang === '中文' || lang === '粤语';
            })
            .map((v) => ({
              voice_id: v.voice_id || '',
              voice_name: v.voice_name || '',
              gender: '',
              description: Array.isArray(v.description) ? v.description.join(', ') : String(v.description || ''),
              language: extractLanguage(v.voice_id || '', v.voice_name || ''),
            }));
        }
      } catch {
        logger.warn('MiniMax voice list fetch failed');
      }
    } else {
      return apiError('UNSUPPORTED', `Voice sync not supported for provider: ${provider}`, 400);
    }

    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    // Clear existing voices for this provider
    await db.delete(aiVoices).where(eq(aiVoices.provider, provider));

    // Insert new voices
    for (const v of voices) {
      await db.insert(aiVoices).values({
        id: nanoid(12),
        provider,
        providerVoiceId: v.voice_id,
        name: v.voice_name,
        gender: v.gender || null,
        language: v.language || extractLanguage(v.voice_id, v.voice_name),
        style: v.description || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    logger.info({ provider, count: voices.length }, 'Voices synced');
    return apiSuccess({
      count: voices.length,
      provider,
      message: `Synced ${voices.length} voices`,
    });
  } catch (err) {
    return apiError('SYNC_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
  }
}
