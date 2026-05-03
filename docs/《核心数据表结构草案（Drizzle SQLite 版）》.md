# 《核心数据表结构草案（Drizzle / SQLite 版）》

- **文档名称**：燃启短视频综合创作平台《核心数据表结构草案（Drizzle / SQLite 版）》
- **适用主文档**：`PRD v2.1.1`
- **关联附件**：`《任务中心与状态机详细设计附件》`
- **版本号**：v2.1.1-d1
- **文档性质**：数据结构草案 / 后端建模前置稿
- **目标读者**：后端、全栈、测试、技术负责人
- **目标**：给出可直接进入 Drizzle ORM 建模与 SQLite 落表设计讨论的核心表结构草案

---

# 目录

1. 文档目标与设计边界
2. 设计原则
3. 命名规范与通用字段约定
4. 枚举值约定
5. 公共基础表
6. 图文口播模块表
7. 混剪二创模块表
8. AI 短剧模块表
9. 任务中心相关表
10. OpenClaw 与审计相关表
11. 文本版本化相关表
12. 索引与约束建议
13. Drizzle Schema 草案示例
14. 迁移与演进建议

---

# 1. 文档目标与设计边界

## 1.1 目标

本文档用于明确 v2.1.1 的核心数据表结构草案，覆盖：

- 公共基础对象
- 三大业务模块主表
- 任务中心表
- OpenClaw 调用与 API Key 表
- 审计日志与文本版本化表
- 关键索引、约束、Drizzle 写法建议

目标不是一次性给出最终 DDL，而是提供：

1. 研发可落表的基础 schema
2. 前后端可统一字段语义
3. 测试可据此设计数据用例
4. 后续可平滑迁移 PostgreSQL 的建模方向

---

## 1.2 本文档不展开内容

以下内容不在本文档展开：

- 完整 SQL migration 文件
- 每个字段的最终长度与默认值细节争论
- 所有外键约束的数据库级强制实现细节
- 全量历史表与归档表
- 搜索引擎、对象存储等外部系统数据结构

---

# 2. 设计原则

## 2.1 SQLite 优先、兼容 PostgreSQL 迁移

当前使用 SQLite，但建模时需避免未来迁移困难：

1. 主键统一使用文本型 ID
2. 枚举先用 `text` + 代码约束
3. JSON 数据统一用 `text` 存储，应用层序列化
4. 时间统一使用 ISO 字符串或 epoch ms，建议统一 ISO 字符串
5. 尽量不依赖 SQLite 独占特性做核心业务约束

---

## 2.2 显式状态字段优先

为了支持状态机、测试和页面聚合：

- 业务主状态保留在业务主表
- 关键步骤状态显式展开在业务主表
- Job / JobStep 另有独立状态

不依赖“只查 Job 聚合得出状态”。

---

## 2.3 产物资产化原则

所有重要输入/输出产物都应进入 `assets`：

- 上传文件
- 生成图片
- 生成音频
- 字幕文件
- 预览视频
- 最终导出视频

业务表上保留当前采用资产 ID，详细来源关系进入 `asset_references`。

---

## 2.4 快照与版本保留原则

1. 配置快照以 JSON 文本形式落在业务对象或 JobStep 中
2. 文本型可编辑结果通过 `text_versions` 记录历史
3. 候选结果不覆盖正式采用结果

---

## 2.5 首版不过度范式化

为降低实现复杂度：

- 一些高频聚合状态保留在主表冗余
- 不把所有行为拆成极度细碎的子表
- 对复杂版本树与候选树，仅保留最小必要结构

---

# 3. 命名规范与通用字段约定

## 3.1 表命名

- 统一使用 **snake_case 复数表名**
- 例如：
    - `projects`
    - `productions`
    - `talking_head_tasks`
    - `job_steps`

## 3.2 主键命名

- 主键统一为 `id`
- 类型统一为 `text`
- 应用层生成，如：
    - `proj_xxx`
    - `prod_xxx`
    - `job_xxx`

## 3.3 外键命名

- 统一使用 `{target}_id`
- 例如：
    - `project_id`
    - `production_id`
    - `job_id`

## 3.4 时间字段

所有核心表建议统一保留：

- `created_at`
- `updated_at`

必要时增加：

