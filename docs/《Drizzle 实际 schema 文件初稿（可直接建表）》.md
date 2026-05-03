# 

- **文档名称**：燃启短视频综合创作平台《Drizzle 实际 schema 文件初稿（可直接建表）》
- **适用版本**：PRD v2.1.1
- **配套文档**：
    - 《任务中心与状态机详细设计附件》
    - 《核心数据表结构草案（Drizzle / SQLite 版）》
- **版本号**：v2.1.1-s1
- **目标**：给出一个可直接进入项目、用于 SQLite + Drizzle ORM 的首版 schema 初稿

---

## 说明

本稿按以下原则输出：

1. 采用 **Drizzle ORM / SQLite**
2. 尽量保持与 PRD 字段一致
3. 所有枚举先使用 `text`
4. JSON 字段统一使用 `text` 存储
5. 时间字段统一使用 ISO 字符串 `text`
6. 兼顾“先跑通”与“后续可演进”
7. 以 **可直接建表** 为目标，不强依赖复杂外键级联

> 说明：以下代码为“首版可落地 schema 初稿”。  
> 真正接入项目时，建议再补充：
> 
> - relations
> - zod schema
> - repository 层查询封装
> - seed 数据
> - migration 拆分

---

# 一、建议目录结构

Ts

src/db/

  ├── schema/

  │   ├── common.ts

  │   ├── projects.ts

  │   ├── assets.ts

  │   ├── configs.ts

  │   ├── talking-head.ts

  │   ├── remix.ts

  │   ├── drama.ts

  │   ├── jobs.ts

  │   ├── openclaw.ts

  │   ├── audit.ts

  │   ├── text-versions.ts

  │   └── index.ts

  └── client.ts

下面我按“可直接复制”的方式输出。

---

# 二、`src/db/schema/common.ts`

Ts

import { sql } from 'drizzle-orm';

import { integer, text } from 'drizzle-orm/sqlite-core';

export const idCol = (name = 'id') => text(name).primaryKey();

export const createdAtCol = () =>

  text('created_at')

    .notNull()

    .default(sql`CURRENT_TIMESTAMP`);

export const updatedAtCol = () =>

  text('updated_at')

    .notNull()

    .default(sql`CURRENT_TIMESTAMP`);

export const deletedAtCol = () => text('deleted_at');

export const boolIntCol = (name: string, defaultValue = false) =>

  integer(name, { mode: 'boolean' }).notNull().default(defaultValue);

export const intCol = (name: string, defaultValue?: number) => {

  const col = integer(name);

  return defaultValue === undefined ? col : col.notNull().default(defaultValue);

};

export const textJsonCol = (name: string) => text(name);

export const errorCodeCol = () => text('latest_error_code');

export const errorMessageCol = () => text('latest_error_message');

/**

 * 统一业务状态默认值：draft

 */

export const bizStatusCol = () => text('status').notNull().default('draft');

/**

 * 通用步骤状态默认值：pending

 */

export const stepStatusCol = (name: string) => text(name).notNull().default('pending');

---

# 三、`src/db/schema/projects.ts`

Ts

import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createdAtCol, idCol, updatedAtCol } from './common';

export const projects = sqliteTable(

  'projects',

  {

    id: idCol(),

    name: text('name').notNull(),

    description: text('description'),

    category: text('category'),

    coverAssetId: text('cover_asset_id'),

    status: text('status').notNull().default('active'),

    defaultVoiceId: text('default_voice_id'),

    ownerId: text('owner_id'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxProjectsStatus: index('idx_projects_status').on(table.status),

    idxProjectsCreatedAt: index('idx_projects_created_at').on(table.createdAt),

    idxProjectsCategory: index('idx_projects_category').on(table.category),

  }),

);

export const productions = sqliteTable(

  'productions',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    mode: text('mode').notNull(), // talking_head | remix | drama

    name: text('name').notNull(),

    description: text('description'),

    status: text('status').notNull().default('active'),

    configSnapshot: text('config_snapshot'),

    templateIds: text('template_ids'), // JSON string[]

    defaultVoiceId: text('default_voice_id'),

    ownerId: text('owner_id'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxProductionsProjectMode: index('idx_productions_project_mode').on(

      table.projectId,

      table.mode,

    ),

    idxProductionsProjectCreatedAt: index('idx_productions_project_created_at').on(

      table.projectId,

      table.createdAt,

    ),

    idxProductionsStatus: index('idx_productions_status').on(table.status),

  }),

);

---

# 四、`src/db/schema/assets.ts`

Ts

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createdAtCol, deletedAtCol, idCol, updatedAtCol } from './common';

