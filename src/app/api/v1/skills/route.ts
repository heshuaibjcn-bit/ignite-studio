/**
 * Skills API
 * GET    — list all available skills, or get a specific skill's content
 * POST   — create a new skill
 * PUT    — update an existing skill's content
 * DELETE — delete a skill
 */
import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { listAgentSkills, readSkillContent, createSkill, writeSkillContent, deleteSkill } from '@/services/agents/skills';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('id');

    if (skillId) {
      const content = readSkillContent(skillId);
      if (!content) return apiError('NOT_FOUND', `Skill '${skillId}' not found`, 404);
      return apiSuccess({ id: skillId, content });
    }

    const skills = listAgentSkills();
    return apiSuccess({ skills, count: skills.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Failed to list skills');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content } = body;
    if (!id || !content) return apiError('MISSING_PARAMS', 'id and content are required', 400);

    const skillId = createSkill(id, content);
    return apiSuccess({ id: skillId, created: true }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create skill';
    if (msg.includes('already exists')) return apiError('CONFLICT', msg, 409);
    return apiInternalError(msg);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content } = body;
    if (!id || !content) return apiError('MISSING_PARAMS', 'id and content are required', 400);

    const existing = readSkillContent(id);
    if (!existing) return apiError('NOT_FOUND', `Skill '${id}' not found`, 404);

    writeSkillContent(id, content);
    return apiSuccess({ id, updated: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Failed to update skill');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return apiError('MISSING_PARAMS', 'id query parameter is required', 400);

    const deleted = deleteSkill(id);
    if (!deleted) return apiError('NOT_FOUND', `Skill '${id}' not found`, 404);

    return apiSuccess({ id, deleted: true });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Failed to delete skill');
  }
}