- `deleted_at`
- `started_at`
- `finished_at`
- `last_run_at`

类型：`text`，存 ISO 时间字符串。

## 3.5 JSON 字段

在 SQLite 下统一用 `text` 存储 JSON 序列化结果。  
命名建议：

- `config_snapshot`
- `input_snapshot`
- `output_snapshot`
- `payload`
- `details`

---

# 4. 枚举值约定

> 以下在 Drizzle 中先使用 `text()`，并通过 TS 类型与应用层校验约束。

## 4.1 通用业务状态

Ts

type BizStatus =

  | 'draft'

  | 'ready'

  | 'processing'

  | 'partial_ready'

  | 'blocked'

  | 'completed'

  | 'failed'

  | 'archived';

## 4.2 通用步骤状态

Ts

type StepStatus =

  | 'pending'

  | 'queued'

  | 'running'

  | 'succeeded'

  | 'failed'

  | 'skipped'

  | 'cancelled'

  | 'stale';

## 4.3 Job 状态

Ts

type JobStatus =

  | 'queued'

  | 'running'

  | 'partial_success'

  | 'success'

  | 'failed'

  | 'cancelled';

## 4.4 JobStep 执行附加状态

Ts

type ExecutionState =

  | 'normal'

  | 'waiting_review'

  | 'waiting_callback'

  | 'waiting_polling';

## 4.5 Production 模式

Ts

type ProductionMode = 'talking_head' | 'remix' | 'drama';

## 4.6 Asset 类型

Ts

type AssetType =

  | 'image'

  | 'video'

  | 'audio'

  | 'subtitle'

  | 'template'

  | 'document';

## 4.7 Asset 状态

Ts

type AssetStatus = 'active' | 'soft_deleted' | 'missing' | 'archived';

---

# 5. 公共基础表

---

## 5.1 projects

Ts

projects

- id

- name

- description

- category

- cover_asset_id

- status                 // active | archived

- default_voice_id

- owner_id

- created_at

- updated_at

### 字段说明

|字段|类型|说明|
|---|---|---|
|id|text PK|项目 ID|
|name|text|项目名|
|description|text nullable|描述|
|category|text nullable|项目分类，如“知识矩阵”“短剧”|
|cover_asset_id|text nullable|封面图资产|
|status|text|`active / archived`|
|default_voice_id|text nullable|默认音色|
|owner_id|text nullable|负责人|
|created_at|text|创建时间|
|updated_at|text|更新时间|

---

## 5.2 productions

Ts

productions

- id

- project_id

- mode

- name

- description

- status                 // active | archived

- config_snapshot        // json text

- template_ids           // json text

- default_voice_id

- owner_id

- created_at

- updated_at

---

## 5.3 assets

Ts

assets

- id

- project_id

- production_id

- type

- source_type

- source_provider

- origin_job_id

- title

- mime_type

- size_bytes

- checksum

- local_path

- preview_url

- thumbnail_url

- width

- height

- duration_ms

- fps

- sample_rate

- channels

- status

- version_no

- created_at

- updated_at

- deleted_at

### 关键说明

- `local_path`：统一存储抽象层下的相对路径或逻辑路径
- `preview_url`：供前端访问
- `origin_job_id`：追溯产出来源
- `status = missing` 表示 DB 有记录、文件缺失

---

## 5.4 asset_references

Ts

asset_references

- id

- asset_id

- ref_type

- ref_id

- ref_field

- is_current

- created_at

### 用途

记录资产被哪些对象引用，例如：

- `talking_head_task.final_video_asset_id`
- `storyboard.selected_image_asset_id`
- `episode.final_video_asset_id`

### 字段说明

|字段|说明|
|---|---|
|ref_type|引用对象类型|
|ref_id|引用对象 ID|
|ref_field|引用字段名|
|is_current|是否当前采用版本|

---

## 5.5 ai_service_configs

Ts

ai_service_configs

- id

- name

- service_type          // text | image | video | audio | asr

- provider

- model

- api_base

- api_key_encrypted

- config_payload        // json text

- is_active

- priority

- created_at

- updated_at

---

## 5.6 agent_configs

Ts

agent_configs

- id

- agent_type

- name

- description

- enabled

- model_config_id

- prompt_template

- tool_config            // json text