export const assets = sqliteTable(

  'assets',

  {

    id: idCol(),

    projectId: text('project_id'),

    productionId: text('production_id'),

    type: text('type').notNull(), // image | video | audio | subtitle | template | document

    sourceType: text('source_type').notNull(), // upload | generated | imported | extracted | system

    sourceProvider: text('source_provider'),

    originJobId: text('origin_job_id'),

    title: text('title'),

    mimeType: text('mime_type').notNull(),

    sizeBytes: integer('size_bytes').notNull().default(0),

    checksum: text('checksum'),

    localPath: text('local_path').notNull(),

    previewUrl: text('preview_url'),

    thumbnailUrl: text('thumbnail_url'),

    width: integer('width'),

    height: integer('height'),

    durationMs: integer('duration_ms'),

    fps: integer('fps'),

    sampleRate: integer('sample_rate'),

    channels: integer('channels'),

    status: text('status').notNull().default('active'), // active | soft_deleted | missing | archived

    versionNo: integer('version_no').notNull().default(1),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

    deletedAt: deletedAtCol(),

  },

  (table) => ({

    idxAssetsProjectTypeStatus: index('idx_assets_project_type_status').on(

      table.projectId,

      table.type,

      table.status,

    ),

    idxAssetsOriginJob: index('idx_assets_origin_job').on(table.originJobId),

    idxAssetsStatusCreatedAt: index('idx_assets_status_created_at').on(

      table.status,

      table.createdAt,

    ),

    idxAssetsChecksum: index('idx_assets_checksum').on(table.checksum),

  }),

);

export const assetReferences = sqliteTable(

  'asset_references',

  {

    id: idCol(),

    assetId: text('asset_id').notNull(),

    refType: text('ref_type').notNull(), // talking_head_task | episode | storyboard | ...

    refId: text('ref_id').notNull(),

    refField: text('ref_field').notNull(), // final_video_asset_id / selected_image_asset_id ...

    isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(true),

    createdAt: createdAtCol(),

  },

  (table) => ({

    idxAssetRefsAsset: index('idx_asset_refs_asset').on(table.assetId),

    idxAssetRefsRef: index('idx_asset_refs_ref').on(table.refType, table.refId),

    idxAssetRefsRefField: index('idx_asset_refs_ref_field').on(

      table.refType,

      table.refId,

      table.refField,

    ),

  }),

);

---

# 五、`src/db/schema/configs.ts`

Ts

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createdAtCol, idCol, updatedAtCol } from './common';

export const aiServiceConfigs = sqliteTable(

  'ai_service_configs',

  {

    id: idCol(),

    name: text('name').notNull(),

    serviceType: text('service_type').notNull(), // text | image | video | audio | asr

    provider: text('provider').notNull(),

    model: text('model'),

    apiBase: text('api_base'),

    apiKeyEncrypted: text('api_key_encrypted'),

    configPayload: text('config_payload'),

    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

    priority: integer('priority').notNull().default(100),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxAiServiceTypeActivePriority: index('idx_ai_service_type_active_priority').on(

      table.serviceType,

      table.isActive,

      table.priority,

    ),

    idxAiProvider: index('idx_ai_provider').on(table.provider),

  }),

);

export const agentConfigs = sqliteTable(

  'agent_configs',

  {

    id: idCol(),

    agentType: text('agent_type').notNull(),

    name: text('name').notNull(),

    description: text('description'),

    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),

    modelConfigId: text('model_config_id'),

    promptTemplate: text('prompt_template'),

    toolConfig: text('tool_config'),

    extraConfig: text('extra_config'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxAgentTypeEnabled: index('idx_agent_type_enabled').on(table.agentType, table.enabled),

  }),

);

export const aiVoices = sqliteTable(

  'ai_voices',

  {

    id: idCol(),

    provider: text('provider').notNull(),

    providerVoiceId: text('provider_voice_id').notNull(),

    name: text('name').notNull(),

    gender: text('gender'),

    language: text('language'),

    style: text('style'),

    previewAssetId: text('preview_asset_id'),

    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

    sortOrder: integer('sort_order').notNull().default(100),

    extraPayload: text('extra_payload'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxVoicesProvider: index('idx_ai_voices_provider').on(table.provider),

    idxVoicesActiveSort: index('idx_ai_voices_active_sort').on(table.isActive, table.sortOrder),

    idxVoicesLanguage: index('idx_ai_voices_language').on(table.language),

  }),

);

export const templates = sqliteTable(

  'templates',

  {

    id: idCol(),

    type: text('type').notNull(), // talking_head_config | remix_config | drama_config | subtitle_style ...

    name: text('name').notNull(),

    description: text('description'),

    payload: text('payload').notNull(),

    versionNo: integer('version_no').notNull().default(1),

    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxTemplatesTypeActive: index('idx_templates_type_active').on(table.type, table.isActive),

    idxTemplatesTypeName: index('idx_templates_type_name').on(table.type, table.name),

  }),

);

---

# 六、`src/db/schema/talking-head.ts`

Ts

