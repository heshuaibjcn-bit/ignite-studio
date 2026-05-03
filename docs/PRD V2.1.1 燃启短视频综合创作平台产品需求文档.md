# 

- **产品名称**：燃启短视频综合创作平台（RanQi Creative Studio）
- **文档类型**：产品需求文档（PRD）
- **版本号**：v2.1.1
- **文档状态**：正式版（合并实施补充包）
- **发布日期**：2026-05-10
- **适用范围**：产品、设计、前端、后端、AI 工程、测试、运维、实施团队

---

## 目录

1. 文档说明
2. 产品概述
3. 产品定位与愿景
4. 目标用户与使用场景
5. 产品范围与版本边界
6. 产品整体架构
7. 统一业务对象模型
8. 业务模块一：图文口播
9. 业务模块二：混剪二创
10. 业务模块三：AI 短剧
11. 公共能力层
12. 平台级任务中心
13. OpenClaw Skill 规范与集成
14. 智能体工作流编排
15. 信息架构与数据模型
16. API 设计
17. 前端页面与交互设计
18. 技术架构与工程规范
19. 非功能性需求
20. 实施计划与里程碑
21. 风险与应对
22. 验收标准
23. 附录

---

# 1. 文档说明

## 1.1 文档目的

本文档基于现有“火宝短剧项目”v1.0 能力进行产品化扩展，定义“燃启短视频综合创作平台”v2.1.1 的完整产品需求。平台目标是从原有单一的 AI 短剧生产系统，升级为面向多场景短视频批量生产的综合创作平台。

v2.1.1 覆盖以下三类核心创作模式：

|模式|说明|
|---|---|
|图文口播|基于文案内容，通过 AI 配音、配图、字幕和视频合成自动生成口播类短视频|
|混剪二创|基于已有视频素材进行拆条、重组、解说配音、字幕与后期合成|
|AI 短剧|从原始文本/小说/剧本出发，完成 AI 短剧从脚本到成片的全流程生产|

同时，本文档定义平台面向 **OpenClaw** 智能体框架的标准化 Skill 接口规范，使外部智能体可以通过可编程方式调用平台能力，执行自动化视频生产任务。

与 v2.1 相比，v2.1.1 重点补充：

1. 首版交付分层（MUST / SHOULD / COULD / WON'T）
2. 统一状态迁移表
3. 平台级任务调度模型
4. OpenClaw Header、批量协议与等待人工确认约定
5. 核心对象契约补充
6. 批量执行熔断与自动暂停规则
7. 预览资产保留与清理策略
8. 人工确认回退与重生规则
9. 验收测试环境与阈值基线

## 1.2 目标读者

- 产品经理
- 交互/视觉设计师
- 前端开发工程师
- 后端开发工程师
- AI/Agent 工程师
- 测试工程师
- 运维/部署实施人员
- 技术管理者与项目负责人

## 1.3 术语定义

|术语|定义|
|---|---|
|OpenClaw|开源智能体编排框架，可通过 Skill 定义调用外部服务|
|Skill|OpenClaw 中可被智能体调用的最小能力单元，通过 YAML/JSON 描述|
|Agent|执行特定 AI 任务的智能体，如剧本改写、分镜拆解、配图提示生成等|
|Provider|AI 服务提供商，如 OpenAI、MiniMax、Vidu、火山引擎等|
|图文口播|基于文本内容，通过 AI 配音、图片/素材和字幕生成的视频内容形式|
|混剪二创|对已有视频素材进行拆分、重组、解说配音和字幕叠加的二次创作形式|
|AI 短剧|从剧本文本出发，通过 AI 生成角色、场景、镜头图像、镜头视频并最终合成的短剧生产形式|
|分镜 / Storyboard|视频中的最小镜头单元，包含镜头描述、画面、对白与动作信息|
|宫格图|多个关键帧组合成的一张图，用于保持镜头风格一致性|
|Compose|单段、单镜头或单任务级别的视频合成动作|
|Merge|多镜头、多片段或多段视频合并为完整视频的拼接动作|
|TTS|Text-to-Speech，文字转语音|
|ASR|Automatic Speech Recognition，自动语音识别|
|ASS|高级字幕文件格式，用于样式化字幕烧录|
|Project|平台统一业务主题容器，用于组织资产、配置与生产实例|
|Production|项目下的模式级生产实例，表示一次具体创作链路或一组相关任务容器|
|Job|平台级异步任务执行实例，用于承载 AI、下载、合成等长耗时任务|
|Config Snapshot|执行时固化的配置快照，用于保证结果可追溯与复现|
|Stale|因上游数据变更而失效、需要重新生成的步骤状态|
|waiting_review|执行层等待人工确认的暂停状态|

## 1.4 关联文档

- 火宝短剧项目架构分析与 PRD v1.0
- OpenClaw Skill Specification
- FFmpeg 合成参数配置手册
- 平台内部 AI Provider 接入规范
- 平台部署与环境配置说明
- 平台错误码与审计规范
- 平台任务中心详细设计

---

# 2. 产品概述

## 2.1 一句话定义

燃启短视频综合创作平台是一套面向内容团队和智能体自动化场景的 AI 短视频生产中台，支持图文口播、混剪二创、AI 短剧三大生产模式，并提供统一项目管理、素材中心、AI 服务调度、Agent 编排、本地视频合成和可编程调用能力。

## 2.2 产品核心价值

本产品的核心价值体现在以下五个方面：

1. **统一创作工作台**  
    将原本分散在文案、配音、素材管理、剪辑合成等多个工具中的操作集中到统一平台完成。
    
2. **支持批量化内容生产**  
    适配矩阵号、MCN、短剧工作室等需要批量出片的团队，提高生产效率。
    
3. **复用已有 AI 短剧能力**  
    在保留现有 v1.0 短剧生产能力的基础上，扩展到更广泛的短视频场景。
    
4. **可被智能体自动调用**  
    通过 OpenClaw Skill 接口封装全部主要能力，支持“人机协作”和“智能体无人值守生产”两种模式。
    
5. **统一异步执行与结果追踪**  
    通过任务中心将复杂 AI 与媒体处理流程统一任务化、可轮询、可重试、可审计。
    

## 2.3 核心产品能力图

Text

燃启短视频综合创作平台

├── 创作模式层

│   ├── 图文口播

│   │   ├── 文案输入/优化

│   │   ├── TTS 配音

│   │   ├── 智能配图

│   │   ├── 字幕生成

│   │   └── 视频合成与导出

│   ├── 混剪二创

│   │   ├── 素材上传/导入

│   │   ├── 智能拆条

│   │   ├── 片段编排

│   │   ├── 解说文案与配音

│   │   └── 合成导出

│   └── AI 短剧

│       ├── 原始内容录入

│       ├── 剧本改写

│       ├── 角色/场景/分镜

│       ├── 图像/视频生成

│       └── 单镜头与整集合成

├── 公共能力层

│   ├── 项目管理

│   ├── Production 管理

│   ├── 素材中心

│   ├── AI 服务配置

│   ├── Agent 编排

│   ├── 模板中心

│   ├── 音色库

│   ├── FFmpeg 合成引擎

│   └── 状态与任务管理

└── OpenClaw 接口层

    ├── Skill 定义

    ├── API Key 鉴权

    ├── OpenClaw 专用路由

    ├── 调用日志与限流

    └── 异步状态轮询接口

---

# 3. 产品定位与愿景

## 3.1 产品定位

燃启短视频综合创作平台定位为：

- **AI 短视频生产工作台**
- **内容批量生产中台**
- **面向团队内部使用的本地化内容工厂后台**

## 3.2 产品愿景

成为短视频内容团队的“一站式 AI 生产中枢”，同时具备：

1. **人工协作式生产能力**  
    内容团队成员在统一工作台中完成从原始内容到成片的全链路创作。
    
2. **智能体驱动式生产能力**  
    OpenClaw 等智能体框架通过 Skill 编排直接驱动平台完成批量创作任务。
    
3. **统一资产与可追溯生产能力**  
    所有输入、过程产物、配置快照、最终结果均可追踪、可回溯、可复用。
    

## 3.3 当前基础能力

继承自 v1.0 的能力包括：

- 完整的 AI 短剧生产流水线
- 多 Provider 适配能力
- Agent 协作能力
- 本地 FFmpeg 合成能力
- 项目制资源管理方式

## 3.4 本版本扩展目标

|扩展方向|目标说明|
|---|---|
|图文口播|新增文案驱动的轻量级视频生产模式|
|混剪二创|新增素材驱动的视频重组能力|
|统一项目模型|引入 Project + Production 统一模型|
|统一素材中心|各类素材跨模式复用与统一搜索|
|OpenClaw 接入|全平台核心能力可被外部智能体调用|
|标准化 API|内部 API 与 OpenClaw API 共用服务层能力|
|任务中心|提供统一异步任务执行、重试和状态查询机制|

---

# 4. 目标用户与使用场景

## 4.1 用户角色

|角色|主要使用模式|核心诉求|
|---|---|---|
|短视频运营|图文口播|快速批量生成资讯、知识、带货视频|
|二创剪辑师|混剪二创|快速拆解素材并生成新视频|
|短剧制片/导演|AI 短剧|管理项目、把控成片质量|
|编剧/策划|AI 短剧|将原始内容快速转为结构化剧本|
|AI 制作运营|全模式|配置服务、批量触发生成、监控结果|
|后期辅助人员|全模式|检查合成效果、修正字幕并导出|
|OpenClaw 智能体|全模式|自动调用能力并完成工作流|

## 4.2 典型组织类型

- AI 短视频 MCN 机构
- 内容矩阵运营团队
- 资讯/知识类工作室
- 小说转短剧工作室
- AI 内容创业团队
- 自动化内容生产技术团队

## 4.3 典型用户故事

|编号|用户故事|
|---|---|
|US-001|作为短视频运营，我希望粘贴一篇文案后自动生成口播视频，以减少人工剪辑成本|
|US-002|作为短视频运营，我希望批量导入多篇文案并一次性生成多条视频|
|US-003|作为二创剪辑师，我希望上传长视频后自动拆成多个片段，供我快速选择与重组|
|US-004|作为二创剪辑师，我希望为拆出的片段快速生成解说词、字幕和配音，从而提升出片效率|
|US-005|作为短剧制片，我希望在一个项目中管理多集短剧并自动推进生成流程|
|US-006|作为编剧，我希望将小说原文自动改写为符合短剧节奏的剧本|
|US-007|作为 AI 制作运营，我希望按项目配置不同的 AI 服务组合，并保留执行快照|
|US-008|作为后期人员，我希望自动完成镜头合成与整集拼接，并在必要时人工确认关键节点|
|US-009|作为 OpenClaw 智能体，我希望能够创建项目、触发生产任务并获取结果链接|
|US-010|作为 OpenClaw 智能体，我希望查询异步任务状态并在完成后继续下一步工作流|