- extra_config           // json text

- created_at

- updated_at

---

## 5.7 ai_voices

Ts

ai_voices

- id

- provider

- provider_voice_id

- name

- gender

- language

- style

- preview_asset_id

- is_active

- sort_order

- extra_payload          // json text

- created_at

- updated_at

---

## 5.8 templates

Ts

templates

- id

- type

- name

- description

- payload                // json text

- version_no

- is_active

- created_at

- updated_at

---

# 6. 图文口播模块表

---

## 6.1 talking_head_tasks

Ts

talking_head_tasks

- id

- project_id

- production_id

- title

- original_content

- optimized_content

- voice_id

- audio_asset_id

- subtitle_asset_id

- preview_video_asset_id

- final_video_asset_id

- status

- content_status

- optimize_status

- tts_status

- image_status

- subtitle_status

- compose_status

- export_status

- config_snapshot         // json text

- current_job_id

- latest_error_code

- latest_error_message

- created_at

- updated_at

### 关键说明

- `content_status` 对应内容准备/分段
- `optimize_status` 对应文案优化
- `compose_status` 主要指正式合成
- `preview_video_asset_id` 与 `final_video_asset_id` 分离

---

## 6.2 content_segments

Ts

content_segments

- id

- task_id

- seq

- text

- optimized_text

- start_ms

- end_ms

- image_asset_id

- visual_items            // json text

- created_at

- updated_at

### 说明

- `visual_items` 用 JSON 存储多个视觉单元
- `start_ms/end_ms` 对应字幕或配音时间切片

---

## 6.3 talking_head_exports（可选）

若希望记录每次正式导出的历史，可增加：

Ts

talking_head_exports

- id

- task_id

- asset_id

- export_type            // preview | final

- job_id

- created_at

> 若首版简化，也可仅靠 `assets + asset_references` 追踪。

---

# 7. 混剪二创模块表

---

## 7.1 source_materials

Ts

source_materials

- id

- project_id

- production_id

- asset_id

- title

- import_type            // upload | url

- source_url

- duration_ms

- width

- height

- fps

- audio_tracks

- status                 // pending | ready | failed

- latest_error_code

- latest_error_message

- created_at

- updated_at

---

## 7.2 clips

Ts

clips

- id

- source_material_id

- version_no

- start_ms

- end_ms

- summary

- tags_json

- score

- transcript

- confidence

- split_method

- manual_adjusted

- preview_asset_id

- created_at

- updated_at

### 说明

- `tags_json`：字符串数组 JSON
- 同一素材多次拆条，通过 `version_no` 区分

---

## 7.3 remix_tasks

Ts

remix_tasks

- id

- project_id

- production_id

- title

- description

- narration_script

- voice_id

- audio_asset_id

- subtitle_asset_id

- preview_video_asset_id

- final_video_asset_id

- status

- material_status

- split_status

- sequence_status

- script_status

- tts_status

- subtitle_status

- compose_status

- export_status

- config_snapshot         // json text

- current_job_id

- latest_error_code

- latest_error_message

- created_at

- updated_at

---

## 7.4 remix_task_materials

因为一个 remix_task 可关联多个 source_material，建议单独做关联表：

Ts

remix_task_materials

- id

- remix_task_id

- source_material_id

- created_at

---

## 7.5 clip_sequence_items

Ts

clip_sequence_items

- id

- remix_task_id

- clip_id

- seq

- source_material_id

- trim_in_ms

- trim_out_ms

- playback_rate

- keep_original_audio

- mute_original_audio

- transition_after

- overlay_subtitle_mode

- notes

- created_at

- updated_at

### 约束建议

- `keep_original_audio = true` 时，不允许 `mute_original_audio = true`
- 该约束可先放应用层校验

---

# 8. AI 短剧模块表

---

## 8.1 episodes

Ts

episodes

- id

- project_id

- production_id

- episode_no

- title

- content

- script_content

- final_video_asset_id

- status

- source_status

- rewrite_status

- extract_status

- voice_assign_status

- storyboard_status

- character_image_status

- scene_image_status

- frame_image_status

- video_generate_status

- compose_status

- merge_status

- export_status

- waiting_review_step

- current_job_id

- config_snapshot          // json text

- latest_error_code

- latest_error_message

