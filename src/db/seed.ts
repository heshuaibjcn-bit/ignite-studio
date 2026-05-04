/**
 * Seed script — creates minimal test data for development.
 *
 * Creates:
 * - 1 project ("测试项目")
 * - 1 drama production ("AI短剧制作")
 * - 3 characters, 2 scenes
 * - 1 episode with 3 storyboards
 * - 1 AI service config (placeholder)
 * - 1 test API key
 */
import { getDb, closeDb } from './client';
import { eq } from 'drizzle-orm';
import { projects, productions, characters, scenes, episodeCharacters, episodeScenes, episodes, storyboards, aiServiceConfigs, apiKeys } from './schema';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

function genId(prefix: string): string {
  return `${prefix}_${nanoid(21)}`;
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

async function seed() {
  const db = getDb();

  const projectId = genId('proj');
  const productionId = genId('prod');
  const episodeId = genId('ep');

  // Project
  await db.insert(projects).values({
    id: projectId,
    name: '测试项目',
    description: 'Phase 0 seed data — 用于开发测试',
    category: 'drama',
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });

  // Production (drama mode)
  await db.insert(productions).values({
    id: productionId,
    projectId,
    mode: 'drama',
    name: 'AI短剧制作',
    description: '短剧测试制作',
    status: 'active',
    configSnapshot: JSON.stringify({
      enableStoryboardReview: true,
      enableVideoReview: true,
    }),
    createdAt: now(),
    updatedAt: now(),
  });

  // Characters
  const charIds = [genId('char'), genId('char'), genId('char')];
  await db.insert(characters).values([
    { id: charIds[0], projectId, name: '李明', gender: 'male', description: '男主角，25岁程序员', personality: '内向但善良', createdAt: now(), updatedAt: now() },
    { id: charIds[1], projectId, name: '王芳', gender: 'female', description: '女主角，23岁设计师', personality: '活泼开朗', createdAt: now(), updatedAt: now() },
    { id: charIds[2], projectId, name: '张伟', gender: 'male', description: '配角，30岁老板', personality: '精明干练', createdAt: now(), updatedAt: now() },
  ]);

  // Scenes
  const sceneIds = [genId('scene'), genId('scene')];
  await db.insert(scenes).values([
    { id: sceneIds[0], projectId, name: '办公室', locationDesc: '现代科技公司办公室', timeDesc: '白天', createdAt: now(), updatedAt: now() },
    { id: sceneIds[1], projectId, name: '咖啡馆', locationDesc: '街角精品咖啡馆', timeDesc: '傍晚', createdAt: now(), updatedAt: now() },
  ]);

  // Episode
  await db.insert(episodes).values({
    id: episodeId,
    projectId,
    productionId,
    episodeNo: 1,
    title: '第一集：初遇',
    content: '李明是一名程序员，某天在咖啡馆偶遇了设计师王芳。两人因为一杯拿铁产生了交集...',
    scriptContent: null,
    status: 'draft',
    waitingReviewStep: null,
    currentJobId: null,
    configSnapshot: JSON.stringify({ enableStoryboardReview: true, enableVideoReview: true }),
    createdAt: now(),
    updatedAt: now(),
  });

  // Episode-Character associations
  for (const charId of charIds) {
    await db.insert(episodeCharacters).values({ id: genId('ec'), episodeId, characterId: charId, createdAt: now() });
  }

  // Episode-Scene associations
  for (const sceneId of sceneIds) {
    await db.insert(episodeScenes).values({ id: genId('es'), episodeId, sceneId, createdAt: now() });
  }

  // Storyboards
  const storyboardIds = [genId('sb'), genId('sb'), genId('sb')];
  await db.insert(storyboards).values([
    { id: storyboardIds[0], episodeId, seq: 1, title: '开场', visualDesc: '李明坐在电脑前加班，屏幕上满是代码', dialogue: '又是一个通宵...', sceneId: sceneIds[0], status: 'draft', createdAt: now(), updatedAt: now() },
    { id: storyboardIds[1], episodeId, seq: 2, title: '咖啡馆偶遇', visualDesc: '王芳端着拿铁走向李明的桌子', dialogue: '这里有人坐吗？', sceneId: sceneIds[1], status: 'draft', createdAt: now(), updatedAt: now() },
    { id: storyboardIds[2], episodeId, seq: 3, title: '意外碰撞', visualDesc: '李明匆忙起身，撞翻了王芳的咖啡', dialogue: '对不起对不起！', sceneId: sceneIds[1], status: 'draft', createdAt: now(), updatedAt: now() },
  ]);

  // AI Service Config (placeholder)
  await db.insert(aiServiceConfigs).values({
    id: genId('aiconf'),
    name: '测试 LLM 配置',
    serviceType: 'text',
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiBase: 'https://api.openai.com/v1',
    apiKeyEncrypted: 'PLACEHOLDER_KEY_ENCRYPTED',
    isActive: true,
    priority: 100,
    createdAt: now(),
    updatedAt: now(),
  });

  // Test API Key
  const rawKey = `rk_test_${nanoid(32)}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  await db.insert(apiKeys).values({
    id: genId('key'),
    name: 'Test API Key',
    keyPrefix: rawKey.slice(0, 8),
    keyHash,
    status: 'active',
    dailyQuota: 500,
    perMinuteLimit: 60,
    createdAt: now(),
    updatedAt: now(),
  });

  console.log('Seed complete!');
  console.log(`  Project: ${projectId}`);
  console.log(`  Production: ${productionId}`);
  console.log(`  Episode: ${episodeId}`);
  console.log(`  Storyboards: ${storyboardIds.length}`);
  console.log(`  API Key: ${rawKey.slice(0, 12)}...`);
  console.log(`\n  Full API key (save this): ${rawKey}`);

  closeDb();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  closeDb();
  process.exit(1);
});