import { index, sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

import {

  createdAtCol,

  errorCodeCol,

  errorMessageCol,

  idCol,

  stepStatusCol,

  updatedAtCol,

} from './common';

export const talkingHeadTasks = sqliteTable(

  'talking_head_tasks',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    productionId: text('production_id').notNull(),

    title: text('title').notNull(),

    originalContent: text('original_content').notNull(),

    optimizedContent: text('optimized_content'),

    voiceId: text('voice_id'),

    audioAssetId: text('audio_asset_id'),

    subtitleAssetId: text('subtitle_asset_id'),

    previewVideoAssetId: text('preview_video_asset_id'),

    finalVideoAssetId: text('final_video_asset_id'),

    status: text('status').notNull().default('draft'),

    contentStatus: stepStatusCol('content_status'),

    optimizeStatus: stepStatusCol('optimize_status'),

    ttsStatus: stepStatusCol('tts_status'),

    imageStatus: stepStatusCol('image_status'),

    subtitleStatus: stepStatusCol('subtitle_status'),

    composeStatus: stepStatusCol('compose_status'),

    exportStatus: stepStatusCol('export_status'),

    configSnapshot: text('config_snapshot').notNull(),

    currentJobId: text('current_job_id'),

    latestErrorCode: errorCodeCol(),

    latestErrorMessage: errorMessageCol(),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxTalkingHeadProdStatusCreated: index('idx_talking_head_prod_status_created').on(

      table.productionId,

      table.status,

      table.createdAt,

    ),

    idxTalkingHeadProjectCreated: index('idx_talking_head_project_created').on(

      table.projectId,

      table.createdAt,

    ),

    idxTalkingHeadCurrentJob: index('idx_talking_head_current_job').on(table.currentJobId),

  }),

);

export const contentSegments = sqliteTable(

  'content_segments',

  {

    id: idCol(),

    taskId: text('task_id').notNull(),

    seq: integer('seq').notNull(),

    text: text('text').notNull(),

    optimizedText: text('optimized_text'),

    startMs: integer('start_ms'),

    endMs: integer('end_ms'),

    imageAssetId: text('image_asset_id'),

    visualItems: text('visual_items'), // JSON VisualItem[]

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxContentSegmentsTaskSeq: index('idx_content_segments_task_seq').on(table.taskId, table.seq),

    idxContentSegmentsImage: index('idx_content_segments_image').on(table.imageAssetId),

  }),

);

export const talkingHeadExports = sqliteTable(

  'talking_head_exports',

  {

    id: idCol(),

    taskId: text('task_id').notNull(),

    assetId: text('asset_id').notNull(),

    exportType: text('export_type').notNull(), // preview | final

    jobId: text('job_id'),

    createdAt: createdAtCol(),

  },

  (table) => ({

    idxTalkingHeadExportsTask: index('idx_talking_head_exports_task').on(table.taskId),

    idxTalkingHeadExportsJob: index('idx_talking_head_exports_job').on(table.jobId),

  }),

);

---

# 七、`src/db/schema/remix.ts`

Ts

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {

  createdAtCol,

  errorCodeCol,

  errorMessageCol,

  idCol,

  stepStatusCol,

  updatedAtCol,

} from './common';

export const sourceMaterials = sqliteTable(

  'source_materials',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    productionId: text('production_id').notNull(),

    assetId: text('asset_id').notNull(),

    title: text('title').notNull(),

    importType: text('import_type').notNull(), // upload | url

    sourceUrl: text('source_url'),

    durationMs: integer('duration_ms'),

    width: integer('width'),

    height: integer('height'),

    fps: integer('fps'),

    audioTracks: integer('audio_tracks'),

    status: text('status').notNull().default('pending'), // pending | ready | failed

    latestErrorCode: errorCodeCol(),

    latestErrorMessage: errorMessageCol(),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxSourceMaterialsProdStatus: index('idx_source_materials_prod_status').on(

      table.productionId,

      table.status,

    ),

    idxSourceMaterialsProjectCreated: index('idx_source_materials_project_created').on(

      table.projectId,

      table.createdAt,

    ),

  }),

);

export const clips = sqliteTable(

  'clips',

  {

    id: idCol(),

    sourceMaterialId: text('source_material_id').notNull(),

    versionNo: integer('version_no').notNull().default(1),

    startMs: integer('start_ms').notNull(),

    endMs: integer('end_ms').notNull(),

    summary: text('summary'),

    tagsJson: text('tags_json'),

    score: integer('score'),

    transcript: text('transcript'),

    confidence: integer('confidence'),

    splitMethod: text('split_method').notNull(), // scene | asr | semantic | manual

    manualAdjusted: integer('manual_adjusted', { mode: 'boolean' }).notNull().default(false),

    previewAssetId: text('preview_asset_id'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxClipsSourceVersion: index('idx_clips_source_version').on(table.sourceMaterialId, table.versionNo),

    idxClipsSourceStart: index('idx_clips_source_start').on(table.sourceMaterialId, table.startMs),

    idxClipsPreviewAsset: index('idx_clips_preview_asset').on(table.previewAssetId),

  }),

);