---

# 5. 产品范围与版本边界

## 5.1 交付分层原则

v2.1.1 将能力拆分为：

- **MUST**：首版上线阻断项，必须交付
- **SHOULD**：建议在 v2.1 同周期交付，但可根据资源后置到 v2.1.x
- **COULD**：有价值增强项，本版不阻断上线
- **WON'T**：明确不纳入 v2.1

## 5.2 MUST 清单

### 平台底座

1. Project / Production 模型
2. 统一 Asset 资产对象
3. Job / JobStep / JobEvent 任务中心基础能力
4. 统一状态查询接口
5. 配置快照机制
6. API Key 基础鉴权
7. 结构化错误返回
8. 基础审计日志

### 图文口播

1. 文案输入 / 批量导入
2. 内容分段
3. TTS 配音
4. 智能配图或手动配图
5. 字幕生成与编辑
6. 草稿预览
7. 正式导出
8. 批量执行与失败项重试

### AI 短剧

1. v1.0 核心流程迁移
2. Episode 工作台可用
3. 关键步骤任务化
4. 图像 / 视频 / 合成产物接入素材中心
5. 至少一个完整 episode 端到端可跑通
6. 人工确认基础能力

### OpenClaw

1. 核心 Skill 集合
2. 异步 `job_id` 返回
3. `get_job` / `get_biz_status`
4. 调用日志记录
5. 基础限流

## 5.3 SHOULD 清单

### 平台

1. 模板管理 UI 基础版
2. 资产引用关系页面展示
3. 批量任务汇总页
4. Provider 级错误统计

### 混剪二创

1. 本地视频上传与 URL 导入
2. 至少一种自动拆条稳定可用
3. 片段筛选与序列编排
4. TTS 解说词
5. 字幕生成
6. 最终导出

> 说明：混剪模块在 v2.1.1 中不作为上线阻断项，但若进入本周期开发，必须严格按基础版收敛。

## 5.4 COULD 清单

1. Skill 管理 CRUD
2. 模板复制 / 版本管理 UI
3. 任务监控看板
4. 预览文件自动转正式
5. 字幕高级样式编辑器
6. Provider 成本估算展示

## 5.5 WON'T 清单

1. 专业级多轨时间轴
2. 分布式任务调度
3. 云对象存储正式切换
4. 完整多租户权限体系
5. 商业版权识别闭环
6. 全量 36 个 Skill 首版一次性交付
7. 短剧全自动高质量无人值守生产

## 5.6 版本边界说明

- 平台优先满足“可批量生产”“可自动化调用”“结果可追踪”
- 复杂剪辑能力保持轻量，不替代专业 NLE 软件
- 混剪模块优先保证“可控拆条、可编排、可导出”
- AI 短剧优先保证“迁移可用、任务化执行、可人工确认”
- 复杂协同、商业化、权限体系作为后续版本演进方向

---

# 6. 产品整体架构

## 6.1 逻辑架构

Text

燃启短视频综合创作平台

├── 创作模式层

│   ├── 图文口播

│   ├── 混剪二创

│   └── AI 短剧

├── 公共能力层

│   ├── Project / Production 管理

│   ├── 素材中心

│   ├── AI 服务配置管理

│   ├── 模板与音色管理

│   ├── Agent 编排引擎

│   ├── FFmpeg 合成引擎

│   ├── 状态与任务管理

│   └── 审计与日志

└── OpenClaw 接口层

    ├── Skill 定义

    ├── API Key 鉴权

    ├── OpenClaw 专用路由

    ├── 调用日志与限流

    └── 状态查询与异步轮询

## 6.2 模式与公共能力的关系

三大业务模式共享以下底层能力：

- 统一 Project / Production 体系
- 统一素材资产管理
- 统一 AI Provider 调用策略
- 统一 Agent Prompt / Skill 注入机制
- 统一音频、字幕、视频合成引擎
- 统一 Job 异步执行机制
- 统一状态查询与审计机制

---

# 7. 统一业务对象模型

## 7.1 顶层对象层级

Text

Workspace（预留，未来多租户容器）

└── Project

    ├── project_category

    ├── Production（mode: talking_head | remix | drama）

    │   ├── config_snapshot

    │   ├── tasks / episodes / storyboards

    │   └── jobs

    ├── Asset（项目级资产）

    ├── TemplateBinding

    └── ConfigBinding

AssetLibrary（全局素材库）

Configuration（AI 服务、Agent、音色、模板、Skill 配置）

## 7.2 核心对象说明

|对象|说明|
|---|---|
|Project|平台统一业务主题容器|
|Production|项目下的模式级生产实例|
|TalkingHeadTask|图文口播任务主对象|
|SourceMaterial|混剪源视频素材|
|Clip|由源素材拆出的可复用片段|
|RemixTask|混剪任务对象，持有片段序列|
|Episode|短剧剧集对象|
|Character / Scene|短剧项目级角色与场景资源|
|Storyboard|短剧最小镜头单元|
|Asset|全局或项目统一资产对象|
|AIServiceConfig|AI 服务提供商配置|
|AgentConfig|Agent 运行配置|
|AIVoice|音色对象|
|Template|配置模板对象|
|Job / JobStep / JobEvent|平台级异步执行与状态追踪对象|

## 7.3 顶层业务规则

1. 所有业务对象必须归属于明确 Project，或归属于全局素材库
2. `Production` 必须绑定明确模式：
    - `talking_head`
    - `remix`
    - `drama`
3. 同一 Project 可包含多个不同模式的 Production
4. 不同模式的数据对象不得直接互写，但可通过统一素材中心复用资产
5. 所有生成产物原则上都应自动沉淀为资产记录
6. 执行时所有关键配置应固化为 `config_snapshot`
7. 同一业务对象允许多次执行，执行实例通过 Job 记录，不直接覆盖历史执行记录

## 7.4 Production 业务定义

`Production` 是**同一模式下的一组相关生产任务容器**：

- 图文口播：通常对应一个批次、一个栏目或一个内容系列
- 混剪二创：通常对应一组素材与一个主题方向
- AI 短剧：通常对应一部剧或一季剧的生产空间

## 7.5 Production 契约

Ts

interface Production {

  id: string;

  project_id: string;

  mode: 'talking_head' | 'remix' | 'drama';

  name: string;

  description?: string;

  status: 'active' | 'archived';

  config_snapshot?: Record<string, any>;

  template_ids?: string[];

  default_voice_id?: string;

  owner_id?: string;

  created_at: string;

  updated_at: string;

}

## 7.6 统一业务状态模型

### 通用业务状态

- `draft`
- `ready`
- `processing`
- `partial_ready`
- `blocked`
- `completed`
- `failed`
- `archived`

### 通用步骤状态

- `pending`
- `queued`
- `running`
- `succeeded`
- `failed`
- `skipped`
- `cancelled`
- `stale`

### Job 状态

- `queued`
- `running`
- `partial_success`
- `success`
- `failed`
- `cancelled`

### 执行暂停状态

- `waiting_review`

## 7.7 通用业务状态迁移规则

|当前状态|触发事件|下一状态|说明|
|---|---|---|---|
|`draft`|必填数据补齐且通过校验|`ready`|可开始执行|
|`draft`|校验失败|`blocked`|如缺配置、缺音色、缺素材|
|`ready`|发起执行|`processing`|创建 Job 后进入|
|`ready`|关键依赖失效|`blocked`|如模板丢失、资产缺失|
|`processing`|执行完成且所有必要步骤成功|`completed`|可导出或已导出|
|`processing`|执行结束，仅部分步骤成功|`partial_ready`|允许人工补齐后继续|
|`processing`|执行失败且无运行中的 Job|`failed`|最近一次执行失败|
|`processing`|用户取消且无可继续步骤|`failed`|业务层不单设 cancelled|
|`partial_ready`|修复缺失项并再次执行|`processing`|重新发起 Job|
|`partial_ready`|必要步骤全部补齐|`completed`|进入完成态|
|`partial_ready`|上游数据失效|`blocked`|无法继续|
|`failed`|手动重试|`processing`|新建 Job|
|`failed`|修复配置但未执行|`ready`|可执行但未运行|
|`blocked`|问题修复且校验通过|`ready`|解除阻断|
|`completed`|上游关键数据变更导致下游失效|`partial_ready`|如字幕修改后需重合成|
|`completed`|用户归档|`archived`|归档后默认只读|
|`archived`|恢复归档|`ready` / `completed`|恢复到归档前最近稳定态|

## 7.8 通用步骤状态迁移规则

|当前状态|触发事件|下一状态|说明|
|---|---|---|---|
|`pending`|被纳入执行计划|`queued`|等待执行|
|`queued`|Worker 开始处理|`running`|运行中|
|`running`|成功完成|`succeeded`|产物可用|
|`running`|执行失败|`failed`|保留错误|
|`running`|用户取消|`cancelled`|当前执行终止|
|`queued`|用户取消|`cancelled`|执行前取消|
|`succeeded`|上游变更导致结果失效|`stale`|需重新生成|
|`failed`|重新排队执行|`queued`|手动重试|
|`cancelled`|重新排队执行|`queued`|允许重新开始|
|`stale`|重新执行|`queued`|再生成|
|`skipped`|条件变化需执行|`queued`|原先跳过步骤转执行|

---

# 8. 业务模块一：图文口播

## 8.1 模块目标

图文口播模块用于支持知识分享、资讯播报、带货讲解、口播宣发等轻量级短视频场景。平台应帮助用户在最少手工干预的前提下，通过文案快速生成可发布的视频内容。

v2.1.1 的重点是：

- 稳定批量出片
- 模板化配置
- 草稿预览与正式导出分离
- 步骤可追踪、失败可重试

## 8.2 业务流程

Text

文案输入

→ 内容分段

→ AI 文案优化（可选）

→ TTS 配音

→ 智能配图 / 手工配图

→ 字幕生成

→ 草稿预览

→ 正式合成

→ 导出

## 8.3 功能需求

### 8.3.1 文案输入与管理

#### 功能描述

系统应支持用户以多种方式录入文案，并形成可编辑任务。

#### 具体需求

1. 支持手动输入文案
2. 支持粘贴长文自动分段
3. 支持导入 TXT、Markdown 文档
4. 支持一次导入多篇文案并批量创建任务
5. 每条文案任务应支持标题、标签和配置模板绑定
6. 用户可手动编辑分段结果
7. 支持对导入文案进行长度校验与异常提示

#### Agent 支持

可选调用 `copywriter_optimizer` Agent 完成：

- 口语化改写
- 节奏优化
- 开头 hook 强化
- 基于目标时长的篇幅压缩/扩展

#### 数据对象

Ts

interface VisualItem {

  id: string;

