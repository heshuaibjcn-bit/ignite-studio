/**
 * Agent Chat API
 * POST — run an agent with a user message and return results.
 * GET — debug: validate agent config and return available tools.
 *
 * When the LLM doesn't trigger any tool calls, the orchestrated fallback
 * system kicks in to complete the task using local logic.
 */
import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { runAgent, type AgentType } from '@/services/agents';
import { runOrchestratedFallback } from '@/services/agents/fallbacks';
import { logTaskStart, logTaskSuccess, logTaskError, logTaskProgress } from '@/lib/task-logger';

const VALID_AGENT_TYPES: AgentType[] = [
  'script_rewriter',
  'extractor',
  'storyboard_breaker',
  'voice_assigner',
  'grid_prompt_generator',
];

interface Props {
  params: Promise<{ type: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { type } = await params;
    const agentType = type as AgentType;

    if (!VALID_AGENT_TYPES.includes(agentType)) {
      return apiError('INVALID_AGENT', `Invalid agent type: ${type}`, 400);
    }

    const body = await request.json();
    const { message, episode_id, project_id, max_steps } = body;

    logTaskStart('Agent', agentType, {
      episodeId: episode_id,
      projectId: project_id,
      messageLength: message?.length || 0,
    });

    if (!message) {
      return apiError('MISSING_PARAMS', 'message is required', 400);
    }

    const startTime = performance.now();

    let result = await runAgent({
      agentType,
      userMessage: message,
      maxSteps: max_steps || 20,
    });

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

    // Check if agent triggered tool calls — if not, run orchestrated fallback
    const toolCallCount = result.toolResults?.length ?? 0;
    if (toolCallCount === 0 && episode_id && project_id) {
      logger.info({ agentType, episodeId: episode_id }, 'No tool calls triggered, running orchestrated fallback');
      try {
        const fallback = await runOrchestratedFallback(agentType, episode_id, project_id);
        result = {
          text: fallback.text,
          toolResults: fallback.toolResults.map(tr => tr),
        };
        logTaskProgress('Agent', 'fallback-used', { agentType, fallbackTextLength: fallback.text.length });
      } catch (fallbackErr) {
        logger.warn({ agentType, error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) }, 'Fallback also failed');
      }
    }

    logTaskSuccess('Agent', agentType, { elapsedSeconds: elapsed });

    // Normalize tool calls and results for the response
    const toolCalls = (result.toolResults || []).map((tr: unknown) => {
      const entry = tr as Record<string, unknown>;
      return {
        toolName: entry?.toolName || entry?.name || null,
        result: typeof entry?.result === 'string'
          ? entry.result
          : JSON.stringify(entry?.result ?? entry),
      };
    });

    logTaskProgress('Agent', 'tool-summary', {
      agentType,
      toolCallCount: toolCalls.length,
    });

    return apiSuccess({
      type: 'done',
      text: result.text || '',
      toolCalls,
      elapsed_seconds: parseFloat(elapsed),
    });
  } catch (err) {
    logTaskError('Agent', 'chat', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return apiInternalError(err instanceof Error ? err.message : 'Agent execution failed');
  }
}

/** GET — Agent debug: validate config and return available tools */
export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { type } = await params;
    const agentType = type as AgentType;

    if (!VALID_AGENT_TYPES.includes(agentType)) {
      return apiError('INVALID_AGENT', `Invalid agent type: ${type}`, 400);
    }

    // Check agent config
    let configStatus = 'no_config';
    let configModel = null;
    try {
      const { getDb } = await import('@/db/client');
      const { agentConfigs } = await import('@/db/schema');
      const { eq, and } = await import('drizzle-orm');
      const db = getDb();
      const rows = await db.select().from(agentConfigs).where(
        and(eq(agentConfigs.agentType, agentType), eq(agentConfigs.enabled, true)),
      );
      if (rows.length > 0) {
        configStatus = 'active';
        configModel = rows[0].model;
      }
    } catch {
      configStatus = 'table_not_found';
    }

    // Check global text config
    const { getActiveConfig } = await import('@/services/ai-config');
    const textConfig = await getActiveConfig('text');
    const globalConfig = textConfig
      ? { provider: textConfig.provider, model: textConfig.model, active: true }
      : { active: false };

    // Check skill file
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const skillPath = join(process.cwd(), 'src', 'services', 'agents', 'skills', `${agentType.replace(/_/g, '-')}.md`);
    const skillExists = existsSync(skillPath);

    return apiSuccess({
      agent_type: agentType,
      valid: true,
      agent_config: { status: configStatus, model: configModel },
      global_text_config: globalConfig,
      skill_file: { exists: skillExists, path: skillPath },
      has_fallback: ['script_rewriter', 'extractor', 'storyboard_breaker', 'voice_assigner'].includes(agentType),
    });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Debug check failed');
  }
}
