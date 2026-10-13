export const SOOP_CALLBACK_PATH = '/soop/callback';
export const LEGACY_SOOP_CALLBACK_PATH = '/streamer/soop-callback';
export const DEFAULT_SOOP_RETURN_TO = '/streamer/minigames';

// Only a same-site page path is accepted. No absolute URLs, encoded path tricks,
// API routes or callback loops. Search/hash are preserved for page state.
export function safeSoopReturnTo(value: unknown, fallback = DEFAULT_SOOP_RETURN_TO): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || !value || value.length > 1024 ||
      !value.startsWith('/') || value.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('허용되지 않은 복귀 주소입니다.');
  }
  const pathname = value.split(/[?#]/, 1)[0];
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(pathname) || pathname.includes('//') ||
      pathname === '/api' || pathname.startsWith('/api/') ||
      pathname === SOOP_CALLBACK_PATH || pathname.startsWith(SOOP_CALLBACK_PATH + '/') ||
      pathname === LEGACY_SOOP_CALLBACK_PATH || pathname.startsWith(LEGACY_SOOP_CALLBACK_PATH + '/')) {
    throw new Error('허용되지 않은 복귀 주소입니다.');
  }
  return value;
}