  type: 'image' | 'video' | 'title_card' | 'color_bg';

  asset_id?: string;

  duration_ms?: number;

  transition?: 'fade' | 'slide' | 'zoom' | 'none';

}

interface ContentSegment {

  id: string;

  task_id: string;

  seq: number;

  text: string;

  optimized_text?: string;

  start_ms?: number;

  end_ms?: number;

  image_asset_id?: string;

  visual_items?: VisualItem[];

  created_at: string;

  updated_at: string;

}

interface TalkingHeadTask {

  id: string;

  project_id: string;

  production_id: string;

  title: string;

  original_content: string;

  optimized_content?: string;

  content_segments: ContentSegment[];

  voice_id?: string;

  audio_asset_id?: string;

  subtitle_asset_id?: string;

  preview_video_asset_id?: string;

  final_video_asset_id?: string;

  status: 'draft' | 'ready' | 'processing' | 'partial_ready' | 'blocked' | 'completed' | 'failed' | 'archived';

  content_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  optimize_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  tts_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  image_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  subtitle_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  compose_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  export_status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled' | 'stale';

  config_snapshot: TalkingHeadConfig;

  current_job_id?: string;

  latest_error_code?: string;

  latest_error_message?: string;

  created_at: string;

  updated_at: string;

}

### 8.3.2 TalkingHeadConfig 契约

Ts

interface TalkingHeadConfig {

  aspect_ratio: '9:16' | '16:9' | '1:1';

  resolution: '720p' | '1080p';

  voice_id?: string;

  speech_rate?: number;

  subtitle_template_id?: string;

  compose_preset_id?: string;

  prompt_style_id?: string;

  image_source_mode: 'ai_generate' | 'asset_match' | 'mixed' | 'manual';

  image_style?: string;

  bgm_asset_id?: string;

  bgm_volume?: number;

  voice_volume?: number;

  enable_preview_watermark?: boolean;

  preview_only?: boolean;

  enable_copy_optimize?: boolean;

  enable_bgm?: boolean;

  transition_mode?: 'fade' | 'slide' | 'zoom' | 'none';

  cover_mode?: 'blur_fill' | 'crop' | 'fit_black';

}

### 8.3.3 TTS 配音

#### 功能描述

系统应支持用户为文案任务生成全文配音，并输出音频文件及时间戳对齐信息。

#### 具体需求

1. 支持从音色库选择音色
2. 支持试听音色
3. 支持全文一键生成配音
4. 支持传入语速、情感等 Provider 允许的参数
5. 返回句级或字级时间戳
6. 自动计算音频总时长
7. 音频存储至固定目录并写入资产表
8. 支持任务级重试，不直接覆盖历史音频资产

#### 业务规则

1. 若任务已指定音色，则优先使用任务音色
2. 若任务未指定音色，则使用 Production 或 Project 默认音色
3. 若均未配置，则返回 `VOICE_NOT_CONFIGURED`
4. 时间戳信息必须供字幕与配图时序复用
5. 无法获取字级时间戳时，允许降级为句级时间戳

### 8.3.4 智能配图

#### 功能描述

系统应根据文案段落为视频自动匹配图片，或允许用户手动选择、替换图片与其他视觉单元。

#### 支持模式

- AI 自动生成图片
- 素材库检索已有图片
- 用户上传图片
- 混合模式

#### Agent 支持

可选调用 `image_matcher` Agent：

- 输入：文案段落、风格要求
- 输出：每段对应的图像提示词或素材检索关键词

#### 业务规则

1. 默认每个分段至少对应一个视觉单元
2. 不强制“一段只配一张图”
3. 自动模式下，图片或视觉单元展示时长按配音时长或段落时长分配
4. 同一任务图片风格应尽可能统一
5. 用户可手动替换任意一段的视觉单元
6. 若图片生成失败，允许手动补图后继续流程

### 8.3.5 字幕生成

#### 功能描述

系统应基于 TTS 时间戳生成可烧录字幕文件。

#### 具体需求

1. 支持 SRT 与 ASS 字幕生成
2. 默认输出 ASS，用于样式化字幕烧录
3. 支持逐字高亮、逐行显示、静态显示
4. 支持手动调整字幕内容与时间轴
5. 字幕文件进入统一资产表
6. 字幕编辑后不覆盖历史版本，应生成新版本

#### 业务规则

1. 若上游文案或音频发生变化，下游字幕状态应置为 `stale`
2. 字幕修改后，合成状态同步置为 `stale`

### 8.3.6 视频合成

#### 功能描述

系统应基于视觉单元序列、TTS 音频、字幕和可选 BGM 合成最终视频。

#### 支持能力

1. 图片缩放与画幅适配
2. 图片动效：
    - Ken Burns
    - Fade
    - Slide
    - Zoom
    - None
3. 字幕烧录
4. BGM 混音
5. 多种输出画幅：
    - 9:16
    - 16:9
    - 1:1
6. 片头片尾模板预留
7. 支持草稿预览与正式导出分离

#### 输出规范

- 格式：MP4
- 视频编码：H.264
- 音频编码：AAC

#### 预览规则

1. 草稿预览默认低码率，可带水印
2. 正式导出生成独立资产，不覆盖预览文件
3. 支持局部预览或整段预览

### 8.3.7 批量生产与导出

#### 功能描述

系统应支持同一 Production 下批量创建和批量执行多个口播任务。

#### 具体需求

1. 批量导入多篇文案
2. 批量共享配置模板
3. 批量执行全流程 Pipeline
4. 支持批量导出本地文件或打包下载
5. 支持仅重试失败项
6. 支持暂停、继续、取消批量执行

## 8.4 流水线节点与完成条件

|步骤|名称|完成条件|
|---|---|---|
|1|文案录入|`original_content` 非空|
|2|内容分段|`content_segments` 数量 ≥ 1|
|3|文案优化|`optimized_content` 非空（可跳过）|
|4|配音生成|`audio_asset_id` 非空|
|5|视觉单元就绪|所有必要 segment 存在可用视觉单元|
|6|字幕生成|`subtitle_asset_id` 非空|
|7|草稿预览|`preview_video_asset_id` 非空（可选）|
|8|正式合成|`final_video_asset_id` 非空|

## 8.5 模块聚合规则

1. `tts_status`、`image_status`、`subtitle_status`、`compose_status` 为必要步骤
2. 若存在运行中 Job，则业务状态为 `processing`
3. 若必要步骤全部 `succeeded`，则状态为 `completed`
4. 若存在 `failed` 且无运行中 Job，则状态为 `failed`
5. 若部分必要步骤成功且可人工修复，则状态为 `partial_ready`

---

# 9. 业务模块二：混剪二创

## 9.1 模块目标

混剪二创模块用于支持影视解说、热点片段重组、带货混剪、宣发剪辑等场景。平台应帮助用户以较低的人工编辑成本完成“素材导入、拆条、筛选、编排、解说、字幕、合成”的轻量化混剪流程。

v2.1.1 的目标是：**可控拆条 + 可编辑编排 + 稳定导出**，不追求完整专业剪辑器能力。

> 版本说明：混剪二创属于 v2.1.1 SHOULD 范围，不作为首版上线阻断项；若进入本周期开发，必须按基础版收敛。

## 9.2 业务流程

Text

素材上传 / URL 导入

→ 元信息提取

→ 智能拆条

→ 片段筛选

→ 编排重组

→ 新文案（可选）

→ 新配音

→ 字幕生成

→ 合成导出

## 9.3 功能需求

### 9.3.1 素材上传与管理

#### 功能描述

支持用户上传本地视频或通过远程 URL 导入源视频。

#### 具体需求

1. 支持 MP4、MOV、AVI、MKV 等常见视频格式
2. 支持粘贴 URL 自动下载
3. 支持批量上传多个源素材
4. 自动提取素材元信息：
    - 时长
    - 分辨率
    - 帧率
    - 音轨信息
5. 自动生成缩略图
6. 自动写入统一素材中心
7. 对 URL 导入失败返回结构化错误

#### 合规提示

1. 用户导入素材前需确认拥有合法使用权
2. 系统需记录导入方式、来源 URL 和操作者
3. v2.1.1 不实现版权识别系统，但需保留审计链路

### 9.3.2 智能拆条

#### 功能描述

系统应将长视频切分为可复用片段，供后续筛选与编排。

#### 拆条模式

1. 场景检测拆条
2. 语音断句拆条
3. 语义级拆条（Agent 辅助）
4. 手动拆条

#### Agent 支持

`clip_analyzer` Agent 可输出：

- 建议拆分点
- 片段摘要
- 标签
- 建议评分

#### 数据对象

Ts

interface SourceMaterial {

  id: string;

  project_id: string;

  production_id: string;

  asset_id: string;

  title: string;

  import_type: 'upload' | 'url';

  source_url?: string;

  duration_ms?: number;

  width?: number;

  height?: number;

  fps?: number;

  audio_tracks?: number;

  status: 'pending' | 'ready' | 'failed';

  latest_error_code?: string;

  latest_error_message?: string;

  created_at: string;

}

interface Clip {

  id: string;

  source_material_id: string;

  version_no: number;

  start_ms: number;

  end_ms: number;

  summary?: string;

  tags?: string[];

  score?: number;

  transcript?: string;

  confidence?: number;

  split_method: 'scene' | 'asr' | 'semantic' | 'manual';

  manual_adjusted: boolean;

  preview_asset_id?: string;

  created_at: string;

}

#### 业务规则

1. 拆条结果默认不覆盖原素材
2. 自动拆条结果默认生成版本 1
3. 用户手动修正后生成新版本，不覆盖原结果
4. 场景检测阈值支持配置，默认 0.3
5. ASR 服务调用应在音频可识别时自动触发
6. 若 ASR 失败，可退化为仅场景检测拆条

### 9.3.3 片段筛选与编排

#### 功能描述

用户应可从片段池中选择片段并组成新的编排序列。

#### 具体需求

1. 缩略图列表展示全部片段
2. 支持按标签、评分、时长筛选
3. 支持跨源素材混合编排
4. 支持拖拽排序
5. 支持单片段预览
6. 支持整体序列预览
7. 支持基础 trim、静音、变速控制
8. 支持简单转场效果选择
9. 不要求实现专业多轨时间轴

#### ClipSequenceItem 契约

Ts

interface ClipSequenceItem {

  id: string;

  clip_id: string;

  seq: number;

  source_material_id: string;

  trim_in_ms?: number;

  trim_out_ms?: number;

  playback_rate?: number;

  keep_original_audio: boolean;

  mute_original_audio: boolean;

  transition_after?: 'fade' | 'cut' | 'slide' | 'none';

  overlay_subtitle_mode?: 'none' | 'burn' | 'external';

  notes?: string;

}

#### 规则

