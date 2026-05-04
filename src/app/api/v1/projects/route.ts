import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { productions, episodes as episodesTable, characters, scenes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { apiSuccess, apiError, apiInternalError } from '@/lib/api-response';
import { nanoid } from 'nanoid';

/** POST /api/v1/projects — create project with default production and episode */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return apiError('VALIDATION_FAILED', 'name is required', 400);
    }

    const repo = new ProjectsRepository();
    const project = await repo.create({
      name: body.name,
      description: body.description,
      category: body.category,
      coverAssetId: body.coverAssetId,
      defaultVoiceId: body.defaultVoiceId,
      ownerId: body.ownerId,
    });

    if (!project) return apiInternalError('Failed to create project');

    // Auto-create default production and episode
    const db = getDb();
    const ts = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const prodId = `prod_${nanoid(21)}`;

    await db.insert(productions).values({
      id: prodId,
      projectId: project.id,
      mode: 'drama',
      name: `${body.name} - 第一季`,
      description: body.description ?? null,
      createdAt: ts,
      updatedAt: ts,
    });

    const epId = `ep_${nanoid(21)}`;
    await db.insert(episodesTable).values({
      id: epId,
      projectId: project.id,
      productionId: prodId,
      episodeNo: 1,
      title: '第 1 集',
      content: '',
      status: 'draft',
      createdAt: ts,
      updatedAt: ts,
    });

    return apiSuccess({ project, default_production_id: prodId, default_episode_id: epId }, 201);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** GET /api/v1/projects — list projects with filters and embedded counts */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const keyword = searchParams.get('keyword') ?? searchParams.get('q');
    const withCounts = searchParams.get('with_counts') === 'true';

    const repo = new ProjectsRepository();
    let projects = await repo.list({
      status: searchParams.get('status') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? '20', 10),
      offset: parseInt(searchParams.get('offset') ?? '0', 10),
    });

    // Apply keyword filter in-memory (SQLite LIKE)
    if (keyword) {
      const kw = keyword.toLowerCase();
      projects = projects.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        (p.description ?? '').toLowerCase().includes(kw),
      );
    }

    // Embed counts if requested
    if (withCounts && projects.length > 0) {
      const db = getDb();
      const projectIds = projects.map(p => p.id);

      const allProductions = await db.select().from(productions);
      const allEpisodes = await db.select().from(episodesTable);
      const allCharacters = await db.select().from(characters);
      const allScenes = await db.select().from(scenes);

      const results = projects.map(p => {
        const prods = allProductions.filter(pr => pr.projectId === p.id);
        const prodIds = prods.map(pr => pr.id);
        const eps = allEpisodes.filter(e => prodIds.includes(e.productionId));
        const chars = allCharacters.filter(c => c.projectId === p.id);
        const scns = allScenes.filter(s => s.projectId === p.id);
        return {
          ...p,
          counts: {
            productions: prods.length,
            episodes: eps.length,
            characters: chars.length,
            scenes: scns.length,
          },
        };
      });

      return apiSuccess({ projects: results, count: results.length });
    }

    return apiSuccess({ projects, count: projects.length });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : 'Unknown error');
  }
}