- created_at

- updated_at

---

## 8.2 characters

Ts

characters

- id

- project_id

- name

- description

- gender

- age_desc

- personality

- appearance_prompt

- voice_id

- image_asset_id

- extra_payload            // json text

- created_at

- updated_at

---

## 8.3 scenes

Ts

scenes

- id

- project_id

- name

- location_desc

- time_desc

- style_desc

- image_asset_id

- extra_payload            // json text

- created_at

- updated_at

---

## 8.4 episode_characters

Ts

episode_characters

- id

- episode_id

- character_id

- created_at

---

## 8.5 episode_scenes

Ts

episode_scenes

- id

- episode_id

- scene_id

- created_at

---

## 8.6 storyboards

Ts

storyboards

- id

- episode_id

- seq

- title

- shot_type

- visual_desc

- dialogue

- action_desc

- duration_sec

- scene_id

- prompt_text

- selected_image_asset_id

- selected_video_asset_id

- composed_video_asset_id

- image_candidate_asset_ids   // json text

- video_candidate_asset_ids   // json text

- status

- latest_error_code

- latest_error_message

- created_at

- updated_at

---

## 8.7 storyboard_characters

因为一个 storyboard 对应多个角色，建议独立关联表：

Ts

storyboard_characters

- id

- storyboard_id

- character_id

- created_at

---

## 8.8 image_generations（建议）

若希望跟踪生成记录与候选版本，建议建表：

Ts

image_generations

- id

- project_id

- episode_id

- storyboard_id

- target_type              // character | scene | frame

- target_id

- prompt_text

- provider

- model

- job_id

- asset_id

- status                   // queued | running | success | failed

- error_code

- error_message

- created_at

- updated_at

---

## 8.9 video_generations（建议）

Ts

video_generations

- id

- project_id

- episode_id

- storyboard_id

- prompt_text

- provider

- model

- source_image_asset_id

- job_id

- asset_id

- status

- error_code

- error_message

- created_at

- updated_at

---

## 8.10 video_merges（可选）

Ts

video_merges

- id

- episode_id

- job_id

- asset_id

- merge_scope              // shot | episode

- created_at

---

# 9. 任务中心相关表

---

## 9.1 jobs

Ts

jobs

- id

- project_id

- production_id

- biz_type

- biz_id

- run_type

- trigger_source

- status

- current_step

- idempotency_key

- retry_count

- priority

- parent_batch_id

- created_by

- error_code

- error_message

- created_at

- started_at

- finished_at

- updated_at

### 关键索引建议

- `(status, priority, created_at)`
- `(biz_type, biz_id, created_at desc)`
- `(idempotency_key, biz_type, biz_id, run_type)`

---

## 9.2 job_steps

Ts

job_steps

- id

- job_id

- step_code

- step_name

- step_order

- required

- status

- execution_state

- provider_name

- provider_task_id

- input_snapshot

- output_snapshot

- error_code

- error_message

- retry_count

- started_at

- finished_at

- created_at

- updated_at

### 约束建议

- 同一 `job_id + step_code` 唯一
- 同一 `job_id + step_order` 唯一

---

## 9.3 job_events

Ts

job_events

- id

- job_id

- step_id

- event_type

- payload

- created_at

---

## 9.4 batch_runs（建议）

Ts

batch_runs

- id

- biz_type

- production_id

- total_count

- submitted_count

- running_count

- success_count

- failed_count

- cancelled_count

- paused_reason

- status

- created_at

- updated_at

> 若首版不建表，可后置；但如果要做批量汇总页，建议尽早建立。

---

# 10. OpenClaw 与审计相关表

---

## 10.1 api_keys

Ts

api_keys

- id

- name

- key_prefix

- key_hash

- status                 // active | revoked | disabled

- daily_quota

- per_minute_limit

- last_used_at

- expires_at

- created_at

- updated_at

### 说明

- 不存明文 key
- `key_prefix` 用于 UI 展示
- `key_hash` 用于校验

---

## 10.2 api_call_logs

Ts

api_call_logs

- id

- api_key_id

- request_id

- skill_name

- path

- method

- biz_type

- biz_id

- job_id

- status_code

- success

- duration_ms

- error_code

- request_payload

- response_payload

- client_ip

- created_at

