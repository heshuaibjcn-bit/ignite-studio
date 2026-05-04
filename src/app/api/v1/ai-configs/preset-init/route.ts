/**
 * AI Config Preset Init API
 * POST — initialize default AI service configs from presets using a single API key.
 *
 * Creates config entries for common services (text, image, video, audio)
 * using the provided API key. Skips services that already have an active config.
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { aiServiceConfigs, agentConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { nanoid } from 'nanoid';

interface PresetInit {
  text_api_key?: string;
  image_api_key?: string;
  video_api_key?: string;
  audio_api_key?: string;
  /** Specific text provider to use */
  text_provider?: string;
  /** Specific image provider to use */
  image_provider?: string;
  /** Specific video provider to use */
  video_provider?: string;
  /** Specific audio provider to use */
  audio_provider?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PresetInit = await request.json();

    const db = getDb();
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const created: string[] = [];
    const skipped: string[] = [];

    // Check existing configs
    const existing = await db.select().from(aiServiceConfigs);
    const existingTypes = new Set(existing.filter(c => c.isActive).map(c => c.serviceType));

    // Default presets per service type
    const defaults: Array<{ serviceType: string; provider: string; model: string; apiKey?: string; baseUrl: string }> = [
      { serviceType: 'text', provider: body.text_provider ?? 'openai', model: 'gpt-4o', apiKey: body.text_api_key, baseUrl: 'https://api.openai.com/v1' },
      { serviceType: 'image', provider: body.image_provider ?? 'openai', model: 'dall-e-3', apiKey: body.image_api_key, baseUrl: 'https://api.openai.com/v1' },
      { serviceType: 'video', provider: body.video_provider ?? 'minimax', model: 'minimax-video-01', apiKey: body.video_api_key, baseUrl: 'https://api.minimax.chat/v1' },
      { serviceType: 'audio', provider: body.audio_provider ?? 'edge', model: 'edge-tts', baseUrl: '' },
    ];

    for (const preset of defaults) {
      if (existingTypes.has(preset.serviceType)) {
        skipped.push(preset.serviceType);
        continue;
      }

      // Edge TTS doesn't need an API key
      if (preset.provider !== 'edge' && !preset.apiKey) {
        skipped.push(preset.serviceType);
        continue;
      }

      const id = `aiconf_${nanoid(21)}`;
      const encryptedKey = preset.apiKey ? encrypt(preset.apiKey) : null;

      await db.insert(aiServiceConfigs).values({
        id,
        name: `${preset.provider} ${preset.serviceType}`,
        serviceType: preset.serviceType,
        provider: preset.provider,
        model: preset.model,
        apiBase: preset.baseUrl || null,
        apiKeyEncrypted: encryptedKey,
        isActive: true,
        priority: 100,
        createdAt: now,
        updatedAt: now,
      });
      created.push(preset.serviceType);
    }

    // Create default agent configs if none exist
    try {
      const existingAgents = await db.select().from(agentConfigs);
      if (existingAgents.length === 0) {
        const agentDefaults = [
          { agentType: 'script_rewriter', model: 'gpt-4o', temperature: 0.7 },
          { agentType: 'extractor', model: 'gpt-4o', temperature: 0.5 },
          { agentType: 'storyboard_breaker', model: 'gpt-4o', temperature: 0.7 },
          { agentType: 'voice_assigner', model: 'gpt-4o', temperature: 0.3 },
          { agentType: 'grid_prompt_generator', model: 'gpt-4o', temperature: 0.7 },
        ];
        for (const ag of agentDefaults) {
          await db.insert(agentConfigs).values({
            id: `agconf_${nanoid(21)}`,
            agentType: ag.agentType,
            name: `${ag.agentType} default`,
            model: ag.model,
            temperature: ag.temperature,
            maxTokens: 4096,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch {
      // Agent config table may not exist yet
    }

    return apiSuccess({
      message: `Initialized ${created.length} service configs, skipped ${skipped.length}`,
      created,
      skipped,
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
