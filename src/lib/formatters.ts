/**
 * Formatting utilities for the dashboard UI.
 */

/** Format an ISO date string to a localized Chinese date-time string. */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a date as relative time (e.g., "3分钟前") */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;

  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return formatDate(dateStr);
}

/** Format milliseconds as human-readable duration (e.g., "2分30秒") */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}时${minutes % 60}分`;
  if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
  return `${seconds}秒`;
}

/** Format bytes as human-readable file size */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Format an episode number (e.g., "第3集") */
export function formatEpisodeNo(no: number | null | undefined): string {
  if (no == null) return '-';
  return `第${no}集`;
}

/** Truncate an ID for display (e.g., "job_abc123...") */
export function truncateId(id: string | null | undefined, maxLen = 16): string {
  if (!id) return '-';
  if (id.length <= maxLen) return id;
  return id.slice(0, maxLen) + '...';
}
