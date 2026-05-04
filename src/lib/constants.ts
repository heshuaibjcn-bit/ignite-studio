/**
 * Chinese UI label constants for the dashboard.
 */

export const JOB_STATUS_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  partial_success: '部分成功',
  success: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export const STEP_STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  queued: '排队中',
  running: '执行中',
  succeeded: '已完成',
  failed: '失败',
  skipped: '已跳过',
  cancelled: '已取消',
  stale: '已过期',
};

export const EXECUTION_STATE_LABELS: Record<string, string> = {
  normal: '正常',
  waiting_review: '等待审核',
  waiting_callback: '等待回调',
  waiting_polling: '轮询中',
};

export const BIZ_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  ready: '就绪',
  active: '进行中',
  inactive: '已停用',
  processing: '处理中',
  partial_ready: '部分就绪',
  blocked: '阻塞',
  completed: '已完成',
  failed: '失败',
  archived: '已归档',
};

export const PRODUCTION_MODE_LABELS: Record<string, string> = {
  talking_head: '数字人口播',
  remix: '混剪',
  drama: '短剧',
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  subtitle: '字幕',
  template: '模板',
  document: '文档',
};

export const ASSET_SOURCE_TYPE_LABELS: Record<string, string> = {
  upload: '上传',
  generated: '生成',
  imported: '导入',
  extracted: '提取',
  system: '系统',
};

/** Status badge color variants */
export const JOB_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  queued: 'secondary',
  running: 'default',
  partial_success: 'outline',
  success: 'default',
  failed: 'destructive',
  cancelled: 'outline',
};

export const BIZ_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  ready: 'default',
  active: 'default',
  inactive: 'secondary',
  processing: 'default',
  partial_ready: 'outline',
  blocked: 'destructive',
  completed: 'default',
  failed: 'destructive',
  archived: 'outline',
};

/** Step status to color class mapping for pipeline visualization */
export const STEP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-blue-500 text-white animate-pulse',
  succeeded: 'bg-green-500 text-white',
  failed: 'bg-red-500 text-white',
  skipped: 'bg-gray-200 text-gray-400',
  cancelled: 'bg-gray-200 text-gray-400',
  stale: 'bg-gray-200 text-gray-400',
};

/** Event type labels for job event log */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  created: '已创建',
  queued: '已入队',
  started: '已启动',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  step_queued: '步骤入队',
  step_started: '步骤启动',
  step_completed: '步骤完成',
  step_failed: '步骤失败',
  provider_submitted: '已提交至服务商',
  provider_completed: '服务商完成',
  provider_failed: '服务商失败',
  review_requested: '审核请求',
  review_approved: '审核通过',
  review_rejected: '审核驳回',
  retried: '已重试',
  fanout_started: '并行任务启动',
  fanout_completed: '并行任务完成',
};

/** Pipeline step groups for visual grouping */
export const PIPELINE_STEP_GROUPS = [
  { label: '前期处理', steps: [0, 1, 2] },    // source_validate, script_rewrite, character_scene_extract
  { label: '音频', steps: [3] },                // voice_assign
  { label: '分镜', steps: [4, 5] },             // storyboard_generate, storyboard_review
  { label: '图像生成', steps: [6, 7, 8] },      // character_image, scene_image, frame_image
  { label: '视频制作', steps: [9, 10, 11] },    // video_generate, video_review, shot_compose
  { label: '后期输出', steps: [12, 13] },        // episode_merge, export_finalize
];
