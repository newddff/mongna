// React 화면과 정적 HTML 화면이 같은 HttpOnly 관리자 쿠키를 확인합니다.
// localStorage에는 인증 정보 대신 다른 탭의 재확인을 위한 신호만 기록합니다.
const SYNC_KEY = 'mongna_admin_session_sync';
const LEGACY_KEY = 'mongna_secure_admin_v2';
let authenticated = false;
let revision = 0;
let pending = null;
let changing = false;
let stopWatching = null;
const listeners = new Set();

function publish(value) {
  if (authenticated === value) return;
  authenticated = value;
  listeners.forEach(listener => listener(value));
}

function signal() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.setItem(SYNC_KEY, `${Date.now()}:${Math.random()}`);
  } catch { /* 저장소가 차단돼도 쿠키로 로그인과 페이지 이동을 지원합니다. */ }
}

export function refreshAdminSession(force = false) {
  if (pending && !force) return pending;
  const current = ++revision;
  const request = Promise.resolve().then(() => fetch('/api/auth/session', {
    credentials: 'same-origin', cache: 'no-store'
  })).then(async response => response.ok ? response.json() : null)
    .then(session => {
      if (current === revision) publish(session?.authenticated === true);
      return authenticated;
    }).catch(() => {
      if (current === revision) publish(false);
      return false;
    }).finally(() => { if (pending === request) pending = null; });
  pending = request;
  return request;
}

export function invalidateAdminSession() {
  revision++;
  pending = null;
  publish(false);
  signal();
}

async function changeSession(operation) {
  if (changing) throw new Error('로그인 요청을 처리 중입니다. 잠시 후 다시 시도해주세요.');
  changing = true;
  revision++;
  pending = null;
  try { await operation(); } finally { changing = false; }
}

export function loginAdmin(password) {
  return changeSession(async () => {
    const response = await fetch('/api/auth', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!response.ok) throw new Error(response.status === 401 ? '비밀번호가 틀렸습니다.' : '관리자 로그인에 실패했습니다.');
    if (!await refreshAdminSession(true)) throw new Error('관리자 세션을 확인하지 못했습니다. 로그인 설정을 확인해주세요.');
    signal();
  });
}

export function logoutAdmin() {
  return changeSession(async () => {
    const response = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('로그아웃하지 못했습니다. 다시 시도해주세요.');
    invalidateAdminSession();
  });
}

export function subscribeAdminSession(listener) {
  listeners.add(listener);
  listener(authenticated);
  if (!stopWatching && typeof window !== 'undefined') {
    const recheck = () => { void refreshAdminSession(true); };
    const onVisibility = () => { if (document.visibilityState !== 'hidden') recheck(); };
    const onStorage = event => {
      if (event.key === SYNC_KEY || event.key === LEGACY_KEY || event.key === null) recheck();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', recheck);
    window.addEventListener('pageshow', recheck);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(onVisibility, 60000);
    stopWatching = () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', recheck);
      window.removeEventListener('pageshow', recheck);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }
  void refreshAdminSession();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopWatching?.(); stopWatching = null;
      revision++; pending = null; authenticated = false;
    }
  };
}