export const remixTasks = sqliteTable(

  'remix_tasks',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    productionId: text('production_id').notNull(),

    title: text('title').notNull(),

    description: text('description'),

    narrationScript: text('narration_script'),

    voiceId: text('voice_id'),

    audioAssetId: text('audio_asset_id'),

    subtitleAssetId: text('subtitle_asset_id'),

    previewVideoAssetId: text('preview_video_asset_id'),

    finalVideoAssetId: text('final_video_asset_id'),

    status: text('status').notNull().default('draft'),

    materialStatus: stepStatusCol('material_status'),

    splitStatus: stepStatusCol('split_status'),

    sequenceStatus: stepStatusCol('sequence_status'),

    scriptStatus: stepStatusCol('script_status'),

    ttsStatus: stepStatusCol('tts_status'),

    subtitleStatus: stepStatusCol('subtitle_status'),

    composeStatus: stepStatusCol('compose_status'),

    exportStatus: stepStatusCol('export_status'),

    configSnapshot: text('config_snapshot').notNull(),

    currentJobId: text('current_job_id'),

    latestErrorCode: errorCodeCol(),

    latestErrorMessage: errorMessageCol(),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxRemixTasksProdStatusCreated: index('idx_remix_tasks_prod_status_created').on(

      table.productionId,

      table.status,

      table.createdAt,

    ),

    idxRemixTasksCurrentJob: index('idx_remix_tasks_current_job').on(table.currentJobId),

  }),

);

export const remixTaskMaterials = sqliteTable(

  'remix_task_materials',

  {

    id: idCol(),

    remixTaskId: text('remix_task_id').notNull(),

    sourceMaterialId: text('source_material_id').notNull(),

    createdAt: createdAtCol(),

  },

  (table) => ({

    uqRemixTaskMaterial: uniqueIndex('uq_remix_task_material').on(

      table.remixTaskId,

      table.sourceMaterialId,

    ),

    idxRemixTaskMaterialsTask: index('idx_remix_task_materials_task').on(table.remixTaskId),

  }),

);

export const clipSequenceItems = sqliteTable(

  'clip_sequence_items',

  {

    id: idCol(),

    remixTaskId: text('remix_task_id').notNull(),

    clipId: text('clip_id').notNull(),

    seq: integer('seq').notNull(),

    sourceMaterialId: text('source_material_id').notNull(),

    trimInMs: integer('trim_in_ms'),

    trimOutMs: integer('trim_out_ms'),

    playbackRate: integer('playback_rate'), // 建议存 *100，如 100=1.0, 125=1.25

    keepOriginalAudio: integer('keep_original_audio', { mode: 'boolean' }).notNull().default(false),

    muteOriginalAudio: integer('mute_original_audio', { mode: 'boolean' }).notNull().default(false),

    transitionAfter: text('transition_after'), // fade | cut | slide | none

    overlaySubtitleMode: text('overlay_subtitle_mode'), // none | burn | external

    notes: text('notes'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxClipSequenceTaskSeq: index('idx_clip_sequence_task_seq').on(table.remixTaskId, table.seq),

    idxClipSequenceClip: index('idx_clip_sequence_clip').on(table.clipId),

  }),

);

---

# 八、`src/db/schema/drama.ts`

Ts

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {

  createdAtCol,

  errorCodeCol,

  errorMessageCol,

  idCol,

  stepStatusCol,

  updatedAtCol,

} from './common';

export const episodes = sqliteTable(

  'episodes',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    productionId: text('production_id').notNull(),

    episodeNo: integer('episode_no').notNull(),

    title: text('title').notNull(),

    content: text('content').notNull(),

    scriptContent: text('script_content'),

    finalVideoAssetId: text('final_video_asset_id'),

    status: text('status').notNull().default('draft'),

    sourceStatus: stepStatusCol('source_status'),

    rewriteStatus: stepStatusCol('rewrite_status'),

    extractStatus: stepStatusCol('extract_status'),

    voiceAssignStatus: stepStatusCol('voice_assign_status'),

    storyboardStatus: stepStatusCol('storyboard_status'),

    characterImageStatus: stepStatusCol('character_image_status'),

    sceneImageStatus: stepStatusCol('scene_image_status'),

    frameImageStatus: stepStatusCol('frame_image_status'),

    videoGenerateStatus: stepStatusCol('video_generate_status'),

    composeStatus: stepStatusCol('compose_status'),

    mergeStatus: stepStatusCol('merge_status'),

    exportStatus: stepStatusCol('export_status'),

    waitingReviewStep: text('waiting_review_step'),

    currentJobId: text('current_job_id'),

    configSnapshot: text('config_snapshot').notNull(),

    latestErrorCode: errorCodeCol(),

    latestErrorMessage: errorMessageCol(),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    uqEpisodesProdEpisodeNo: uniqueIndex('uq_episodes_prod_episode_no').on(

      table.productionId,

      table.episodeNo,

    ),

    idxEpisodesProdStatusCreated: index('idx_episodes_prod_status_created').on(

      table.productionId,

      table.status,

      table.createdAt,

    ),

    idxEpisodesCurrentJob: index('idx_episodes_current_job').on(table.currentJobId),

  }),

);