1. `trim_in_ms` / `trim_out_ms` 相对于 clip 的局部区间，而非源素材全局区间
2. `keep_original_audio` 与 `mute_original_audio` 不允许同时为 true
3. `transition_after` 表示该片段结束后到下一片段的转场
4. 首版不支持多轨叠加，仅支持线性片段序列

### 9.3.4 解说文案与配音

#### 功能描述

系统应允许为混剪内容增加新的解说文案，并通过 TTS 生成解说配音。

#### 具体需求

1. 用户可手动输入解说词
2. 可调用 `remix_copywriter` Agent 自动生成解说文案
3. 支持选择音色并生成配音
4. 配音时长应尽可能与编排序列时长匹配
5. 当解说音频与视频时长不一致时，系统应支持：
    - 提示用户调整
    - 自动 padding
    - 通过片段变速适配（可选）

### 9.3.5 字幕生成

#### 功能描述

根据新配音或原音 ASR 结果生成可编辑字幕。

#### 规则

1. 有新配音时，优先使用 TTS 时间戳
2. 保留原音时，可使用 ASR 结果生成字幕
3. 字幕样式支持统一模板配置
4. 用户可手动编辑字幕文本及时间轴
5. 修改字幕后，合成状态需置为 `stale`

### 9.3.6 视频合成

#### 功能描述

系统应基于片段序列完成视频拼接、转场、音频混音和字幕烧录。

#### 支持能力

1. 片段裁剪
2. 片段变速
3. 简单转场效果
4. 保留或静音原声
5. 混入新配音
6. 混入 BGM
7. 字幕烧录
8. 统一输出分辨率

### 9.3.7 导出

#### 功能描述

支持单任务导出和批量导出。

#### 具体需求

1. 导出到本地文件系统
2. 提供下载链接
3. 支持多任务批量导出
4. 导出结果应写入素材中心并可追溯来源素材与片段序列

## 9.4 核心数据对象

### RemixTask 契约

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

interface RemixTask {

  id: string;

  project_id: string;

  production_id: string;

  title: string;

  description?: string;

  source_material_ids: string[];

  clip_sequence: ClipSequenceItem[];

  narration_script?: string;

  voice_id?: string;

  audio_asset_id?: string;

  subtitle_asset_id?: string;

  preview_video_asset_id?: string;

  final_video_asset_id?: string;

  status: 'draft' | 'ready' | 'processing' | 'partial_ready' | 'blocked' | 'completed' | 'failed' | 'archived';

  material_status: StepStatus;

  split_status: StepStatus;

  sequence_status: StepStatus;

  script_status: StepStatus;

  tts_status: StepStatus;

  subtitle_status: StepStatus;

  compose_status: StepStatus;

  export_status: StepStatus;

  config_snapshot: RemixConfig;

  current_job_id?: string;

  latest_error_code?: string;

  latest_error_message?: string;

  created_at: string;

  updated_at: string;

}

### RemixConfig 契约

Ts

interface RemixConfig {

  aspect_ratio: '9:16' | '16:9' | '1:1';

  resolution: '720p' | '1080p';

  subtitle_template_id?: string;

  compose_preset_id?: string;

  voice_id?: string;

  enable_narration?: boolean;

  enable_bgm?: boolean;

  bgm_asset_id?: string;

  output_volume_mode?: 'original' | 'narration_first' | 'bgm_first' | 'balanced';

  split_method: 'scene' | 'asr' | 'semantic' | 'mixed';

  split_threshold?: number;

  default_transition?: 'fade' | 'cut' | 'slide' | 'none';

}

## 9.5 流水线节点与完成条件

|步骤|名称|完成条件|
|---|---|---|
|1|素材上传|至少 1 个 `SourceMaterial` 状态为 `ready`|
|2|智能拆条|至少产生 1 个 `Clip`|
|3|编排序列|`clip_sequence` 非空|
|4|配音生成|`audio_asset_id` 非空（可跳过）|
|5|字幕生成|`subtitle_asset_id` 非空（可跳过）|
|6|视频合成|`final_video_asset_id` 非空|

## 9.6 模块聚合规则

1. `material_status`、`split_status`、`sequence_status`、`compose_status` 为必要步骤
2. `script_status`、`tts_status`、`subtitle_status` 可按配置变为可选步骤
3. 若存在运行中 Job，则业务状态为 `processing`
4. 若必要步骤全部成功，则状态为 `completed`
5. 若部分可选步骤失败但仍可导出，则状态为 `partial_ready` 或 `completed`，以配置和结果完整度为准

---

# 10. 业务模块三：AI 短剧

## 10.1 模块目标

AI 短剧模块是平台的核心旗舰能力，继承自 v1.0 的完整生产链路，并在本版本中纳入统一 Project / Production、素材、任务中心和 OpenClaw 接口体系。

v2.1.1 以“**原有能力平滑迁移 + 核心链路可回归 + 新平台统一管理**”为主，不承诺全流程无人值守达到稳定商用质量。

## 10.2 核心业务流程

Text

创建项目

→ 创建 drama production

→ 创建剧集

→ 录入原始内容

→ AI 改写剧本

→ 提取角色与场景

→ 分配音色

→ 分镜拆解

→ 图像生成

→ 视频生成

→ 单镜头合成

→ 整集拼接导出

## 10.3 标准 11 步流水线

|步骤|名称|Agent|完成条件|
|---|---|---|---|
|1|原始内容录入|-|`episode.content` 非空|
|2|剧本改写|`script_rewriter`|`episode.script_content` 非空|
|3|角色/场景提取|`extractor`|本集关联角色 ≥ 1|
|4|音色分配|`voice_assigner`|有对白角色均已绑定音色|
|5|分镜拆解|`storyboard_breaker`|`storyboards` 数量 ≥ 1|
|6|角色图生成|-|需要形象的角色存在 `image_asset_id`|
|7|场景图生成|-|场景存在 `image_asset_id`|
|8|镜头帧图 / 宫格图|`grid_prompt_generator`|镜头存在 `image_asset_id`|
|9|镜头视频生成|-|镜头存在 `video_asset_id`|
|10|单镜头合成|-|镜头存在 `composed_video_asset_id`|
|11|整集拼接导出|-|剧集存在 `final_video_asset_id`|

## 10.4 核心业务规则

1. Project 是角色与场景的主存储容器
2. 角色按名称去重
3. 场景按地点 + 时间段去重
4. 分镜必须引用当前集已关联的角色与场景
5. 角色对白音色遵循角色音色优先原则
6. 单镜头合成至少依赖镜头视频
7. 整集拼接前必须确保所需镜头已完成合成
8. 新增剧集时，允许继承项目既有配置和风格锁定
9. 每个 storyboard 可存在多个候选图像或视频版本
10. 重生图、重生视频不会覆盖旧结果，应生成新资产版本

## 10.5 人工确认机制

在以下关键节点增加人工确认能力：

1. 剧本改写后
2. 角色形象生成后
3. 场景风格生成后
4. 分镜拆解后
5. 关键镜头视频生成后
6. 整集导出前

### 规则

1. Project 或 Production 可配置“自动继续”或“人工确认后继续”
2. 对高成本视频生成步骤，默认建议人工确认前置结果
3. 人工确认操作需记录审计日志
4. 人工确认的执行暂停态为 `waiting_review`
5. 人工操作支持：
    - `approve`
    - `reject`
    - `regenerate`
6. `reject` 时需指定回退步骤，可填写备注
7. `regenerate` 时产生新的候选产物，不覆盖历史结果
8. OpenClaw 查询到 `waiting_review` 时，应停止自动推进，等待人工完成操作

## 10.6 本版本增强项

|增强项|说明|
|---|---|
|OpenClaw 技能化|核心能力通过 Skill 封装|
|统一素材中心|图像、视频、音频产物自动纳入统一资产体系|
|平台级任务中心|步骤执行可任务化、可查询、可重试|
|多版本产物|镜头图、镜头视频支持多版本候选|
|人工确认|高成本步骤支持人工确认关口|

## 10.7 核心数据对象补充

### Episode 契约

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

interface Episode {

  id: string;

  project_id: string;

  production_id: string;

  episode_no: number;

  title: string;

  content: string;

  script_content?: string;

  final_video_asset_id?: string;

  status: 'draft' | 'ready' | 'processing' | 'partial_ready' | 'blocked' | 'completed' | 'failed' | 'archived';

  source_status: StepStatus;

  rewrite_status: StepStatus;

  extract_status: StepStatus;

  voice_assign_status: StepStatus;

  storyboard_status: StepStatus;

  character_image_status: StepStatus;

  scene_image_status: StepStatus;

  frame_image_status: StepStatus;

  video_generate_status: StepStatus;

  compose_status: StepStatus;

  merge_status: StepStatus;

  export_status: StepStatus;

  waiting_review_step?: string;

  current_job_id?: string;

  config_snapshot: DramaConfig;

  latest_error_code?: string;

  latest_error_message?: string;

  created_at: string;

  updated_at: string;

}

### Storyboard 契约

Ts

interface Storyboard {

  id: string;

  episode_id: string;

  seq: number;

  title?: string;

  shot_type?: string;

  visual_desc: string;

  dialogue?: string;

  action_desc?: string;

  duration_sec?: number;

  character_ids?: string[];

  scene_id?: string;

  prompt_text?: string;

  selected_image_asset_id?: string;

  selected_video_asset_id?: string;

  composed_video_asset_id?: string;

  image_candidate_asset_ids?: string[];

  video_candidate_asset_ids?: string[];

  status: 'draft' | 'ready' | 'processing' | 'completed' | 'failed';

  latest_error_code?: string;

  latest_error_message?: string;

  created_at: string;

  updated_at: string;

}

## 10.8 模块聚合规则

1. `rewrite_status`、`extract_status`、`storyboard_status`、`video_generate_status`、`merge_status` 为关键步骤
2. 若启用人工确认，则 `waiting_review` 不直接映射为失败，而映射为处理中暂停态
3. 若存在运行中 Job 或待确认步骤，则 Episode 业务状态保持 `processing`
4. 若关键步骤全部成功且最终导出完成，则状态为 `completed`

---

# 11. 公共能力层

## 11.1 AI 服务配置管理

### 11.1.1 支持服务类型

|类型|说明|示例 Provider|
|---|---|---|
|text|文本生成 / 推理|OpenAI、OpenRouter、Gemini、ChatFire|
|image|图像生成|MiniMax、OpenAI、Gemini、火山引擎、阿里云|
|video|视频生成|MiniMax、火山引擎、Vidu、阿里云|
|audio|TTS 配音|MiniMax、火山引擎|
|asr|语音识别|阿里云、OpenAI Whisper|

### 11.1.2 配置规则

1. 业务对象若锁定特定 AI 配置，则优先使用锁定配置
2. 未锁定时，选择该类型下 `is_active = true` 且 `priority` 最高的配置
3. 无可用配置时，系统必须阻断任务并返回明确错误
4. 每次执行需将最终生效配置写入 `config_snapshot`

