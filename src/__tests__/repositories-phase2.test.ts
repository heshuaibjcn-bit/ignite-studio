/**
 * Phase 2 integration tests — CRUD repositories + pipeline integration.
 * Each describe block gets its own isolated temp DB.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { ProjectsRepository } from '@/db/repositories/projects.repository';
import { ProductionsRepository } from '@/db/repositories/productions.repository';
import { EpisodesRepository } from '@/db/repositories/episodes.repository';
import { StoryboardsRepository } from '@/db/repositories/storyboards.repository';
import { AssetsRepository } from '@/db/repositories/assets.repository';
import { TaskCenterRepository } from '@/db/repositories/task-center.repository';
import { DRAMA_PIPELINE_DEFINITIONS } from '@/constants/step';
import { JOB_STATUS } from '@/constants/job';
import { STEP_STATUS } from '@/constants/step';
import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import fs from 'fs';
import path from 'path';
import os from 'os';

function createTempDbPath(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignite-p2-test-'));
  return path.join(tmpDir, 'test.db');
}

function migrateDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const migrationDir = path.resolve(__dirname, '../../drizzle');
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
    sqlite.exec(sql);
  }
  sqlite.close();
}

function setupIsolatedDb() {
  const dbPath = createTempDbPath();
  migrateDb(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  const cleanup = () => {
    try { fs.rmSync(path.dirname(dbPath), { recursive: true, force: true }); } catch {}
  };
  return { db, cleanup };
}

describe('ProjectsRepository', () => {
  let cleanup: () => void;
  afterAll(() => cleanup());

  it('creates and finds a project', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const repo = new ProjectsRepository(env.db);

    const project = await repo.create({ name: 'Test Project', category: 'drama' });
    expect(project).not.toBeNull();
    expect(project!.name).toBe('Test Project');
    expect(project!.status).toBe('active');

    const found = await repo.findById(project!.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(project!.id);
  });

  it('lists and updates projects', async () => {
    const env = setupIsolatedDb();
    const repo = new ProjectsRepository(env.db);

    await repo.create({ name: 'P1' });
    await repo.create({ name: 'P2' });

    const all = await repo.list({});
    expect(all.length).toBe(2);

    const updated = await repo.update(all[0].id, { name: 'P1 Updated' });
    expect(updated!.name).toBe('P1 Updated');
  });

  it('soft-deletes a project', async () => {
    const env = setupIsolatedDb();
    const repo = new ProjectsRepository(env.db);

    const project = await repo.create({ name: 'To Delete' });
    const deleted = await repo.softDelete(project!.id);
    expect(deleted!.status).toBe('archived');

    const active = await repo.list({ status: 'active' });
    expect(active.length).toBe(0);
  });
});

describe('ProductionsRepository', () => {
  let cleanup: () => void;
  afterAll(() => cleanup());

  it('creates and lists productions under a project', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const projectsRepo = new ProjectsRepository(env.db);
    const productionsRepo = new ProductionsRepository(env.db);

    const project = await projectsRepo.create({ name: 'Test' });
    const production = await productionsRepo.create({
      projectId: project!.id,
      mode: 'drama',
      name: 'My Drama',
    });

    expect(production).not.toBeNull();
    expect(production!.mode).toBe('drama');

    const listed = await productionsRepo.listByProjectId(project!.id);
    expect(listed.length).toBe(1);
  });
});

describe('EpisodesRepository', () => {
  let cleanup: () => void;
  afterAll(() => cleanup());

  it('creates an episode and updates step status', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const projectsRepo = new ProjectsRepository(env.db);
    const productionsRepo = new ProductionsRepository(env.db);
    const episodesRepo = new EpisodesRepository(env.db);

    const project = await projectsRepo.create({ name: 'Test' });
    const production = await productionsRepo.create({
      projectId: project!.id,
      mode: 'drama',
      name: 'Drama Prod',
    });

    const episode = await episodesRepo.create({
      projectId: project!.id,
      productionId: production!.id,
      episodeNo: 1,
      title: 'Episode 1',
      content: 'Some drama content for testing',
    });

    expect(episode).not.toBeNull();
    expect(episode!.title).toBe('Episode 1');
    expect(episode!.sourceValidateStatus).toBe('pending'); // default from stepStatusCol

    // Update step status
    const updated = await episodesRepo.updateStepStatus(episode!.id, 'source_validate', 'running');
    expect(updated!.sourceValidateStatus).toBe('running');

    const succeeded = await episodesRepo.updateStepStatus(episode!.id, 'source_validate', 'succeeded');
    expect(succeeded!.sourceValidateStatus).toBe('succeeded');

    // Set current job
    await episodesRepo.setCurrentJob(episode!.id, 'job_test123');
    const withJob = await episodesRepo.findById(episode!.id);
    expect(withJob!.currentJobId).toBe('job_test123');
  });

  it('lists episodes by production', async () => {
    const env = setupIsolatedDb();
    const projectsRepo = new ProjectsRepository(env.db);
    const productionsRepo = new ProductionsRepository(env.db);
    const episodesRepo = new EpisodesRepository(env.db);

    const project = await projectsRepo.create({ name: 'Test' });
    const production = await productionsRepo.create({
      projectId: project!.id,
      mode: 'drama',
      name: 'Drama Prod',
    });

    await episodesRepo.create({ projectId: project!.id, productionId: production!.id, episodeNo: 1, title: 'Ep 1', content: 'Content 1' });
    await episodesRepo.create({ projectId: project!.id, productionId: production!.id, episodeNo: 2, title: 'Ep 2', content: 'Content 2' });

    const list = await episodesRepo.listByProductionId(production!.id);
    expect(list.length).toBe(2);
  });
});

describe('StoryboardsRepository', () => {
  let cleanup: () => void;
  afterAll(() => cleanup());

  it('creates, lists, and reorders storyboards', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const projectsRepo = new ProjectsRepository(env.db);
    const productionsRepo = new ProductionsRepository(env.db);
    const episodesRepo = new EpisodesRepository(env.db);
    const storyboardsRepo = new StoryboardsRepository(env.db);

    const project = await projectsRepo.create({ name: 'Test' });
    const production = await productionsRepo.create({ projectId: project!.id, mode: 'drama', name: 'Drama' });
    const episode = await episodesRepo.create({ projectId: project!.id, productionId: production!.id, episodeNo: 1, title: 'Ep 1', content: 'Content' });

    const sb1 = await storyboardsRepo.create({ episodeId: episode!.id, seq: 1, visualDesc: 'Scene 1' });
    const sb2 = await storyboardsRepo.create({ episodeId: episode!.id, seq: 2, visualDesc: 'Scene 2' });
    const sb3 = await storyboardsRepo.create({ episodeId: episode!.id, seq: 3, visualDesc: 'Scene 3' });

    expect(sb1).not.toBeNull();

    const count = await storyboardsRepo.countByEpisodeId(episode!.id);
    expect(count).toBe(3);

    // Reorder: 3, 1, 2
    const reordered = await storyboardsRepo.reorder(episode!.id, [sb3!.id, sb1!.id, sb2!.id]);
    expect(reordered[0].id).toBe(sb3!.id);
    expect(reordered[0].seq).toBe(1);
    expect(reordered[1].id).toBe(sb1!.id);
    expect(reordered[1].seq).toBe(2);
  });
});

describe('AssetsRepository', () => {
  let cleanup: () => void;
  afterAll(() => cleanup());

  it('creates assets and manages references', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const repo = new AssetsRepository(env.db);

    const asset = await repo.create({
      type: 'image',
      sourceType: 'upload',
      mimeType: 'image/png',
      localPath: '/data/assets/img.png',
      width: 1920,
      height: 1080,
    });

    expect(asset).not.toBeNull();
    expect(asset!.type).toBe('image');

    // Create reference
    const ref = await repo.createReference({
      assetId: asset!.id,
      refType: 'episode',
      refId: 'ep_test',
      refField: 'cover',
    });
    expect(ref).not.toBeNull();
    expect(ref!.isCurrent).toBe(true);

    // Find current reference
    const current = await repo.findCurrentReference({
      refType: 'episode',
      refId: 'ep_test',
      refField: 'cover',
    });
    expect(current).not.toBeNull();
    expect(current!.assetId).toBe(asset!.id);
  });

  it('lists assets by project and type', async () => {
    const env = setupIsolatedDb();
    const repo = new AssetsRepository(env.db);

    await repo.create({ projectId: 'proj_1', type: 'image', sourceType: 'upload', mimeType: 'image/png', localPath: '/a.png' });
    await repo.create({ projectId: 'proj_1', type: 'video', sourceType: 'generated', mimeType: 'video/mp4', localPath: '/b.mp4' });
    await repo.create({ projectId: 'proj_2', type: 'image', sourceType: 'upload', mimeType: 'image/png', localPath: '/c.png' });

    const proj1 = await repo.list({ projectId: 'proj_1' });
    expect(proj1.length).toBe(2);

    const images = await repo.list({ projectId: 'proj_1', type: 'image' });
    expect(images.length).toBe(1);
  });
});

describe('Integration: drama/run with episode validation', () => {
  let cleanup: () => void;
  afterAll(() => cleanup());

  it('links episode to pipeline and syncs step status', async () => {
    const env = setupIsolatedDb();
    cleanup = env.cleanup;
    const taskCenter = new TaskCenterRepository(env.db);
    const episodesRepo = new EpisodesRepository(env.db);

    // Create episode chain
    const projectsRepo = new ProjectsRepository(env.db);
    const productionsRepo = new ProductionsRepository(env.db);

    const project = await projectsRepo.create({ name: 'Test' });
    const production = await productionsRepo.create({ projectId: project!.id, mode: 'drama', name: 'Drama' });
    const episode = await episodesRepo.create({
      projectId: project!.id,
      productionId: production!.id,
      episodeNo: 1,
      title: 'Ep 1',
      content: 'Full episode content here',
    });

    // Create pipeline job (like drama/run does)
    const jobId = `job_${nanoid(10)}`;
    await taskCenter.createPipelineJob({
      jobId,
      bizType: 'episode',
      bizId: episode!.id,
      runType: 'pipeline',
      triggerSource: 'user',
      projectId: project!.id,
      productionId: production!.id,
      steps: DRAMA_PIPELINE_DEFINITIONS,
    });
    await episodesRepo.setCurrentJob(episode!.id, jobId);
    await episodesRepo.update(episode!.id, { status: 'processing' });

    // Claim and mark step 1 as started
    await taskCenter.claimJobForWorker(jobId);
    const step = await taskCenter.getNextExecutableStep(jobId);
    expect(step!.stepCode).toBe('source_validate');

    await taskCenter.markStepStarted(jobId, step!.id, step!.stepCode);

    // Episode step status should be synced
    const ep = await episodesRepo.findById(episode!.id);
    expect(ep!.sourceValidateStatus).toBe('running');

    // Mark succeeded
    await taskCenter.markStepSucceeded(jobId, step!.id, { result: 'ok' });
    const ep2 = await episodesRepo.findById(episode!.id);
    expect(ep2!.sourceValidateStatus).toBe('succeeded');
  });
});