export const characters = sqliteTable(

  'characters',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    name: text('name').notNull(),

    description: text('description'),

    gender: text('gender'),

    ageDesc: text('age_desc'),

    personality: text('personality'),

    appearancePrompt: text('appearance_prompt'),

    voiceId: text('voice_id'),

    imageAssetId: text('image_asset_id'),

    extraPayload: text('extra_payload'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxCharactersProjectName: index('idx_characters_project_name').on(table.projectId, table.name),

    idxCharactersVoice: index('idx_characters_voice').on(table.voiceId),

  }),

);

export const scenes = sqliteTable(

  'scenes',

  {

    id: idCol(),

    projectId: text('project_id').notNull(),

    name: text('name').notNull(),

    locationDesc: text('location_desc'),

    timeDesc: text('time_desc'),

    styleDesc: text('style_desc'),

    imageAssetId: text('image_asset_id'),

    extraPayload: text('extra_payload'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxScenesProjectName: index('idx_scenes_project_name').on(table.projectId, table.name),

  }),

);

export const episodeCharacters = sqliteTable(

  'episode_characters',

  {

    id: idCol(),

    episodeId: text('episode_id').notNull(),

    characterId: text('character_id').notNull(),

    createdAt: createdAtCol(),

  },

  (table) => ({

    uqEpisodeCharacters: uniqueIndex('uq_episode_characters').on(

      table.episodeId,

      table.characterId,

    ),

    idxEpisodeCharactersEpisode: index('idx_episode_characters_episode').on(table.episodeId),

  }),

);

export const episodeScenes = sqliteTable(

  'episode_scenes',

  {

    id: idCol(),

    episodeId: text('episode_id').notNull(),

    sceneId: text('scene_id').notNull(),

    createdAt: createdAtCol(),

  },

  (table) => ({

    uqEpisodeScenes: uniqueIndex('uq_episode_scenes').on(table.episodeId, table.sceneId),

    idxEpisodeScenesEpisode: index('idx_episode_scenes_episode').on(table.episodeId),

  }),

);

export const storyboards = sqliteTable(

  'storyboards',

  {

    id: idCol(),

    episodeId: text('episode_id').notNull(),

    seq: integer('seq').notNull(),

    title: text('title'),

    shotType: text('shot_type'),

    visualDesc: text('visual_desc').notNull(),

    dialogue: text('dialogue'),

    actionDesc: text('action_desc'),

    durationSec: integer('duration_sec'),

    sceneId: text('scene_id'),

    promptText: text('prompt_text'),

    selectedImageAssetId: text('selected_image_asset_id'),

    selectedVideoAssetId: text('selected_video_asset_id'),

    composedVideoAssetId: text('composed_video_asset_id'),

    imageCandidateAssetIds: text('image_candidate_asset_ids'),

    videoCandidateAssetIds: text('video_candidate_asset_ids'),

    status: text('status').notNull().default('draft'), // draft | ready | processing | completed | failed

    latestErrorCode: errorCodeCol(),

    latestErrorMessage: errorMessageCol(),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxStoryboardsEpisodeSeq: index('idx_storyboards_episode_seq').on(table.episodeId, table.seq),

    idxStoryboardsEpisodeStatus: index('idx_storyboards_episode_status').on(

      table.episodeId,

      table.status,

    ),

  }),

);

export const storyboardCharacters = sqliteTable(

  'storyboard_characters',

  {

    id: idCol(),

    storyboardId: text('storyboard_id').notNull(),

    characterId: text('character_id').notNull(),

    createdAt: createdAtCol(),

  },

  (table) => ({

    uqStoryboardCharacters: uniqueIndex('uq_storyboard_characters').on(

      table.storyboardId,

      table.characterId,

    ),

    idxStoryboardCharactersStoryboard: index('idx_storyboard_characters_storyboard').on(

      table.storyboardId,

    ),

  }),

);

export const imageGenerations = sqliteTable(

  'image_generations',

  {

    id: idCol(),

    projectId: text('project_id'),

    episodeId: text('episode_id'),

    storyboardId: text('storyboard_id'),

    targetType: text('target_type').notNull(), // character | scene | frame

    targetId: text('target_id'),

    promptText: text('prompt_text'),

    provider: text('provider'),

    model: text('model'),

    jobId: text('job_id'),

    assetId: text('asset_id'),

    status: text('status').notNull().default('queued'),

    errorCode: text('error_code'),

    errorMessage: text('error_message'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxImageGenStoryboard: index('idx_image_generations_storyboard').on(table.storyboardId),

    idxImageGenJob: index('idx_image_generations_job').on(table.jobId),

    idxImageGenTarget: index('idx_image_generations_target').on(table.targetType, table.targetId),

  }),

);