## 11.2 Agent 编排引擎

### 11.2.1 Agent 列表

|Agent|模块|作用|
|---|---|---|
|script_rewriter|AI 短剧|剧本改写|
|extractor|AI 短剧|角色与场景提取|
|storyboard_breaker|AI 短剧|分镜拆解|
|voice_assigner|AI 短剧|音色分配|
|grid_prompt_generator|AI 短剧|宫格提示生成|
|copywriter_optimizer|图文口播|文案优化|
|image_matcher|图文口播|配图提示词生成|
|clip_analyzer|混剪二创|片段语义分析与评分|
|remix_copywriter|混剪二创|解说文案生成|

### 11.2.2 运行机制

1. 读取 `agent_configs`
2. 注入专属工具
3. 加载对应 `data/skills/{agent_type}/` 下的 Skill 内容
4. 组装 System Prompt
5. 调用文本类 AI 服务
6. 执行工具调用并写回结果
7. 写入 JobStep 输出快照与日志

## 11.3 Skills 管理

### 11.3.1 目录结构

Text

data/skills/

  ├── script_rewriter/

  ├── extractor/

  ├── copywriter_optimizer/

  ├── image_matcher/

  ├── clip_analyzer/

  └── remix_copywriter/

### 11.3.2 注入规则

- Agent 启动时扫描其专属目录
- 读取所有子 Skill 目录中的 `SKILL.md`
- 按统一格式拼接注入到 System Prompt

### 11.3.3 CRUD 能力

v2.1.1 支持：

- 查看 Skill 列表
- 查看 Skill 内容
- 基础测试调用

完整 Skill CRUD 能力属于 COULD 范围。

## 11.4 模板管理

### 11.4.1 模板类型

支持以下模板类型：

- `talking_head_config`
- `remix_config`
- `drama_config`
- `subtitle_style`
- `compose_preset`
- `voice_preset`
- `prompt_style`

### 11.4.2 配置优先级

统一采用以下覆盖顺序，越靠后优先级越高：

1. 系统默认模板
2. 全局激活模板
3. Project 绑定模板
4. Production 配置快照
5. 业务对象显式配置
6. 当前执行请求临时覆盖参数

### 11.4.3 快照规则

1. 执行时必须将最终生效配置固化为 `config_snapshot`
2. 模板变更不影响历史执行结果
3. 用户显式点击“同步最新模板”时才更新快照

### 11.4.4 模板 Payload 示例

#### subtitle_style

Json

{

  "font_family": "Alibaba PuHuiTi",

  "font_size": 48,

  "font_color": "#FFFFFF",

  "stroke_color": "#000000",

  "stroke_width": 2,

  "position": "bottom_center",

  "line_spacing": 8,

  "karaoke_mode": true

}

#### compose_preset

Json

{

  "video_codec": "h264",

  "audio_codec": "aac",

  "crf": 23,

  "fps": 25,

  "bitrate_mode": "auto",

  "max_bitrate": "4M"

}

#### voice_preset

Json

{

  "voice_id": "voice_xxx",

  "speech_rate": 1.0,

  "emotion": "neutral",

  "language": "zh-CN"

}

## 11.5 素材中心

### 11.5.1 能力范围

1. 浏览与搜索
2. 上传素材
3. 自动沉淀生成产物
4. 跨模式引用素材
5. 图片、音频、视频、字幕预览
6. 删除记录与生命周期管理
7. 引用关系检查
8. 缺失文件标记

### 11.5.2 素材分类

- image
- video
- audio
- subtitle
- template
- document

### 11.5.3 引用建立规则

以下情况必须建立 `asset_references`：

1. 业务对象主字段引用资产 ID
2. Segment / Storyboard / ClipSequence 显式引用资产
3. 当前选中版本资产
4. 已导出的正式结果资产

以下情况可选建立引用：

1. 临时中间文件
2. 未被业务对象采用的候选产物

### 11.5.4 删除规则

1. 默认执行软删除
2. 删除前必须检查引用关系
3. 被引用资产不得直接物理删除
4. 物理删除需进入清理队列并记录审计日志

## 11.6 FFmpeg 合成引擎

### 11.6.1 能力矩阵

|合成类型|输入|输出|使用模式|
|---|---|---|---|
|图片轮播合成|图片 / 视觉单元序列 + 音频 + 字幕|视频|图文口播|
|片段拼接|视频片段序列 + 转场|视频|混剪二创|
|单镜头合成|视频 + 音频 + 字幕|视频|AI 短剧|
|多镜头拼接|镜头视频序列|视频|AI 短剧|
|音频混合|多路音频|音频|全模式|
|字幕烧录|视频 + ASS|视频|全模式|

### 11.6.2 统一接口目标

平台应提供统一合成服务，对外按 `compose_type` 进行区分，减少各模块重复实现。

## 11.7 音色库

### 功能要求

1. 统一展示音色列表
2. 支持试听
3. 支持 Provider 音色同步
4. 支持按性别、语言、风格筛选
5. 支持 Project 默认音色、Production 默认音色和角色音色绑定

## 11.8 文本版本化最低要求

以下对象必须保留历史版本：

1. 图文口播优化文案
2. 混剪解说词
3. 短剧改写剧本
4. 字幕文本

最低实现要求：

- 保留当前版本内容
- 保留最近 N 个历史版本
- 回滚时生成新版本，不覆盖旧版本

---

# 12. 平台级任务中心

## 12.1 设计目标

所有 AI 生成、媒体处理、批量 pipeline、导入下载、FFmpeg 合成等长耗时操作，统一由平台级任务中心承载。

任务中心提供：

- 异步执行
- 状态查询
- 重试
- 取消
- 幂等控制
- 回调关联
- 执行审计
- 步骤级追踪

## 12.2 核心对象模型

### Job

Ts

interface Job {

  id: string;

  project_id?: string;

  production_id?: string;

  biz_type: 'talking_head_task' | 'remix_task' | 'episode' | 'storyboard' | 'asset_import';

  biz_id: string;

  run_type:

    | 'pipeline'

    | 'copy_optimize'

    | 'tts'

    | 'image_generate'

    | 'image_match'

    | 'asr'

    | 'clip_split'

    | 'subtitle_generate'

    | 'compose'

    | 'merge'

    | 'video_generate'

    | 'asset_download';

  trigger_source: 'user' | 'system' | 'openclaw' | 'retry';

  status: 'queued' | 'running' | 'partial_success' | 'success' | 'failed' | 'cancelled';

  current_step?: string;

  idempotency_key?: string;

  retry_count: number;

  priority: number;

  created_by?: string;

  error_code?: string;

  error_message?: string;

  created_at: string;

  started_at?: string;

  finished_at?: string;

}

### JobStep

Ts

interface JobStep {

  id: string;

  job_id: string;

  step_code: string;

  step_name: string;

  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';

  execution_state?: 'normal' | 'waiting_review';

  provider_task_id?: string;

  input_snapshot?: Record<string, any>;

  output_snapshot?: Record<string, any>;

  error_code?: string;

  error_message?: string;

  started_at?: string;

  finished_at?: string;

}

### JobEvent

Ts

interface JobEvent {

  id: string;

  job_id: string;

  step_id?: string;

  event_type: 'created' | 'queued' | 'started' | 'provider_submitted' | 'provider_callback' | 'retry' | 'failed' | 'completed' | 'cancelled' | 'waiting_review';

  payload?: Record<string, any>;

  created_at: string;

}

## 12.3 统一规则

1. 所有异步操作必须产生 `job_id`
2. `job_id` 是状态轮询主键
3. 同一业务对象允许多次执行，需产生多个 Job
4. Job 与业务对象状态解耦，但执行完成后需回写业务对象聚合状态
5. Provider webhook、人工重试、批量执行都必须归集到 Job 体系
6. 所有对外异步接口统一返回 `job_id`

## 12.4 调度模型

v2.1.1 采用 **单实例、本地 Worker、数据库驱动的任务执行模型**，不引入分布式调度系统。

### 执行角色

#### 1）API 层

负责：

- 接收请求
- 参数校验
- 创建 Job / JobStep
- 返回 `job_id`

#### 2）Scheduler / Dispatcher

负责：

- 周期性扫描 `queued` Job
- 按优先级、并发限制、任务类型分发给 Worker

#### 3）Worker

负责：

- 领取 Job
- 执行具体步骤
- 更新 JobStep / Job / 业务状态
- 记录事件日志

#### 4）Webhook Handler

负责：

- 处理异步 Provider 回调
- 通过 `provider_task_id` 或映射表回写到当前 JobStep

## 12.5 Job 类型约束

v2.1.1 中区分两类 Job：

### A. 单动作 Job

表示单一步骤执行，例如：

- TTS
- 配图
- 字幕生成
- FFmpeg 合成
- 素材下载

### B. Pipeline Job

表示一条业务链路的一次完整运行，例如：

- 图文口播 run_pipeline
- 混剪 run_pipeline
- 短剧 episode run_pipeline

## 12.6 Pipeline Job 实施规则

1. Pipeline Job 是**编排容器**
2. Pipeline Job 的详细过程拆分到 `job_steps`
3. v2.1.1 不强制为每个步骤再创建子 Job
4. 若某一步依赖外部异步 Provider，则该 step 进入等待回调状态，但仍归属当前 Job
5. 同一 Pipeline Job 内步骤按预定义顺序推进
6. 默认不支持跨 Job 的复杂 DAG 编排

## 12.7 JobStep 生成策略

v2.1.1 采用“**预生成必要步骤 + 运行时跳过可选步骤**”方式。

例如图文口播 Pipeline Job：

1. `content_prepare`
2. `copy_optimize`
3. `tts_generate`
4. `image_prepare`
5. `subtitle_generate`
6. `preview_compose`
7. `final_compose`
8. `export_finalize`

规则：

- 某些步骤可标记 `skipped`
- 所有步骤在 Job 创建时就写入 `job_steps`

## 12.8 调度顺序规则

调度优先级按以下顺序综合决定：

1. `priority` 高者优先
2. 同优先级下按 `created_at` 先进先出
3. 同类资源受并发槽位限制
4. 可人工确认阻塞的 Pipeline 不占下游执行槽位

## 12.9 幂等规则

1. 客户端可传 `idempotency_key`
2. 幂等键默认有效窗口为 24 小时
3. 幂等判断维度：
    - 调用方
    - `biz_type`
    - `biz_id`
    - `action / run_type`
    - `idempotency_key`
4. 若重复请求命中幂等：
    - 正在执行则返回原 `job_id`
    - 已完成则返回原 `job_id` 与最终状态
5. 不传幂等键时，系统仅尽量避免重复提交，不保证完全幂等

## 12.10 重试与取消规则

### 重试

