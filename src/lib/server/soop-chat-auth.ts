import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';

const API = 'https://openapi.sooplive.com';
export const HOST_PAGE = '/streamer/minigames';
export const SESSION_COOKIE = 'mongna_soop_chat';
export const FLOW_COOKIE = 'mongna_soop_flow';
const SESSION_DAYS = 30;
export class ChatAuthError extends Error {
  constructor(public kind: string, message: string, public status = 400) { super(message); }
}
type Pending = { nonce: string; expiresAt: number };
export type ChatSession = {
  streamerId: string; accessToken: string; refreshToken: string;
  accessExpiresAt: number; sessionExpiresAt: number;
};

export function chatConfig() {
  const clientId = process.env.SOOP_CLIENT_ID?.trim();
  const clientSecret = process.env.SOOP_CLIENT_SECRET?.trim();
  const secret = process.env.SOOP_CHAT_SESSION_SECRET?.trim();
  const redirectUrl = process.env.SOOP_CHAT_REDIRECT_URL?.trim();
  const missing = Object.entries({
    SOOP_CLIENT_ID: clientId, SOOP_CLIENT_SECRET: clientSecret,
    SOOP_CHAT_SESSION_SECRET: secret, SOOP_CHAT_REDIRECT_URL: redirectUrl,
  }).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new ChatAuthError('configuration', `현재 배포에 설정이 없습니다: ${missing.join(', ')}. Preview 적용 환경·브랜치와 재배포를 확인해주세요.`, 503);
  }
  if (secret.length < 32) {
    throw new ChatAuthError('configuration', 'SOOP_CHAT_SESSION_SECRET은 공백을 제외하고 32자 이상이어야 합니다.', 503);
  }
  let redirect: URL;
  try { redirect = new URL(redirectUrl); } catch {
    throw new ChatAuthError('configuration', 'SOOP 연결 주소 설정을 확인해주세요.', 503);
  }
  if (redirect.pathname !== '/streamer/soop-callback' || redirect.search || redirect.hash ||
      (redirect.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && redirect.hostname === 'localhost'))) {
    throw new ChatAuthError('configuration', 'SOOP 연결 주소 설정을 확인해주세요.', 503);
  }
  // Test accounts are permitted only on localhost or a Vercel Preview deployment.
  const testAllowed = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';
  const streamerId = testAllowed && process.env.SOOP_CHAT_TEST_STREAMER_ID
    ? process.env.SOOP_CHAT_TEST_STREAMER_ID.toLowerCase() : 'pinktape8';
  return { clientId, clientSecret, secret, redirectUrl, origin: redirect.origin, streamerId };
}

