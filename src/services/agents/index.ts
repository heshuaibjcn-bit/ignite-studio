/**
 * AI Agent System
 * Uses Vercel AI SDK's generateText with tool calling for LLM-powered pipeline steps.
 * Each agent type has a system prompt (skill) and a set of tools.
 *
 * Per-agent configuration (model, temperature, systemPrompt) is loaded from
 * the agent_configs table and takes precedence over global text config.
 */
import { generateText, type ToolSet, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getActiveConfig, getTextProviderBaseUrl } from '../ai-config';
import { logger } from '@/lib/logger';
import { loadAgentSkills } from './skills';

export type AgentType =
  | 'script_rewriter'
  | 'extractor'
  | 'storyboard_breaker'
  | 'voice_assigner'
  | 'grid_prompt_generator';

/**
 * Load per-agent config from the database.
 * Returns null if not found or table doesn't exist.
 */
async function getAgentConfig(agentType: AgentType) {
  try {
    const { getDb } = await import('@/db/client');
    const { agentConfigs } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = getDb();
    const rows = await db
      .select()
      .from(agentConfigs)
      .where(
        and(
          eq(agentConfigs.agentType, agentType),
          eq(agentConfigs.enabled, true),
        ),
      );
    return rows.length > 0 ? rows[0] : null;
  } catch {
    // Agent config table may not exist yet — fall back to global config
    return null;
  }
}

/**
 * Get the AI SDK model instance, optionally using per-agent config.
 */
async function getTextModel(agentType?: AgentType) {
  const config = await getActiveConfig('text');
  if (!config) throw new Error('No active text/LLM provider configured');

  let model = config.model || 'gpt-4o';

  // Check for per-agent config override
  if (agentType) {
    const agentConf = await getAgentConfig(agentType);
    if (agentConf?.model) {
      model = agentConf.model;
    }
  }

  const baseURL = getTextProviderBaseUrl(config);
  const provider = createOpenAI({
    baseURL,
    apiKey: config.apiKey,
  });

  return provider(model);
}

/**
 * Build the full system prompt for an agent, combining:
 * 1. The skill prompt from the .md file
 * 2. Skills injected from the skills system
 * 3. Per-agent custom system prompt
 */
async function buildSystemPrompt(agentType: AgentType): Promise<string> {
  const skillPrompt = loadSkillPrompt(agentType);
  const agentSkills = loadAgentSkills(agentType);

  let prompt = skillPrompt;
  if (agentSkills) {
    prompt += '\n\n' + agentSkills;
  }

  // Append per-agent custom system prompt
  const agentConf = await getAgentConfig(agentType);
  if (agentConf?.systemPrompt) {
    prompt += '\n\n' + agentConf.systemPrompt;
  }

  return prompt;
}

/**
 * Run an agent with the given system prompt and user message.
 * Returns the generated text response.
 */
export async function runAgent(params: {
  agentType: AgentType;
  systemPrompt?: string;
  userMessage: string;
  tools?: ToolSet;
  maxSteps?: number;
}): Promise<{ text: string; toolResults: unknown[] }> {
  const model = await getTextModel(params.agentType);

  // Use provided systemPrompt or build from skill + config
  const systemPrompt =
    params.systemPrompt || (await buildSystemPrompt(params.agentType));

  logger.info(
    { agentType: params.agentType, messageLength: params.userMessage.length },
    'Agent execution started',
  );

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: params.userMessage,
    tools: params.tools,
    maxRetries: 2,
    stopWhen: stepCountIs(params.maxSteps ?? 5),
  });

  const toolResults = result.steps.flatMap(
    (step) => step.toolResults ?? [],
  );

  logger.info(
    {
      agentType: params.agentType,
      steps: result.steps.length,
      toolCalls: toolResults.length,
      textLength: result.text.length,
    },
    'Agent execution completed',
  );

  return { text: result.text, toolResults };
}

const promptCache = new Map<string, string>();

/**
 * Load a skill prompt from the skills directory.
 * Results are cached in memory — prompts are read once and reused.
 */
export function loadSkillPrompt(agentType: AgentType): string {
  const cacheKey = agentType.replace(/_/g, '-');
  if (promptCache.has(cacheKey)) return promptCache.get(cacheKey)!;

  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');

  const skillPath = join(
    process.cwd(),
    'src',
    'services',
    'agents',
    'skills',
    `${cacheKey}.md`,
  );
  if (!existsSync(skillPath)) {
    logger.warn(
      { agentType, skillPath },
      'Skill prompt file not found, using default',
    );
    const fallback = `You are a ${agentType} agent. Complete the task described in the user message.`;
    promptCache.set(cacheKey, fallback);
    return fallback;
  }

  let content = readFileSync(skillPath, 'utf-8');
  // Strip YAML frontmatter
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) content = content.slice(endIdx + 3).trim();
  }
  promptCache.set(cacheKey, content);
  return content;
}
