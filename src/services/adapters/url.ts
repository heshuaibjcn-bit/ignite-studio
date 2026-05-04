/**
 * URL join utility for provider adapters.
 * Handles combining base URLs with required prefixes and API paths.
 */
export function joinProviderUrl(baseUrl: string, requiredPrefix: string, path: string): string {
  const normalizedBase = (baseUrl || '').replace(/\/+$/, '');
  const normalizedPrefix = normalizeSegment(requiredPrefix);
  const normalizedPath = normalizeSegment(path);

  if (!normalizedBase) {
    return `${normalizedPrefix}${normalizedPath}`;
  }

  try {
    const url = new URL(normalizedBase);
    const currentPath = url.pathname.replace(/\/+$/, '');
    const mergedPrefix = currentPath.endsWith(normalizedPrefix)
      ? currentPath
      : `${currentPath}${normalizedPrefix}`;

    url.pathname = `${mergedPrefix}${normalizedPath}`.replace(/\/{2,}/g, '/');
    return url.toString();
  } catch {
    const basePath = normalizedBase.endsWith(normalizedPrefix)
      ? normalizedBase
      : `${normalizedBase}${normalizedPrefix}`;
    return `${basePath}${normalizedPath}`;
  }
}

function normalizeSegment(segment: string): string {
  if (!segment) return '';
  return segment.startsWith('/') ? segment : `/${segment}`;
}
