/**
 * Business status constants.
 * These represent the high-level lifecycle state of business objects
 * (projects, productions, episodes, tasks, etc.).
 *
 * Source: design doc Section 3.2, PRD Section 10.
 */
export const BIZ_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  PROCESSING: 'processing',
  PARTIAL_READY: 'partial_ready',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ARCHIVED: 'archived',
} as const;

export type BizStatus = (typeof BIZ_STATUS)[keyof typeof BIZ_STATUS];

/** Production modes — the three business modules. */
export const PRODUCTION_MODE = {
  TALKING_HEAD: 'talking_head',
  REMIX: 'remix',
  DRAMA: 'drama',
} as const;

export type ProductionMode = (typeof PRODUCTION_MODE)[keyof typeof PRODUCTION_MODE];

/** Business object types — used in jobs, events, and references. */
export const BIZ_TYPE = {
  TALKING_HEAD_TASK: 'talking_head_task',
  REMIX_TASK: 'remix_task',
  EPISODE: 'episode',
  STORYBOARD: 'storyboard',
  ASSET_IMPORT: 'asset_import',
} as const;

export type BizType = (typeof BIZ_TYPE)[keyof typeof BIZ_TYPE];

/** Asset types. */
export const ASSET_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  SUBTITLE: 'subtitle',
  TEMPLATE: 'template',
  DOCUMENT: 'document',
} as const;

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

/** Asset source types. */
export const ASSET_SOURCE_TYPE = {
  UPLOAD: 'upload',
  GENERATED: 'generated',
  IMPORTED: 'imported',
  EXTRACTED: 'extracted',
  SYSTEM: 'system',
} as const;

export type AssetSourceType = (typeof ASSET_SOURCE_TYPE)[keyof typeof ASSET_SOURCE_TYPE];

/** Asset status. */
export const ASSET_STATUS = {
  ACTIVE: 'active',
  SOFT_DELETED: 'soft_deleted',
  MISSING: 'missing',
  ARCHIVED: 'archived',
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];
