import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'mongna_admin_session';
const MAX_AGE_SECONDS = 12 * 60 * 60;

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
  const payload = `v1.${issued}.${randomBytes(16).toString('base64url')}`;
  const value = `${payload}.${sign(payload, key)}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function expiredAdminSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function isAdminSession(request: Request): boolean {
  const key = secret();
  if (!key) return false;
  const cookie = request.headers.get('cookie') || '';
  const encoded = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE_NAME + '='));
  if (!encoded) return false;
  const token = encoded.slice(COOKIE_NAME.length + 1);
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const issued = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issued) || issued > now + 30 || issued + MAX_AGE_SECONDS < now) return false;
  const payload = parts.slice(0, 3).join('.');
  const expected = Buffer.from(sign(payload, key));
  const received = Buffer.from(parts[3]);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
export const adminSessionConfigured = () => secret() !== null;