---

## 10.3 audit_logs

Ts

audit_logs

- id

- actor_type              // user | system | openclaw

- actor_id

- action

- target_type

- target_id

- details

- created_at

### 典型 action

- `project.create`
- `task.run`
- `job.cancel`
- `review.approve`
- `review.reject`
- `asset.delete`
- `api_key.revoke`

---

# 11. 文本版本化相关表

---

## 11.1 text_versions

为降低表数量，首版建议统一一张历史文本表。

Ts

text_versions

- id

- biz_type

- biz_id

- field_name

- version_no

- content

- source_type            // manual | agent | system | rollback

- created_by

- created_at

### 使用示例

|biz_type|biz_id|field_name|
|---|---|---|
|`talking_head_task`|`th_xxx`|`optimized_content`|
|`remix_task`|`rm_xxx`|`narration_script`|
|`episode`|`ep_xxx`|`script_content`|
|`asset`|`asset_xxx`|`subtitle_text`|

### 规则

- `(biz_type, biz_id, field_name, version_no)` 唯一
- 回滚时生成新版本，`source_type = rollback`

---

# 12. 索引与约束建议

---

## 12.1 通用索引建议

### projects

- `status`
- `created_at desc`

### productions

- `(project_id, mode)`
- `(project_id, created_at desc)`

### assets

- `(project_id, type, status)`
- `(origin_job_id)`
- `(status, created_at desc)`

### talking_head_tasks

- `(production_id, status, created_at desc)`
- `(current_job_id)`

### remix_tasks

- `(production_id, status, created_at desc)`

### episodes

- `(production_id, episode_no)`
- `(production_id, status, created_at desc)`
- `(current_job_id)`

### storyboards

- `(episode_id, seq)`
- `(episode_id, status)`

### jobs

- `(status, priority, created_at)`
- `(biz_type, biz_id, created_at desc)`
- `(parent_batch_id)`

### job_steps

- `(job_id, step_order)`
- `(provider_task_id)`
- `(status, execution_state)`

### api_call_logs

- `(api_key_id, created_at desc)`
- `(request_id)`
- `(job_id)`

### text_versions

- `(biz_type, biz_id, field_name, version_no desc)`

---

## 12.2 唯一约束建议

|表|约束|
|---|---|
|`job_steps`|`(job_id, step_code)` unique|
|`job_steps`|`(job_id, step_order)` unique|
|`episode_characters`|`(episode_id, character_id)` unique|
|`episode_scenes`|`(episode_id, scene_id)` unique|
|`storyboard_characters`|`(storyboard_id, character_id)` unique|
|`text_versions`|`(biz_type, biz_id, field_name, version_no)` unique|

---

## 12.3 应用层校验建议

以下约束更适合放应用层：

1. `keep_original_audio` 与 `mute_original_audio` 不同时为 true
2. `trim_in_ms < trim_out_ms`
3. `episode_no` 在同一 production 下不重复
4. `waiting_review_step` 必须是该模块允许的 step_code
5. Job 重试时步骤复制规则正确
6. `Asset.status = soft_deleted` 时不能被新引用

---

# 13. Drizzle Schema 草案示例

> 以下为示意性写法，不代表最终全部字段已穷举。  
> 重点是给出建模方式。

---

## 13.1 通用辅助

Ts

import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

};

---

## 13.2 projects

Ts

export const projects = sqliteTable('projects', {

  id: text('id').primaryKey(),

  name: text('name').notNull(),

  description: text('description'),

  category: text('category'),

  coverAssetId: text('cover_asset_id'),

  status: text('status').notNull().default('active'),

  defaultVoiceId: text('default_voice_id'),

  ownerId: text('owner_id'),

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

}, (table) => ({

  statusIdx: index('idx_projects_status').on(table.status),

}));

---

## 13.3 productions

Ts

export const productions = sqliteTable('productions', {

  id: text('id').primaryKey(),

  projectId: text('project_id').notNull(),

  mode: text('mode').notNull(),

  name: text('name').notNull(),

  description: text('description'),

  status: text('status').notNull().default('active'),

  configSnapshot: text('config_snapshot'),

  templateIds: text('template_ids'),

  defaultVoiceId: text('default_voice_id'),

  ownerId: text('owner_id'),

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

}, (table) => ({

  projectModeIdx: index('idx_productions_project_mode').on(table.projectId, table.mode),

}));

