/**
 * Agent Skills Loader
 *
 * Loads SKILL.md files for each agent type and injects them into
 * the agent's system prompt. Skills define specialized behavior
 * beyond the base tool set.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import type { AgentType } from './index';

const SKILLS_DIR = join(process.cwd(), 'src', 'services', 'agents', 'skills');

/**
 * Map agent types to their skill file IDs.
 * Each ID corresponds to a {id}.md file in the skills directory.
 */
const AGENT_SKILL_MAP: Record<string, string[]> = {
  script_rewriter: ['script-rewriter'],
  extractor: ['extractor'],
  storyboard_breaker: ['storyboard-breaker'],
  voice_assigner: ['voice-assigner'],
  grid_prompt_generator: ['grid-prompt-generator'],
};

/**
 * Strip YAML frontmatter from a skill file.
 */
function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content.trim();
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content.trim();
  return content.slice(end + 4).trim();
}

/**
 * Read a single skill file by ID.
 */
function readSkill(skillId: string): string {
  const skillPath = join(SKILLS_DIR, `${skillId}.md`);
  if (!existsSync(skillPath)) return '';

  const raw = readFileSync(skillPath, 'utf-8');
  const content = stripFrontmatter(raw);
  if (!content) return '';

  return [`## Skill: ${skillId}`, content].join('\n');
}

/**
 * Load all skills for an agent type as a combined prompt section.
 *
 * The returned string is injected into the agent's system prompt
 * so the LLM follows skill-specific rules.
 */
export function loadAgentSkills(agentType: AgentType): string {
  const skillIds = AGENT_SKILL_MAP[agentType] || [];
  const contents = skillIds.map(readSkill).filter(Boolean);

  if (!contents.length) return '';

  return [
    '以下是该 Agent 专属的项目技能规范（SKILL.md）。',
    '不同 Agent 会加载不同 skill；你只需要遵守当前注入的这些技能。',
    '你必须在不违背当前工具边界的前提下优先遵守这些规范；若与用户明确要求冲突，以用户要求为准。',
    '',
    contents.join('\n\n'),
  ].join('\n');
}

/**
 * List all available skill IDs in the skills directory.
 */
export function listAgentSkills(): string[] {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Read a specific skill's content by ID.
 */
export function readSkillContent(skillId: string): string | null {
  const skillPath = join(SKILLS_DIR, `${skillId}.md`);
  if (!existsSync(skillPath)) return null;
  return readFileSync(skillPath, 'utf-8');
}

/**
 * Write/update a skill file by ID.
 */
export function writeSkillContent(skillId: string, content: string): void {
  if (!existsSync(SKILLS_DIR)) mkdirSync(SKILLS_DIR, { recursive: true });
  const skillPath = join(SKILLS_DIR, `${skillId}.md`);
  writeFileSync(skillPath, content, 'utf-8');
}

/**
 * Create a new skill file.
 */
export function createSkill(skillId: string, content: string): string {
  const safeId = skillId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) throw new Error('Invalid skill ID');
  const skillPath = join(SKILLS_DIR, `${safeId}.md`);
  if (existsSync(skillPath)) throw new Error(`Skill '${safeId}' already exists`);
  writeSkillContent(safeId, content);
  return safeId;
}

/**
 * Delete a skill file by ID.
 */
export function deleteSkill(skillId: string): boolean {
  const skillPath = join(SKILLS_DIR, `${skillId}.md`);
  if (!existsSync(skillPath)) return false;
  unlinkSync(skillPath);
  return true;
}