1. 自动重试仅适用于可重试错误码：
    - `PROVIDER_TIMEOUT`
    - `TEMP_NETWORK_ERROR`
    - `COMPOSE_RESOURCE_BUSY`
    - `WEBHOOK_DELAYED`
2. 自动重试默认最多 2 次
3. 自动退避策略：30 秒 → 120 秒
4. 手动重试建议生成新的 Job，不覆盖旧 Job
5. 支持“从失败步骤继续”与“全量重跑”两种策略

### 取消

1. `queued` / `running` 状态的 Job 可取消
2. 若外部 Provider 已提交且不支持撤销，则本地标记取消请求，最终状态按 Provider 返回处理
3. 取消不会自动删除已产出的中间资产

## 12.11 重启恢复策略

### 场景 A：服务重启时 Job 为 `queued`

- 无需特殊处理，恢复后继续分发

### 场景 B：服务重启时 Job 为 `running`

1. 若 JobStep 处于本地同步执行型步骤且未写完成标记：
    - 将 Job 标记为 `failed`
    - 错误码：`JOB_WORKER_INTERRUPTED`
2. 若 JobStep 已提交外部 Provider 且保存了 `provider_task_id`：
    - Job 继续保持 `running`
    - Worker 恢复后进入“轮询/等待回调”模式
3. 若超过恢复超时时间仍无回调：
    - 标记为 `failed`
    - 错误码：`PROVIDER_CALLBACK_TIMEOUT`

## 12.12 状态分层原则

平台统一采用三层状态模型：

1. **业务对象状态**：如 `TalkingHeadTask.status`、`Episode.status`
2. **步骤状态**：如 `tts_status`、`compose_status`
3. **执行状态**：Job / JobStep 状态

## 12.13 Job 状态迁移规则

|当前状态|触发事件|下一状态|说明|
|---|---|---|---|
|`queued`|Worker 领取任务|`running`|开始执行|
|`queued`|用户取消|`cancelled`|未执行取消|
|`running`|所有必要步骤成功|`success`|执行完成|
|`running`|部分非必要步骤失败但允许输出部分结果|`partial_success`|如可人工补齐|
|`running`|任一必要步骤失败且任务终止|`failed`|执行失败|
|`running`|用户取消且本地终止成功|`cancelled`|已取消|
|`partial_success`|手动补齐后重新运行|`queued`|建议创建新 Job|
|`failed`|手动重试|`queued`|建议创建新 Job|
|`cancelled`|手动重试|`queued`|建议创建新 Job|

## 12.14 批量执行规则

1. 批量任务必须进入队列
2. 批量执行支持：
    - 暂停
    - 继续
    - 取消
    - 仅重试失败项
3. 批量结果需提供汇总视图：
    - 总数
    - 成功数
    - 失败数
    - 运行中数
4. 以下情况下批量运行自动暂停：
    - 同批次连续 5 个任务失败
    - 同批次累计失败率超过 30% 且累计样本数 ≥ 10
    - 同一 Provider 10 分钟内连续鉴权失败
    - 磁盘剩余空间低于安全阈值
    - 外部视频生成 Provider 达到并发硬上限

---

# 13. OpenClaw Skill 规范与集成

## 13.1 设计目标

通过标准化 Skill 规范，使 OpenClaw 智能体可以调用平台 API 完成项目创建、任务生成、任务查询和成片获取。

## 13.2 命名规范

Text

ranqi.{module}.{action}

其中：

- `module`：project / production / talking_head / remix / drama / asset / config / status
- `action`：具体操作动作

## 13.3 Skill 配置结构

Skill 定义包含以下信息：

- 基本元信息
- 版本号
- 鉴权方式
- 输入参数
- 输出结构
- API 映射
- 异步轮询规则
- 幂等要求
- 是否废弃

## 13.4 鉴权方式

### Header 约定

- `X-RanQi-API-Key`：API Key
- `X-Request-Id`：可选，请求追踪 ID
- `X-Idempotency-Key`：可选，幂等键

规则：

1. API Key 独立于 Web 登录态
2. 支持创建、停用、吊销与调用日志审计
3. 支持基础限流和配额控制
4. 若未传 `X-Request-Id`，服务端自动生成

## 13.5 响应结构

### 成功

Json

{

  "success": true,

  "data": {},

  "error": null,

  "request_id": "req_xxx"

}

### 失败

Json

{

  "success": false,

  "data": null,

  "error": {

    "code": "VOICE_NOT_CONFIGURED",

    "message": "未找到可用音色配置",

    "retryable": false,

    "details": {}

  },

  "request_id": "req_xxx"

}

## 13.6 异步 Skill 返回规范

Json

{

  "success": true,

  "data": {

    "job_id": "job_xxx",

    "biz_id": "thtask_xxx",

    "status": "queued"

  },

  "error": null,

  "request_id": "req_xxx"

}

## 13.7 Skill 范围

v2.1.1 首批必交付 Skill 采用“核心集合优先”原则，不强制首版全量覆盖所有长尾动作。

### 核心集合

1. 项目创建与查询
2. Production 创建与查询
3. 图文口播任务创建
4. 图文口播 pipeline 执行
5. 混剪素材导入
6. 混剪拆条执行
7. 混剪任务创建与执行
8. 短剧 Episode 创建
9. 短剧 pipeline 执行
10. 状态查询
11. 资产查询
12. 配置查询

## 13.8 实施清单

|Skill 名称|类型|内部 API|异步|优先级|
|---|---|---|---|---|
|`ranqi.project.create`|单对象|`POST /api/v1/projects`|否|MUST|
|`ranqi.project.get`|查询|`GET /api/v1/projects/:id`|否|MUST|
|`ranqi.production.create`|单对象|`POST /api/v1/productions`|否|MUST|
|`ranqi.production.get`|查询|`GET /api/v1/productions/:id`|否|MUST|
|`ranqi.talking_head.create_task`|单对象/批量|`POST /api/v1/talking-head/tasks`|否|MUST|
|`ranqi.talking_head.run_pipeline`|动作|`POST /api/v1/talking-head/tasks/:id/run`|是|MUST|
|`ranqi.talking_head.get_task`|查询|`GET /api/v1/talking-head/tasks/:id`|否|MUST|
|`ranqi.remix.import_material`|动作|`POST /api/v1/remix/materials/import`|是|SHOULD|
|`ranqi.remix.run_split`|动作|`POST /api/v1/remix/materials/:id/split`|是|SHOULD|
|`ranqi.remix.create_task`|单对象|`POST /api/v1/remix/tasks`|否|SHOULD|
|`ranqi.remix.run_pipeline`|动作|`POST /api/v1/remix/tasks/:id/run`|是|SHOULD|
|`ranqi.drama.create_episode`|单对象|`POST /api/v1/drama/episodes`|否|MUST|
|`ranqi.drama.run_pipeline`|动作|`POST /api/v1/drama/episodes/:id/run`|是|MUST|
|`ranqi.drama.get_episode`|查询|`GET /api/v1/drama/episodes/:id`|否|MUST|
|`ranqi.asset.get`|查询|`GET /api/v1/assets/:id`|否|MUST|
|`ranqi.asset.list`|查询|`GET /api/v1/assets`|否|SHOULD|
|`ranqi.status.get_job`|查询|`GET /api/v1/jobs/:id`|否|MUST|
|`ranqi.status.get_biz_status`|查询|`GET /api/v1/status/biz/:bizType/:bizId`|否|MUST|
|`ranqi.status.list_jobs`|查询|`GET /api/v1/jobs`|否|SHOULD|

## 13.9 批量 Skill 协议

### 原则

1. 首版不新增专门的批量 Skill 名称
2. 批量能力通过普通 Skill 的数组输入方式承载
3. 图文口播优先支持批量创建
4. 超大批量 run 不建议一次性提交

### 批量创建示例

Json

{

  "project_id": "proj_xxx",

  "production_id": "prod_xxx",

  "items": [

    { "title": "A", "content": "..." },

    { "title": "B", "content": "..." }

  ]

}

### 批量创建返回示例

Json

{

  "success": true,

  "data": {

    "items": [

      { "biz_id": "th_1", "success": true },

      { "biz_id": "th_2", "success": true }

    ],

    "failed_items": []

  },

  "error": null,

  "request_id": "req_xxx"

}

### 批量运行返回示例

Json

{

  "success": true,

  "data": {

    "batch_job_id": "job_batch_xxx",

    "submitted_count": 20

  },

  "error": null,

  "request_id": "req_xxx"

}

### 首版限制

1. 单次批量创建最多 50 条
2. 单次批量 run 最多 20 条
3. 超限返回 `QUOTA_EXCEEDED`

## 13.10 状态查询 Skill 统一规范

新增统一查询动作：

- `ranqi.status.get_job`
- `ranqi.status.get_biz_status`
- `ranqi.status.list_jobs`

查询结果应包含：

- job 状态
- 当前步骤
- 最近错误
- 输出资产
- 结果 URL（若已生成）
- 是否可重试
- 是否可取消

### 最低返回字段示例

Json

{

  "success": true,

  "data": {

    "job_id": "job_xxx",

    "status": "running",

    "current_step": "tts_generate",

    "progress": 0.4,

    "retryable": true,

    "cancelable": true,

    "latest_error": null,

    "output_assets": []

  },

  "error": null,

  "request_id": "req_xxx"

}

## 13.11 人工确认场景返回约定

若 Job 因人工确认暂停：

Json

{

  "success": true,

  "data": {

    "job_id": "job_xxx",

    "status": "running",

    "current_step": "storyboard_review",

    "execution_state": "waiting_review",

    "retryable": false,

    "cancelable": true

  },

  "error": null,

  "request_id": "req_xxx"

}

规则：

1. OpenClaw 读取到 `execution_state = waiting_review` 时，停止自动推进
2. 等待人工操作后重新轮询或继续后续编排

## 13.12 设计原则

1. 内部 API 与 OpenClaw API 共享业务服务层
2. 所有异步 Skill 必须返回 `job_id`
3. 所有错误必须返回结构化错误对象
4. Skill 定义应稳定、可版本化、可文档化
5. 破坏性升级需升级 `skill_version`

---

# 14. 智能体工作流编排

## 14.1 图文口播工作流

Text

创建 Project

→ 创建 talking_head production

→ 批量创建口播任务

→ 对每个任务执行 run_pipeline

→ 轮询 job 状态

→ 获取 video_url 列表

## 14.2 混剪二创工作流

Text

创建 Project

→ 创建 remix production

→ 上传或导入源素材

→ 智能拆条

→ 智能体分析并选择片段

→ 创建 remix task

→ 执行 run_pipeline

→ 轮询完成

→ 获取成片链接

## 14.3 AI 短剧工作流

Text

创建 Project

→ 创建 drama production

→ 批量创建 episode