---

## 13.4 assets

Ts

export const assets = sqliteTable('assets', {

  id: text('id').primaryKey(),

  projectId: text('project_id'),

  productionId: text('production_id'),

  type: text('type').notNull(),

  sourceType: text('source_type').notNull(),

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

  status: text('status').notNull().default('active'),

  versionNo: integer('version_no').notNull().default(1),

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

  deletedAt: text('deleted_at'),

}, (table) => ({

  projectTypeStatusIdx: index('idx_assets_project_type_status').on(table.projectId, table.type, table.status),

  originJobIdx: index('idx_assets_origin_job').on(table.originJobId),

}));

---

## 13.5 talking_head_tasks

Ts

export const talkingHeadTasks = sqliteTable('talking_head_tasks', {

  id: text('id').primaryKey(),

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

  contentStatus: text('content_status').notNull().default('pending'),

  optimizeStatus: text('optimize_status').notNull().default('pending'),

  ttsStatus: text('tts_status').notNull().default('pending'),

  imageStatus: text('image_status').notNull().default('pending'),

  subtitleStatus: text('subtitle_status').notNull().default('pending'),

  composeStatus: text('compose_status').notNull().default('pending'),

  exportStatus: text('export_status').notNull().default('pending'),

  configSnapshot: text('config_snapshot').notNull(),

  currentJobId: text('current_job_id'),

  latestErrorCode: text('latest_error_code'),

  latestErrorMessage: text('latest_error_message'),

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

}, (table) => ({

  productionStatusIdx: index('idx_talking_head_tasks_prod_status').on(table.productionId, table.status, table.createdAt),

}));

---

## 13.6 episodes

Ts

export const episodes = sqliteTable('episodes', {

  id: text('id').primaryKey(),

  projectId: text('project_id').notNull(),

  productionId: text('production_id').notNull(),

  episodeNo: integer('episode_no').notNull(),

  title: text('title').notNull(),

  content: text('content').notNull(),

  scriptContent: text('script_content'),

  finalVideoAssetId: text('final_video_asset_id'),

  status: text('status').notNull().default('draft'),

  sourceStatus: text('source_status').notNull().default('pending'),

  rewriteStatus: text('rewrite_status').notNull().default('pending'),

  extractStatus: text('extract_status').notNull().default('pending'),

  voiceAssignStatus: text('voice_assign_status').notNull().default('pending'),

  storyboardStatus: text('storyboard_status').notNull().default('pending'),

  characterImageStatus: text('character_image_status').notNull().default('pending'),

  sceneImageStatus: text('scene_image_status').notNull().default('pending'),

  frameImageStatus: text('frame_image_status').notNull().default('pending'),

  videoGenerateStatus: text('video_generate_status').notNull().default('pending'),

  composeStatus: text('compose_status').notNull().default('pending'),

  mergeStatus: text('merge_status').notNull().default('pending'),

  exportStatus: text('export_status').notNull().default('pending'),

  waitingReviewStep: text('waiting_review_step'),

  currentJobId: text('current_job_id'),

  configSnapshot: text('config_snapshot').notNull(),

  latestErrorCode: text('latest_error_code'),

  latestErrorMessage: text('latest_error_message'),

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

}, (table) => ({

  prodEpisodeNoUq: uniqueIndex('uq_episodes_prod_episode_no').on(table.productionId, table.episodeNo),

  prodStatusIdx: index('idx_episodes_prod_status').on(table.productionId, table.status, table.createdAt),

}));

---

## 13.7 jobs

Ts

