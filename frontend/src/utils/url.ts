/**
 * Resolve stored upload/attachment URL against the configured API origin.
 * Returns absolute URLs unchanged and maps relative paths (e.g. /uploads/...)
 * to the backend origin when VITE_API_BASE_URL is an absolute URL.
 */
export function resolveFileUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  if (/^(https?:|blob:|data:)/i.test(fileUrl)) {
    return fileUrl;
  }
  const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  if (/^https?:\/\//i.test(apiBase)) {
    const origin = apiBase.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${origin}${normalizedPath}`;
  }
  return normalizedPath;
}