→ 执行 run_pipeline

→ 轮询状态

→ 在需要的步骤等待人工确认

→ 收集整集视频

## 14.4 跨模式混合工作流

|场景|工作流说明|
|---|---|
|小说转短剧 + 预告片|先产出短剧，再基于成片拆条制作宣传片|
|知识矩阵号|一个主题创建多个口播任务批量生产|
|影视解说矩阵|一批素材拆条后批量配不同解说词|
|短剧宣发|短剧正片 + 口播宣发 + 精彩片段合集|

---

# 15. 信息架构与数据模型

## 15.1 数据库表概览

### 公共表

- `projects`
- `productions`
- `ai_service_configs`
- `agent_configs`
- `ai_voices`
- `templates`
- `assets`
- `asset_references`
- `jobs`
- `job_steps`
- `job_events`
- `api_keys`
- `api_call_logs`
- `audit_logs`

### 图文口播

- `talking_head_tasks`
- `content_segments`
- `talking_head_exports`

### 混剪二创

- `source_materials`
- `clips`
- `remix_tasks`
- `clip_sequence_items`
- `remix_exports`

### AI 短剧

- `episodes`
- `characters`
- `scenes`
- `episode_characters`
- `episode_scenes`
- `storyboards`
- `image_generations`
- `video_generations`
- `video_merges`

### 文本版本化建议表

- `text_versions`
- 或分别独立历史表（按实现方案选择）

## 15.2 核心关系

1. `projects` 对 `productions` 为 1:N
2. `projects` 对 `assets` 为 1:N，可为空表示全局素材
3. `productions` 对各模式业务对象为 1:N
4. `talking_head_tasks` 对 `content_segments` 为 1:N
5. `source_materials` 对 `clips` 为 1:N
6. `remix_tasks` 对 `clip_sequence_items` 为 1:N
7. `episodes` 对 `storyboards` 为 1:N
8. `jobs` 对 `job_steps` 为 1:N
9. `jobs` 对 `job_events` 为 1:N

## 15.3 数据建模原则

1. Project 统一作为资源主容器
2. 执行实例与业务对象解耦
3. 产物尽量资产化
4. 状态字段尽量显式可追踪
5. 错误信息需保留在任务主表和 Job 表中
6. 时间字段统一保留创建与更新时间
7. 可编辑产物应支持版本或历史记录
8. 配置执行时必须快照化

## 15.4 资产对象建议字段

Ts

interface Asset {

  id: string;

  project_id?: string;

  production_id?: string;

  type: 'image' | 'video' | 'audio' | 'subtitle' | 'template' | 'document';

  source_type: 'upload' | 'generated' | 'imported' | 'extracted' | 'system';

  source_provider?: string;

  origin_job_id?: string;

  title?: string;

  mime_type: string;

  size_bytes: number;

  checksum?: string;

  local_path: string;

  preview_url?: string;

  thumbnail_url?: string;

  width?: number;

  height?: number;

  duration_ms?: number;

  fps?: number;

  sample_rate?: number;

  channels?: number;

  status: 'active' | 'soft_deleted' | 'missing' | 'archived';

  version_no: number;

  created_at: string;

  updated_at: string;

  deleted_at?: string;

}

---

# 16. API 设计

## 16.1 设计原则

1. RESTful 风格为主
2. 动作型操作使用 action 后缀
3. OpenClaw 使用独立前缀 `/api/v1/openclaw/*`
4. 所有 API 使用统一数据校验与错误结构
5. 异步任务接口必须可轮询
6. 所有异步写操作默认返回 `job_id` 或明确说明同步行为

## 16.2 API 模块划分

- 项目管理 API
- Production 管理 API
- 图文口播 API
- 混剪二创 API
- AI 短剧 API
- 素材管理 API
- AI 服务配置 API
- Agent 配置 API
- 音色管理 API
- 模板管理 API
- Skills 管理 API
- 状态查询 API
- 任务中心 API
- OpenClaw API
- Webhook API

## 16.3 响应规范

### 成功

Json

{

  "success": true,

  "data": {},

  "error": null,

  "request_id": "req_xxx"

}

### 失败

Json

{

  "success": false,

  "data": null,

  "error": {

    "code": "CONFIG_NOT_FOUND",

    "message": "未找到可用配置",

    "retryable": false,

    "details": {}

  },

  "request_id": "req_xxx"

}

## 16.4 异步任务原则

以下类型操作默认为异步：

- 大模型生成
- 图像生成
- 视频生成
- 长时长配音
- 大文件下载 / 处理
- FFmpeg 长时合成
- 批量 pipeline 执行

## 16.5 建议核心接口

### 任务中心

- `POST /api/v1/jobs/:id/cancel`
- `POST /api/v1/jobs/:id/retry`
- `GET /api/v1/jobs/:id`
- `GET /api/v1/jobs`

### 状态查询

- `GET /api/v1/status/biz/:bizType/:bizId`
- `GET /api/v1/status/job/:jobId`

### 模板

- `GET /api/v1/templates`
- `POST /api/v1/templates`
- `PATCH /api/v1/templates/:id`

### OpenClaw

- `POST /api/v1/openclaw/:skillName`

---

# 17. 前端页面与交互设计

## 17.1 导航结构

Text

首页 / 项目列表

├── 创建项目

├── 图文口播

├── 混剪二创

├── AI 短剧

├── 素材中心

├── 系统设置

└── OpenClaw 集成管理

## 17.2 核心页面

### 首页 / 项目列表

- 卡片式展示 Project
- 按项目分类筛选
- 快速进入各项目工作台
- 展示最近执行状态与任务摘要

### 项目详情页

- 展示 Project 基本信息
- 展示旗下 Productions 列表
- 展示资产、模板绑定、最近 Job
- 统一进入各模式工作区

### 图文口播工作台

- 文案编辑
- 分段管理
- 配音管理
- 视觉单元管理
- 字幕编辑
- 草稿预览
- 合成与导出
- Job 状态查看

### 混剪工作台

- 素材管理
- 片段浏览
- 片段编排序列
- 解说文案
- 配音与字幕
- 合成预览
- Job 状态查看

### AI 短剧工作台

延续 v1.0 多步骤工作台形式：

- 原始内容
- 剧本
- 角色 / 场景
- 音色
- 分镜
- 图像
- 视频
- 合成
- 人工确认
- 导出

### 素材中心

- 图片
- 视频
- 音频
- 字幕
- 模板
- 搜索筛选
- 预览与删除
- 引用关系查看

### 设置中心

- AI 服务配置
- Agent 配置
- 模板管理
- Skill 查看
- 音色管理

### OpenClaw 管理

- API Key 管理
- Skill 测试
- 调用日志查看
- 配额与限流查看

## 17.3 交互原则

1. 三种模式均提供清晰的步骤导航
2. 生成型操作必须提供状态反馈
3. 可长时执行的任务必须支持轮询和失败重试
4. 关键媒体对象必须支持预览
5. 可批量的动作优先支持批量入口
6. 草稿预览与正式导出需清晰区分
7. 关键高成本节点需支持人工确认
8. 因上游变更失效的结果需以 `stale` 显式提示用户

## 17.4 人工确认最小交互要求

首版必须支持：

1. 查看待确认内容
2. 点击通过
3. 点击打回
4. 填写备注
5. 指定回退步骤

首版可以不支持：

- 指派给指定审核人
- 审核 SLA
- 多级审核流

---

# 18. 技术架构与工程规范

## 18.1 技术栈

|层级|技术|
|---|---|
|前端框架|Next.js 15（App Router）|
|UI|shadcn/ui + Tailwind CSS|
|状态管理|React Server Components + SWR|
|后端|Next.js API Routes|
|Agent 框架|Mastra|
|数据库|SQLite（better-sqlite3）|
|ORM|Drizzle ORM|
|视频处理|FFmpeg（fluent-ffmpeg）|
|文件存储|本地文件系统（通过统一存储抽象层访问）|
|语言|TypeScript|
|包管理|pnpm|

> 本版本统一采用 **Next.js** 作为前后端一体化框架，不采用 Nuxt。

## 18.2 工程规范

1. 文件命名使用 kebab-case
2. 组件命名使用 PascalCase
3. 变量与函数使用 camelCase
4. API 参数使用 Zod 校验
5. ID 使用 nanoid，并增加业务前缀
6. 复杂逻辑必须有中文注释
7. 关键业务操作必须记录结构化日志
8. 所有异步流程必须经过任务中心统一封装

## 18.3 系统分层原则

- 路由层：负责鉴权、参数校验、响应封装
- Service 层：负责核心业务逻辑
- Repository / ORM 层：负责数据持久化
- Agent 层：负责提示词编排、工具调用和模型交互
- Compose 层：负责 FFmpeg 多媒体处理
- Integration 层：负责 Provider、Webhook、OpenClaw 对接
- Job 层：负责异步调度、状态更新、重试与审计

## 18.4 技术边界声明

当前技术方案适用于：

- 单实例部署
- 单团队或小规模多人协作
- 中低并发内容生产场景

不作为高并发 SaaS 场景的最终技术形态。

## 18.5 可迁移性要求

1. SQLite 必须启用 WAL
2. 数据结构与索引设计需兼容未来迁移 PostgreSQL
3. 文件访问必须经过统一存储抽象层
4. 禁止业务逻辑强依赖本地路径
5. 任务中心与日志表需预留归档与分页策略

---

# 19. 非功能性需求

## 19.1 性能需求

|指标|目标|
|---|---|
|页面首屏加载|< 2 秒（标准部署环境、常规项目列表）|
|非 AI API 响应|< 500 ms|
|100MB 文件上传|< 30 秒（标准内网环境）|
|1 分钟口播视频草稿合成|< 60 秒（单任务、标准模板）|
|单个图文口播正式导出|< 120 秒|
|单次状态查询接口|< 300 ms|

## 19.2 默认并发限制

默认建议值如下，可在系统设置中调整：

- 文本类 AI：5
- TTS：3
- 图像生成：3
- 视频生成：2
- FFmpeg 合成：2
- 大文件导入：2

## 19.3 可靠性需求

1. AI 服务失败自动重试 2 次
2. FFmpeg 合成失败时保留中间产物
3. SQLite 启用 WAL 模式
4. 任务失败应保留错误信息与上下文
5. 生成产物默认长期保存，直到用户主动删除
6. 资产缺失时需标记 `missing` 并可定位来源 Job
7. 批量任务需支持失败项重试
8. Job 执行中服务重启后应具备中断识别与恢复策略

## 19.4 安全需求

1. API Key 加密存储
2. OpenClaw API Key 支持吊销
3. 文件上传限制类型与大小
4. 参数化查询防止 SQL 注入
5. React 默认转义 + CSP 头防止 XSS
6. 外部 Webhook 必须支持签名校验与幂等处理
7. 删除、配置修改、API 调用需保留审计日志