export const jobs = sqliteTable('jobs', {

  id: text('id').primaryKey(),

  projectId: text('project_id'),

  productionId: text('production_id'),

  bizType: text('biz_type').notNull(),

  bizId: text('biz_id').notNull(),

  runType: text('run_type').notNull(),

  triggerSource: text('trigger_source').notNull(),

  status: text('status').notNull().default('queued'),

  currentStep: text('current_step'),

  idempotencyKey: text('idempotency_key'),

  retryCount: integer('retry_count').notNull().default(0),

  priority: integer('priority').notNull().default(100),

  parentBatchId: text('parent_batch_id'),

  createdBy: text('created_by'),

  errorCode: text('error_code'),

  errorMessage: text('error_message'),

  createdAt: text('created_at').notNull(),

  startedAt: text('started_at'),

  finishedAt: text('finished_at'),

  updatedAt: text('updated_at').notNull(),

}, (table) => ({

  queueScanIdx: index('idx_jobs_status_priority_created').on(table.status, table.priority, table.createdAt),

  bizIdx: index('idx_jobs_biz_created').on(table.bizType, table.bizId, table.createdAt),

  idemIdx: index('idx_jobs_idem').on(table.idempotencyKey, table.bizType, table.bizId, table.runType),

}));

---

## 13.8 job_steps

Ts

export const jobSteps = sqliteTable('job_steps', {

  id: text('id').primaryKey(),

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

  createdAt: text('created_at').notNull(),

  updatedAt: text('updated_at').notNull(),

}, (table) => ({

  jobStepCodeUq: uniqueIndex('uq_job_steps_job_step_code').on(table.jobId, table.stepCode),

  jobStepOrderUq: uniqueIndex('uq_job_steps_job_step_order').on(table.jobId, table.stepOrder),

  providerTaskIdx: index('idx_job_steps_provider_task').on(table.providerTaskId),

}));

---

## 13.9 text_versions

Ts

export const textVersions = sqliteTable('text_versions', {

  id: text('id').primaryKey(),

  bizType: text('biz_type').notNull(),

  bizId: text('biz_id').notNull(),

  fieldName: text('field_name').notNull(),

  versionNo: integer('version_no').notNull(),

  content: text('content').notNull(),

  sourceType: text('source_type').notNull(),

  createdBy: text('created_by'),

  createdAt: text('created_at').notNull(),

}, (table) => ({

  versionUq: uniqueIndex('uq_text_versions_biz_field_ver')

    .on(table.bizType, table.bizId, table.fieldName, table.versionNo),

  bizFieldIdx: index('idx_text_versions_biz_field').on(table.bizType, table.bizId, table.fieldName),

}));

---

# 14. 迁移与演进建议

## 14.1 首版最小必须表

如果以最快可落地为目标，建议第一批先落以下表：

### 公共

- `projects`
- `productions`
- `assets`
- `asset_references`
- `ai_service_configs`
- `agent_configs`
- `ai_voices`
- `templates`

### 图文口播

- `talking_head_tasks`
- `content_segments`

### AI 短剧

- `episodes`
- `characters`
- `scenes`
- `episode_characters`
- `episode_scenes`
- `storyboards`
- `storyboard_characters`

### 任务中心

- `jobs`
- `job_steps`
- `job_events`

### 集成与审计

- `api_keys`
- `api_call_logs`
- `audit_logs`

### 版本化

- `text_versions`

---

## 14.2 第二批建议表

在基础流程跑通后再补：

- `source_materials`
- `clips`
- `remix_tasks`
- `remix_task_materials`
- `clip_sequence_items`
- `image_generations`
- `video_generations`
- `batch_runs`

---

## 14.3 不建议首版过早细化的表

可先不做过细拆分：

1. 每一步独立结果表
2. 通用多态评论/审核流表
3. 复杂模板版本树
4. Provider 调用明细拆多张子表
5. 通用全文搜索倒排结构

---

## 14.4 PostgreSQL 迁移注意事项

未来迁移 PG 时建议：

1. `text JSON` 字段迁移为 `jsonb`
2. 补齐数据库级 enum 或 check constraint
3. 增加真正外键约束
4. 对 `jobs/job_steps/job_events` 增加分区或归档策略
5. 对 `api_call_logs/audit_logs` 做冷热分层

---

# 结论

本《核心数据表结构草案（Drizzle / SQLite 版）》给出了 v2.1.1 首版实现所需的核心数据建模基础，重点保证四件事：

1. **统一底座可落地**：Project / Production / Asset / Template / Voice / Config 闭环
2. **三大业务模式可承载**：图文口播、混剪二创、AI 短剧都有明确主表
3. **任务中心可执行**：Job / JobStep / JobEvent 支撑状态机、恢复、重试、回调
4. **可追溯可版本化**：资产引用、API 调用、审计日志、文本版本历史全部有落点