export const videoGenerations = sqliteTable(

  'video_generations',

  {

    id: idCol(),

    projectId: text('project_id'),

    episodeId: text('episode_id'),

    storyboardId: text('storyboard_id'),

    promptText: text('prompt_text'),

    provider: text('provider'),

    model: text('model'),

    sourceImageAssetId: text('source_image_asset_id'),

    jobId: text('job_id'),

    assetId: text('asset_id'),

    status: text('status').notNull().default('queued'),

    errorCode: text('error_code'),

    errorMessage: text('error_message'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxVideoGenStoryboard: index('idx_video_generations_storyboard').on(table.storyboardId),

    idxVideoGenJob: index('idx_video_generations_job').on(table.jobId),

  }),

);

export const videoMerges = sqliteTable(

  'video_merges',

  {

    id: idCol(),

    episodeId: text('episode_id').notNull(),

    jobId: text('job_id'),

    assetId: text('asset_id').notNull(),

    mergeScope: text('merge_scope').notNull(), // shot | episode

    createdAt: createdAtCol(),

  },

  (table) => ({

    idxVideoMergesEpisode: index('idx_video_merges_episode').on(table.episodeId),

    idxVideoMergesJob: index('idx_video_merges_job').on(table.jobId),

  }),

);

---

# 九、`src/db/schema/jobs.ts`

Ts

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { createdAtCol, idCol, updatedAtCol } from './common';

export const jobs = sqliteTable(

  'jobs',

  {

    id: idCol(),

    projectId: text('project_id'),

    productionId: text('production_id'),

    bizType: text('biz_type').notNull(), // talking_head_task | remix_task | episode | storyboard | asset_import

    bizId: text('biz_id').notNull(),

    runType: text('run_type').notNull(), // pipeline | tts | compose | merge ...

    triggerSource: text('trigger_source').notNull(), // user | system | openclaw | retry

    status: text('status').notNull().default('queued'),

    currentStep: text('current_step'),

    idempotencyKey: text('idempotency_key'),

    retryCount: integer('retry_count').notNull().default(0),

    priority: integer('priority').notNull().default(100),

    parentBatchId: text('parent_batch_id'),

    createdBy: text('created_by'),

    errorCode: text('error_code'),

    errorMessage: text('error_message'),

    cancelRequested: integer('cancel_requested', { mode: 'boolean' }).notNull().default(false),

    createdAt: createdAtCol(),

    startedAt: text('started_at'),

    finishedAt: text('finished_at'),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxJobsStatusPriorityCreated: index('idx_jobs_status_priority_created').on(

      table.status,

      table.priority,

      table.createdAt,

    ),

    idxJobsBizCreated: index('idx_jobs_biz_created').on(

      table.bizType,

      table.bizId,

      table.createdAt,

    ),

    idxJobsBatch: index('idx_jobs_batch').on(table.parentBatchId),

    idxJobsProjectStatus: index('idx_jobs_project_status').on(table.projectId, table.status),

    idxJobsIdem: index('idx_jobs_idem').on(

      table.idempotencyKey,

      table.bizType,

      table.bizId,

      table.runType,

    ),

  }),

);

export const jobSteps = sqliteTable(

  'job_steps',

  {

    id: idCol(),

    jobId: text('job_id').notNull(),

    stepCode: text('step_code').notNull(),

    stepName: text('step_name').notNull(),

    stepOrder: integer('step_order').notNull(),

    required: integer('required', { mode: 'boolean' }).notNull().default(true),

    status: text('status').notNull().default('pending'),

    executionState: text('execution_state').notNull().default('normal'),

    providerName: text('provider_name'),

    providerTaskId: text('provider_task_id'),

    inputSnapshot: text('input_snapshot'),

    outputSnapshot: text('output_snapshot'),

    errorCode: text('error_code'),

    errorMessage: text('error_message'),

    retryCount: integer('retry_count').notNull().default(0),

    startedAt: text('started_at'),

    finishedAt: text('finished_at'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    uqJobStepsJobStepCode: uniqueIndex('uq_job_steps_job_step_code').on(

      table.jobId,

      table.stepCode,

    ),

    uqJobStepsJobStepOrder: uniqueIndex('uq_job_steps_job_step_order').on(

      table.jobId,

      table.stepOrder,

    ),

    idxJobStepsJobOrder: index('idx_job_steps_job_order').on(table.jobId, table.stepOrder),

    idxJobStepsProviderTask: index('idx_job_steps_provider_task').on(table.providerTaskId),

    idxJobStepsStatusExec: index('idx_job_steps_status_exec').on(

      table.status,

      table.executionState,

    ),

  }),

);

