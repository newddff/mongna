'use client';
import { DEFAULT_SOOP_RETURN_TO, safeSoopReturnTo } from './soop-auth-paths';
export const FLOW_STORAGE_KEY = 'mongna_soop_flow_nonce';
const FLOW_RETURN_KEY = 'mongna_soop_flow_return_to';

// Any same-site feature page can start the common authentication flow.
// New scope/policy types must first be registered on the server.
export async function beginSoopAuth(options: { purpose?: 'chat'; returnTo?: string } = {}) {
  const returnTo = safeSoopReturnTo(options.returnTo);
  const response = await fetch('/api/soop/auth/start', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: options.purpose || 'chat', returnTo }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '연결을 시작할 수 없습니다.');
  sessionStorage.setItem(FLOW_STORAGE_KEY, data.nonce);
  sessionStorage.setItem(FLOW_RETURN_KEY, returnTo);
  window.location.assign(data.authUrl);
}
export function consumeSoopFlow(fallback = DEFAULT_SOOP_RETURN_TO) {
  const nonce = sessionStorage.getItem(FLOW_STORAGE_KEY);
  const savedReturnTo = sessionStorage.getItem(FLOW_RETURN_KEY);
  sessionStorage.removeItem(FLOW_STORAGE_KEY);
  sessionStorage.removeItem(FLOW_RETURN_KEY);
  let returnTo = fallback;
  try { if (savedReturnTo) returnTo = safeSoopReturnTo(savedReturnTo); } catch {}
  // This path is used only for the retry link; successful redirects are server-authorized.
  return { nonce, returnTo };
}
