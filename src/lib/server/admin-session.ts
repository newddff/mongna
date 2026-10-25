import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'mongna_admin_session';
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
const LEGACY_MAX_AGE_SECONDS = 12 * 60 * 60;
const RENEW_AFTER_SECONDS = 24 * 60 * 60;

function secret(): string | null {
  const configured = process.env.ADMIN_SESSION_SECRET;
  return configured && configured.length >= 32 ? configured : null;
}

function sign(payload: string, key: string) {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function createAdminSessionCookie(): string | null {
  const key = secret();
  if (!key) return null;
  const issued = Math.floor(Date.now() / 1000);
  const payload = `v2.${issued}.${randomBytes(16).toString('base64url')}`;
  const value = `${payload}.${sign(payload, key)}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function expiredAdminSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readAdminSession(request: Request): { version: string; issued: number } | null {
  const key = secret();
  if (!key) return null;
  const cookie = request.headers.get('cookie') || '';
  const encoded = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE_NAME + '='));
  if (!encoded) return null;
  const token = encoded.slice(COOKIE_NAME.length + 1);
  const parts = token.split('.');
  if (parts.length !== 4 || !['v1', 'v2'].includes(parts[0])) return null;
  const issued = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const maxAge = parts[0] === 'v1' ? LEGACY_MAX_AGE_SECONDS : MAX_AGE_SECONDS;
  if (!Number.isSafeInteger(issued) || issued > now + 30 || issued + maxAge <= now) return null;
  const payload = parts.slice(0, 3).join('.');
  const expected = Buffer.from(sign(payload, key));
  const received = Buffer.from(parts[3]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return { version: parts[0], issued };
}
export function isAdminSession(request: Request): boolean {
  return readAdminSession(request) !== null;
}
export function adminSessionNeedsRenewal(request: Request): boolean {
  const session = readAdminSession(request);
  return session !== null && (session.version === 'v1' || Math.floor(Date.now() / 1000) - session.issued >= RENEW_AFTER_SECONDS);
}
export const adminSessionConfigured = () => secret() !== null;