export const jobEvents = sqliteTable(

  'job_events',

  {

    id: idCol(),

    jobId: text('job_id').notNull(),

    stepId: text('step_id'),

    eventType: text('event_type').notNull(),

    payload: text('payload'),

    createdAt: createdAtCol(),

  },

  (table) => ({

    idxJobEventsJobCreated: index('idx_job_events_job_created').on(table.jobId, table.createdAt),

    idxJobEventsStep: index('idx_job_events_step').on(table.stepId),

    idxJobEventsType: index('idx_job_events_type').on(table.eventType),

  }),

);

export const batchRuns = sqliteTable(

  'batch_runs',

  {

    id: idCol(),

    bizType: text('biz_type').notNull(),

    productionId: text('production_id'),

    totalCount: integer('total_count').notNull().default(0),

    submittedCount: integer('submitted_count').notNull().default(0),

    runningCount: integer('running_count').notNull().default(0),

    successCount: integer('success_count').notNull().default(0),

    failedCount: integer('failed_count').notNull().default(0),

    cancelledCount: integer('cancelled_count').notNull().default(0),

    pausedReason: text('paused_reason'),

    status: text('status').notNull().default('queued'), // queued | running | paused_by_system | paused_by_user | completed | cancelled

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxBatchRunsProductionStatus: index('idx_batch_runs_production_status').on(

      table.productionId,

      table.status,

    ),

  }),

);

---

# 十、`src/db/schema/openclaw.ts`

Ts

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createdAtCol, idCol, updatedAtCol } from './common';

export const apiKeys = sqliteTable(

  'api_keys',

  {

    id: idCol(),

    name: text('name').notNull(),

    keyPrefix: text('key_prefix').notNull(),

    keyHash: text('key_hash').notNull(),

    status: text('status').notNull().default('active'), // active | revoked | disabled

    dailyQuota: integer('daily_quota').notNull().default(500),

    perMinuteLimit: integer('per_minute_limit').notNull().default(60),

    lastUsedAt: text('last_used_at'),

    expiresAt: text('expires_at'),

    createdAt: createdAtCol(),

    updatedAt: updatedAtCol(),

  },

  (table) => ({

    idxApiKeysStatus: index('idx_api_keys_status').on(table.status),

    idxApiKeysPrefix: index('idx_api_keys_prefix').on(table.keyPrefix),

  }),

);

export const apiCallLogs = sqliteTable(

  'api_call_logs',

  {

    id: idCol(),

    apiKeyId: text('api_key_id'),

    requestId: text('request_id').notNull(),

    skillName: text('skill_name'),

    path: text('path').notNull(),

    method: text('method').notNull(),

    bizType: text('biz_type'),

    bizId: text('biz_id'),

    jobId: text('job_id'),

    statusCode: integer('status_code').notNull(),

    success: integer('success', { mode: 'boolean' }).notNull().default(false),

    durationMs: integer('duration_ms'),

    errorCode: text('error_code'),

    requestPayload: text('request_payload'),

    responsePayload: text('response_payload'),

    clientIp: text('client_ip'),

    createdAt: createdAtCol(),

  },

  (table) => ({

    idxApiCallLogsApiKeyCreated: index('idx_api_call_logs_api_key_created').on(

      table.apiKeyId,

      table.createdAt,

    ),

    idxApiCallLogsRequestId: index('idx_api_call_logs_request_id').on(table.requestId),

    idxApiCallLogsJob: index('idx_api_call_logs_job').on(table.jobId),

    idxApiCallLogsSkill: index('idx_api_call_logs_skill').on(table.skillName),

  }),

);

---

# 十一、`src/db/schema/audit.ts`

Ts

import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createdAtCol, idCol } from './common';

export const auditLogs = sqliteTable(

  'audit_logs',

  {

    id: idCol(),

    actorType: text('actor_type').notNull(), // user | system | openclaw

    actorId: text('actor_id'),

    action: text('action').notNull(),

    targetType: text('target_type').notNull(),

    targetId: text('target_id').notNull(),

    details: text('details'),

    createdAt: createdAtCol(),

  },

  (table) => ({

    idxAuditLogsTarget: index('idx_audit_logs_target').on(table.targetType, table.targetId),

    idxAuditLogsAction: index('idx_audit_logs_action').on(table.action),

    idxAuditLogsActor: index('idx_audit_logs_actor').on(table.actorType, table.actorId),

    idxAuditLogsCreated: index('idx_audit_logs_created').on(table.createdAt),

  }),

);

---

# 十二、`src/db/schema/text-versions.ts`

Ts

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { createdAtCol, idCol } from './common';