function key() { return createHash('sha256').update(chatConfig().secret).digest(); }
export function seal(value: object, purpose: 'flow' | 'session') {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(v => v.toString('base64url')).join('.');
}
export function unseal<T>(value: string, purpose: 'flow' | 'session'): T | null {
  try {
    const pieces = value.split('.');
    if (pieces.length !== 3) return null;
    const [iv, tag, encrypted] = pieces.map(v => Buffer.from(v, 'base64url'));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
  } catch { return null; }
}
function cookie(request: Request, name: string) {
  return (request.headers.get('cookie') || '').split(';').map(v => v.trim())
    .find(v => v.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export function requireOrigin(request: Request) {
  if (request.headers.get('origin') !== chatConfig().origin) {
    throw new ChatAuthError('origin', '허용되지 않은 요청입니다.', 403);
  }
}
export function setCookie(response: NextResponse, name: string, value: string, maxAge: number) {
  response.cookies.set(name, value, {
    httpOnly: true, secure: new URL(chatConfig().origin).protocol === 'https:',
    sameSite: 'lax', path: '/', maxAge,
  });
}
export function startFlow() {
  const pending: Pending = { nonce: randomBytes(32).toString('base64url'), expiresAt: Date.now() + 10 * 60 * 1000 };
  const url = new URL(API + '/auth/code');
  url.searchParams.set('client_id', chatConfig().clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'broad_access_chatinfo');
  // SOOP does not document OAuth state. Bind the callback POST to this browser
  // using an encrypted HttpOnly cookie + a per-tab nonce in sessionStorage.
  return { pending, authUrl: url.toString() };
}
export function verifyFlow(request: Request, nonce: unknown) {
  const pending = unseal<Pending>(cookie(request, FLOW_COOKIE), 'flow');
  if (!pending || !Number.isFinite(pending.expiresAt) || pending.expiresAt < Date.now() ||
      typeof nonce !== 'string' || typeof pending.nonce !== 'string') {
    throw new ChatAuthError('flow', '연결 시간이 만료됐습니다. 다시 시작해주세요.', 403);
  }
  const a = Buffer.from(pending.nonce), b = Buffer.from(nonce);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ChatAuthError('flow', '이 브라우저에서 시작한 연결이 아닙니다. 다시 시작해주세요.', 403);
  }
}
export function readSession(request: Request): ChatSession | null {
  const session = unseal<ChatSession>(cookie(request, SESSION_COOKIE), 'session');
  if (!session || session.streamerId !== chatConfig().streamerId ||
      typeof session.accessToken !== 'string' || !session.accessToken ||
      typeof session.refreshToken !== 'string' || !session.refreshToken ||
      !Number.isFinite(session.accessExpiresAt) || !Number.isFinite(session.sessionExpiresAt) ||
      session.sessionExpiresAt <= Date.now()) return null;
  return session;
}
export function persistSession(response: NextResponse, session: ChatSession) {
  const value = seal(session, 'session');
  if (value.length > 3700) throw new ChatAuthError('cookie_size', '인증 정보 저장 크기를 초과했습니다.', 503);
  setCookie(response, SESSION_COOKIE, value, Math.max(0, Math.floor((session.sessionExpiresAt - Date.now()) / 1000)));
}

async function post(path: string, params: Record<string, string>) {
  let response: Response;
  try {
    response = await fetch(API + path, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
  } catch { throw new ChatAuthError('upstream', 'SOOP 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.', 502); }
  let data: any;
  try { data = await response.json(); } catch {
    throw new ChatAuthError('upstream', 'SOOP 응답을 확인할 수 없습니다.', 502);
  }
  if (!response.ok) {
    throw new ChatAuthError(response.status === 401 || response.status === 403 ? 'reauth' : 'upstream',
      response.status === 401 || response.status === 403 ? 'SOOP 계정을 다시 연결해주세요.' : 'SOOP 요청에 실패했습니다.',
      response.status === 401 || response.status === 403 ? 401 : 502);
  }
  return data;
}
export async function exchangeToken(grant: 'authorization_code' | 'refresh_token', value: string, previous?: ChatSession): Promise<ChatSession> {
  const config = chatConfig();
  const data = await post('/auth/token', {
    client_id: config.clientId, client_secret: config.clientSecret, grant_type: grant,
    [grant === 'authorization_code' ? 'code' : 'refresh_token']: value,
  });
  const expiresIn = Number(data.expires_in);
  if (typeof data.access_token !== 'string' || !data.access_token || !Number.isFinite(expiresIn) || expiresIn <= 0 ||
      (typeof data.refresh_token !== 'string' && !previous?.refreshToken)) {
    throw new ChatAuthError('reauth', 'SOOP 인증이 만료됐거나 취소됐습니다. 다시 연결해주세요.', 401);
  }
  const refreshToken = data.refresh_token || previous?.refreshToken;
  if (!refreshToken) throw new ChatAuthError('reauth', 'SOOP 계정을 다시 연결해주세요.', 401);
  return { streamerId: config.streamerId, accessToken: data.access_token, refreshToken,
    accessExpiresAt: Date.now() + expiresIn * 1000,
    sessionExpiresAt: previous?.sessionExpiresAt || Date.now() + SESSION_DAYS * 86400000 };
}

export async function verifyRoom(accessToken: string, initial = false): Promise<boolean> {
  // This is the same authenticated endpoint used by the official Chat SDK.
  const data = await post('/broad/access/chatinfo', { access_token: accessToken });
  if (Number(data.result) > 0 && Array.isArray(data.data) && data.data.length) {
    if (data.data.some((room: any) => typeof room.id !== 'string' || room.id.toLowerCase() !== chatConfig().streamerId)) {
      throw new ChatAuthError('wrong_account', '몽나 계정으로만 사용할 수 있습니다. SOOP 로그인 계정을 확인해주세요.', 403);
    }
    return true;
  }
  // With no verified room identity, never issue a new authorized session or token.
  if (initial) throw new ChatAuthError('broadcast_required', '첫 연결은 방송 중에 진행해주세요. 계정과 방송을 확인할 수 없습니다.', 409);
  return false;
}
const refreshes = new Map<string, Promise<ChatSession>>();
export async function refreshSession(session: ChatSession) {
  if (session.accessExpiresAt > Date.now() + 60000) return session;
  const digest = createHash('sha256').update(session.refreshToken).digest('hex');
  let pending = refreshes.get(digest);
  if (!pending) {
    pending = exchangeToken('refresh_token', session.refreshToken, session);
    refreshes.set(digest, pending);
    // Briefly reuse a successful refresh across requests in this server instance.
    void pending.then(() => { const timer = setTimeout(() => refreshes.delete(digest), 10000); timer.unref(); }, () => refreshes.delete(digest));
  }
  return pending;
}
export function publicError(error: unknown) {
  return error instanceof ChatAuthError ? error : new ChatAuthError('internal', '연결 처리에 실패했습니다. 잠시 후 다시 시도해주세요.', 500);
}