## 19.5 可扩展性需求

1. 新增 Provider 不应影响现有业务接口
2. 新增 Agent 仅需注册配置与工具
3. 新增模式应在统一 Project / Production 体系中可扩展
4. 存储后端应可替换为对象存储
5. SQLite 应可平滑迁移到 PostgreSQL

## 19.6 配额与限流需求

1. 支持单次批量创建任务数上限
2. 支持单个素材最大文件大小限制
3. 支持 URL 导入超时时间限制
4. 支持 API Key 每分钟请求数限制
5. 支持 OpenClaw 每日异步任务提交数限制
6. 支持单次批量动作最大对象数限制

### 默认限制

- OpenClaw API Key：每分钟 60 次请求
- OpenClaw API Key：每日 500 次异步任务提交
- 图文口播：单次批量创建最多 50 条，单次批量运行最多 20 条
- 混剪：单次批量导入最多 10 个，单次批量执行最多 5 个
- 短剧：单次批量创建 episode 最多 20 个，单次批量运行最多 5 个

## 19.7 可观测性要求

至少需要提供以下监控指标：

- Job 成功率
- Job 平均耗时
- Provider 失败率
- 磁盘使用率
- 文件缺失率
- API 错误码分布
- 批量任务失败率

---

# 20. 实施计划与里程碑

## 20.1 建议研发顺序

### 第一优先级

1. Project / Production / Asset 底座
2. Job 中心
3. 图文口播最小闭环
4. 状态查询与错误码
5. OpenClaw 最小链路

### 第二优先级

1. AI 短剧迁移与人工确认
2. 资产保留与清理
3. 模板快照机制
4. 批量运行治理

### 第三优先级

1. 混剪基础版
2. 审计增强
3. 管理与监控页面增强

## 20.2 阶段规划

|阶段|内容|周期|
|---|---|---|
|Phase 1|统一项目模型、任务中心、素材中心基础版|2 周|
|Phase 2|图文口播端到端基础版|2 周|
|Phase 3|AI 短剧接入迁移与回归|2 周|
|Phase 4|混剪二创基础版|2 周|
|Phase 5|OpenClaw 核心 Skill、状态接口、API Key|1 周|
|Phase 6|联调、测试、性能优化、部署文档|2 周|

## 20.3 关键里程碑

1. **M1：统一底座完成**
    
    - Project / Production 模型可用
    - Job 中心可用
    - 素材中心基础版可用
2. **M2：图文口播稳定出片**
    
    - 支持批量导入、配音、字幕、合成、导出
    - 支持状态轮询与失败重试
3. **M3：短剧迁移完成**
    
    - v1.0 核心流程回归
    - 产物接入统一素材中心
    - 关键步骤支持任务化执行
4. **M4：混剪基础版可用或延期拆出**
    
    - 导入、拆条、编排、合成跑通
    - 若资源不足，混剪不阻断 v2.1.1 GA
5. **M5：OpenClaw 核心联调完成**
    
    - 核心 Skill 集合联调成功
    - API Key、限流、审计日志可用
6. **M6：可部署验收完成**
    
    - 文档齐备
    - 关键链路压测通过
    - 失败恢复验证通过

---

# 21. 风险与应对

|风险|影响|概率|应对措施|
|---|---|---|---|
|AI Provider API 变更|功能不可用|中|抽象 Provider 适配层|
|FFmpeg 合成参数不稳定|输出视频瑕疵|中|建立参数模板与回归样例|
|智能拆条准确率不足|影响二创效率|高|多策略拆条 + 人工修正|
|生图风格不一致|影响观感|高|seed/style 锁定与模板化 Prompt|
|大文件处理内存风险|服务崩溃|中|流式处理与并发限制|
|SQLite 写入瓶颈|批量任务阻塞|中|WAL + 队列，后续可迁移 PG|
|OpenClaw 滥用|资源被耗尽|中|API Key 限流、配额与审计|
|资产误删|历史项目失效|中|软删除 + 引用检查 + 清理队列|
|任务状态混乱|无法恢复与排障|中|统一 Job 中心与步骤状态机|
|版权争议|实施与业务风险|中|来源记录、用户确认、保留审计链路|

---

# 22. 验收标准

## 22.1 总体验收原则

验收不再仅以“功能存在”为准，而以以下四类标准综合评定：

1. 功能完整性
2. 稳定性
3. 恢复性
4. 可追踪性

## 22.2 测试环境基线

### 标准测试环境

- CPU：8 核
- 内存：16GB
- 磁盘：SSD 200GB
- OS：Linux
- 本地已安装 FFmpeg
- SQLite WAL 模式开启
- 网络：可访问已配置 Provider

> 以下性能与成功率指标均基于上述环境。

## 22.3 测试样本基线

### 图文口播

- 30 条文案
- 单条文案长度：300~800 汉字
- 输出比例：9:16
- 启用 TTS、字幕、基础配图、正式导出

### 混剪二创

- 5 个源视频
- 单个视频时长：1~5 分钟
- 至少 1 次自动拆条 + 1 次人工修正 + 1 次最终导出

### AI 短剧

- 1 个 Project
- 1 个 Production
- 1~3 个 Episode
- 每集 10~30 个 Storyboard

## 22.4 图文口播模块验收

### 功能

1. 支持单任务创建与编辑
2. 支持批量导入多文案
3. 支持 TTS 生成并返回时间戳
4. 支持图片生成、选择与替换
5. 支持字幕生成、编辑与视频合成
6. 支持一键 pipeline 执行
7. 最终能输出可播放 MP4 视频

### 稳定性

1. 连续执行 30 条标准口播任务，一次执行成功率 ≥ 80%
2. 经自动/人工重试后最终成功率 ≥ 95%
3. Provider 短时失败时，自动重试可生效

### 恢复性

1. 单任务失败后可单独重试
2. 字幕修改后可重新合成，不污染历史结果
3. 服务重启后可识别中断任务

### 可追踪性

1. 任一成片可追溯其文案、音色、字幕和合成配置快照
2. 任一失败任务可查询错误码和对应 Job 日志

## 22.5 混剪二创模块验收

1. 支持上传本地视频和 URL 导入
2. 支持至少一种自动拆条模式稳定运行
3. 支持片段浏览、筛选与排序编排
4. 支持生成解说词与配音
5. 支持字幕与最终合成
6. 支持导出成片
7. 用户可修正拆条结果并生成新版本
8. 任一导出成片可追溯其素材来源与片段序列
9. 标准导入 + 拆条 + 导出成功率 ≥ 80%

## 22.6 AI 短剧模块验收

1. v1.0 全链路核心能力保持可用
2. 剧集工作台可在新平台中正常访问
3. 11 步流水线可分步执行与一键执行
4. 图像、视频、合成产物接入统一素材中心
5. 结果可导出并可通过状态接口查询
6. 至少 1 个完整 Episode 可在新平台完成端到端流程
7. 关键步骤支持单步执行、失败重试和人工确认

## 22.7 OpenClaw 验收

1. 核心 Skill 集合可完成注册与调用
2. 异步 Skill 可通过统一状态接口轮询
3. API Key 鉴权可正常启用、停用、吊销
4. 调用日志可追踪
5. 失败返回结构化错误码
6. 核心 Skill 调用成功率 ≥ 95%（不含外部 Provider 波动）
7. 至少完成三类典型工作流联调：
    - 图文口播
    - 混剪二创
    - AI 短剧

## 22.8 平台级验收

1. Project、Production、素材、配置四大基础管理可用
2. 三大模式均可在同一工作台体系中运行
3. Job 中心可支撑异步执行、重试、取消
4. 资产支持软删除、引用检查、历史追溯
5. 主要接口具备错误提示、错误码与失败恢复能力
6. 批量执行具备并发控制、自动暂停与失败项重试能力
7. 文档、部署说明、接口说明齐备

---

# 23. 附录

## 23.1 v2.1 → v2.1.1 变更摘要

|项目|v2.1|v2.1.1|
|---|---|---|
|交付边界|范围描述为主|MUST / SHOULD / COULD / WON'T 分层|
|状态设计|状态枚举较完整|增加状态迁移表|
|任务中心|对象定义较完整|增加调度模型、恢复策略与预生成步骤规则|
|OpenClaw|核心 Skill 与错误结构|增加 Header、批量协议、waiting_review 约定|
|对象契约|主对象较完整|补充 Production / TalkingHeadConfig / RemixTask / ClipSequenceItem / Episode / Storyboard|
|资产生命周期|删除规则较完整|增加预览保留窗口与引用建立规则|
|批量治理|原则性描述|增加并发阈值、自动暂停与配额限制|
|验收标准|原则增强|增加环境、样本、成功率与性能阈值|

## 23.2 关键依赖矩阵

|能力|用途|适用模块|
|---|---|---|
|LLM|文案优化、剧本改写、拆条分析、解说生成|全模块|
|图像生成|配图、角色图、场景图、镜头图|图文口播、AI 短剧|
|视频生成|镜头视频|AI 短剧|
|TTS|配音|全模块|
|ASR|原音转字幕、素材语义分析|混剪二创|

## 23.3 建议错误码示例

|错误码|说明|可重试|
|---|---|---|
|`CONFIG_NOT_FOUND`|未找到可用配置|否|
|`VOICE_NOT_CONFIGURED`|未绑定可用音色|否|
|`PROVIDER_TIMEOUT`|Provider 响应超时|是|
|`PROVIDER_AUTH_FAILED`|Provider 鉴权失败|否|
|`FILE_DOWNLOAD_FAILED`|远程文件下载失败|视情况|
|`ASSET_MISSING`|资产文件缺失|否|
|`COMPOSE_FAILED`|FFmpeg 合成失败|是|
|`JOB_CANCELLED`|任务已取消|否|
|`RATE_LIMITED`|触发频率限制|是|
|`QUOTA_EXCEEDED`|超出配额限制|否|
|`JOB_WORKER_INTERRUPTED`|Worker 中断导致任务失败|是|
|`PROVIDER_CALLBACK_TIMEOUT`|外部回调超时|是|

## 23.4 资产保留建议窗口

|资产类型|默认保留|
|---|---|
|源资产|永久，直到用户删除|
|正式导出结果|永久，直到用户删除|
|字幕 / 文本文档历史版本|30 天|
|过程音频 / 预览视频|7 天|
|临时拆条预览|3 天|
|未采用候选图 / 候选视频|7 天|

## 23.5 后续版本建议方向

1. SaaS 多租户与权限体系
2. 云存储与对象存储适配
3. PostgreSQL 迁移
4. 云端任务队列与分布式渲染
5. 模板市场与可复用工作流市场
6. 更完整的版权与素材合规管理
7. 更强的成本监控与预算控制
8. 专业化混剪编辑器增强能力

---

**文档结束**