export const textVersions = sqliteTable(

  'text_versions',

  {

    id: idCol(),

    bizType: text('biz_type').notNull(),

    bizId: text('biz_id').notNull(),

    fieldName: text('field_name').notNull(),

    versionNo: integer('version_no').notNull(),

    content: text('content').notNull(),

    sourceType: text('source_type').notNull(), // manual | agent | system | rollback

    createdBy: text('created_by'),

    createdAt: createdAtCol(),

  },

  (table) => ({

    uqTextVersionsBizFieldVer: uniqueIndex('uq_text_versions_biz_field_ver').on(

      table.bizType,

      table.bizId,

      table.fieldName,

      table.versionNo,

    ),

    idxTextVersionsBizField: index('idx_text_versions_biz_field').on(

      table.bizType,

      table.bizId,

      table.fieldName,

    ),

  }),

);

---

# 十三、`src/db/schema/index.ts`

Ts

export * from './projects';

export * from './assets';

export * from './configs';

export * from './talking-head';

export * from './remix';

export * from './drama';

export * from './jobs';

export * from './openclaw';

export * from './audit';

export * from './text-versions';

---

# 十四、建议补充的 `src/db/client.ts`

Ts

import Database from 'better-sqlite3';

import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || './data/app.db');

// 建议启用 WAL

sqlite.pragma('journal_mode = WAL');

sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export { sqlite };

---

# 十五、建议首版 migration 执行顺序

为了减少建表依赖冲突，建议 migration 顺序如下：

## 第一批：公共底座

1. `projects`
2. `productions`
3. `assets`
4. `asset_references`
5. `ai_service_configs`
6. `agent_configs`
7. `ai_voices`
8. `templates`

## 第二批：任务中心

9. `jobs`
10. `job_steps`
11. `job_events`
12. `batch_runs`

## 第三批：图文口播

13. `talking_head_tasks`
14. `content_segments`
15. `talking_head_exports`

## 第四批：混剪二创

16. `source_materials`
17. `clips`
18. `remix_tasks`
19. `remix_task_materials`
20. `clip_sequence_items`

## 第五批：AI 短剧

21. `episodes`
22. `characters`
23. `scenes`
24. `episode_characters`
25. `episode_scenes`
26. `storyboards`
27. `storyboard_characters`
28. `image_generations`
29. `video_generations`
30. `video_merges`

## 第六批：OpenClaw / 审计 / 历史

31. `api_keys`
32. `api_call_logs`
33. `audit_logs`
34. `text_versions`

---

# 十六、首版建模注意事项

## 16.1 `updated_at` 自动更新

SQLite 不会像某些 ORM 那样天然自动更新时间。  
建议在 Service 层统一维护 `updatedAt = new Date().toISOString()`。

## 16.2 `CURRENT_TIMESTAMP` 格式

SQLite 默认 `CURRENT_TIMESTAMP` 是 UTC 字符串，但格式可能与应用层 ISO 稍有不同。  
若团队要求严格统一，可：

- 不使用 DB 默认值
- 全部在应用层写入 `new Date().toISOString()`

## 16.3 JSON 字段

如：

- `config_snapshot`
- `visual_items`
- `payload`
- `input_snapshot`
- `output_snapshot`

建议统一封装两个工具：

Ts

export function safeJsonParse<T>(value?: string | null): T | null {

  if (!value) return null;

  try {

    return JSON.parse(value) as T;

  } catch {

    return null;

  }

}

export function safeJsonStringify(value: unknown): string {

  return JSON.stringify(value ?? null);

}

## 16.4 浮点数问题

SQLite 没有严格 decimal 类型。  
像 `playback_rate`、`speech_rate` 这类字段：

- 可以存 `real`
- 或更稳妥地存整数倍率，如 `125 = 1.25`

当前稿里 `playback_rate` 用整数，建议在业务层约定换算。

## 16.5 外键策略

首版为了开发效率，可以：

- 不在所有表上强打数据库级外键
- 由应用层确保引用正确
- 对关键删除路径做引用检查

如果团队更偏稳健，也可以给核心表逐步补外键。

---

# 十七、推荐下一步立即补的内容

基于这份 schema，最建议立刻继续产出的工程文件有 4 个：

1. **relations 文件**
    
    - Drizzle relations 定义
    - 便于联表查询
2. **类型与枚举常量文件**
    
    - 避免业务代码手写字符串
    - 如 `JOB_STATUS`, `BIZ_STATUS`, `STEP_STATUS`
3. **Repository / DAO 层初稿**
    
    - `createJob`
    - `createPipelineSteps`
    - `getJobWithSteps`
    - `updateBizStatus`
    - `appendJobEvent`
4. **首版 migration 文件**
    
    - 可直接执行 `drizzle-kit generate`

---

# 十八、结论

这份《Drizzle 实际 schema 文件初稿（可直接建表）》已经满足以下目标：

- 能直接进入项目作为首版 schema
- 能支撑 Project / Production / Asset 公共底座
- 能支撑图文口播、混剪、AI 短剧三大模式
- 能支撑 Job / JobStep / JobEvent 状态机执行体系
- 能支撑 OpenClaw 调用日志、API Key、审计、文本版本化

如果研发现在要开工，这份已经可以作为 **建表起点**。