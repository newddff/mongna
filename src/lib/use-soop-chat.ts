'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { beginSoopAuth } from './soop-auth-client';
import { DEFAULT_SOOP_RETURN_TO } from './soop-auth-paths';

export type ChatMessage = { userId: string; nickname: string; text: string };
type Sdk = {
  setAuth(token: string): void; connect(): Promise<unknown>; disconnect(): void; destroy(): void;
  handleReady(callback: () => void): void;
  handleMessageReceived(callback: (action: string, message: any) => void): void;
  handleChatClosed(callback: () => void): void;
  handleError(callback: (code: unknown, message?: string) => void): void;
  getRoomInfo(): { bjId: string };
};
declare global { interface Window { SOOP?: { ChatSDK: new (clientId: string) => Sdk }; } }
const SDK_URL = 'https://static.sooplive.com/asset/app/chat-sdk/sooplive-chat-sdk.js';
export { FLOW_STORAGE_KEY } from './soop-auth-client';
let sdkLoading: Promise<void> | null = null;
export function loadChatSdk() {
  if (window.SOOP?.ChatSDK) return Promise.resolve();
  if (!sdkLoading) sdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL; script.async = true;
    script.onload = () => {
      if (window.SOOP?.ChatSDK) resolve();
      else { script.remove(); sdkLoading = null; reject(new Error('SDK를 불러오지 못했습니다.')); }
    };
    script.onerror = () => { script.remove(); sdkLoading = null; reject(new Error('SDK를 불러오지 못했습니다.')); };
    document.head.appendChild(script);
  });
  return sdkLoading;
}
export function useSoopChat(onMessage: (message: ChatMessage) => void) {
  const [status, setStatus] = useState('SOOP 연결을 확인하고 있습니다.');
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const sdkRef = useRef<Sdk | null>(null);
  const callbackRef = useRef(onMessage);
  const generation = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  const active = useRef(false);
  const connectRef = useRef<() => Promise<void>>();
  useEffect(() => { callbackRef.current = onMessage; }, [onMessage]);

  const dispose = useCallback(() => {
    const sdk = sdkRef.current; sdkRef.current = null;
    if (sdk) { try { sdk.destroy(); } catch { try { sdk.disconnect(); } catch {} } }
  }, []);
  const clearRetry = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = null;
  }, []);
  const connect = useCallback(async () => {
    if (!active.current || stopped.current) return;
    clearRetry();
    const run = ++generation.current;
    dispose(); setConnected(false); setBusy(true); setStatus('SOOP 채팅에 연결하고 있습니다.');
    const valid = () => active.current && !stopped.current && run === generation.current;
    const retry = (text: string, delay = 15000) => {
      if (!valid()) return;
      setConnected(false); setBusy(false); setStatus(text);
      clearRetry();
      reconnectTimer.current = setTimeout(() => { void connectRef.current?.(); }, delay);
    };
    try {
      const response = await fetch('/api/soop/chat/session', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!valid()) return;
      if (!response.ok) {
        if (data.kind === 'reauth' || data.kind === 'wrong_account') setAuthenticated(false);
        if (response.status >= 500 && data.kind !== 'configuration') {
          retry('SOOP 연결이 지연되고 있습니다. 잠시 후 다시 연결합니다.'); return;
        }
        setStatus(data.error || '연결을 확인해주세요.'); setBusy(false); return;
      }
      setAuthenticated(Boolean(data.authenticated));
      if (!data.authenticated) { setStatus('처음 한 번 SOOP 계정을 연결해주세요.'); setBusy(false); return; }
      if (!data.live) { retry('방송 시작을 기다리고 있습니다. 방송을 켜면 자동으로 연결합니다.', 30000); return; }
      await loadChatSdk();
      if (!valid()) return;
      const sdk = new window.SOOP.ChatSDK(data.clientId);
      sdkRef.current = sdk;
      let ready = false;
      sdk.handleReady(() => {
        if (!valid()) return;
        // Check the actual joined room as well as the server verification.
        const room = sdk.getRoomInfo();
        if (room.bjId?.toLowerCase() !== data.streamerId) {
          ++generation.current; dispose(); setConnected(false); setBusy(false);
          setStatus('연결된 방송이 다릅니다. SOOP 계정을 확인해주세요.'); return;
        }
        ready = true; clearRetry(); setConnected(true); setBusy(false); setStatus('채팅 연결 완료');
      });
      sdk.handleMessageReceived((action, message) => {
        if (!valid() || action !== 'MESSAGE' || typeof message?.message !== 'string') return;
        callbackRef.current({ userId: String(message.userId || ''), nickname: String(message.userNickname || ''), text: message.message });
      });
      sdk.handleChatClosed(() => retry('채팅 연결이 끊어졌습니다. 다시 연결하고 있습니다.'));
      sdk.handleError(() => retry('채팅에 연결할 수 없습니다. 방송 상태를 확인하며 다시 시도합니다.'));
      sdk.setAuth(data.accessToken);
      await sdk.connect();
      // connect() resolves before the SDK's ready event; do not start a game yet.
      if (valid() && !ready && !reconnectTimer.current) {
        reconnectTimer.current = setTimeout(() => { void connectRef.current?.(); }, 20000);
      }
    } catch {
      retry('채팅 연결에 실패했습니다. 잠시 후 다시 시도합니다.');
    }
  }, [clearRetry, dispose]);
  connectRef.current = connect;
  useEffect(() => {
    active.current = true; stopped.current = false; void connect();
    return () => { active.current = false; ++generation.current; clearRetry(); dispose(); };
  }, [connect, clearRetry, dispose]);

  const startAuth = async () => {
    setBusy(true); setStatus('SOOP 로그인 화면으로 이동합니다.');
    try {
      await beginSoopAuth({ purpose: 'chat', returnTo: DEFAULT_SOOP_RETURN_TO });
    } catch (error) { setStatus(error instanceof Error ? error.message : '연결을 시작할 수 없습니다.'); setBusy(false); }
  };
  const retryNow = () => { stopped.current = false; void connect(); };
  const stop = () => {
    stopped.current = true; ++generation.current; clearRetry(); dispose();
    setConnected(false); setBusy(false); setStatus('채팅 연결을 중지했습니다.');
  };
  const unlink = async () => {
    stop(); setBusy(true);
    try {
      const response = await fetch('/api/soop/chat/session', { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error();
      setAuthenticated(false); setStatus('이 브라우저의 SOOP 연결 정보를 삭제했습니다.');
    } catch { setStatus('연결 정보를 삭제하지 못했습니다. 다시 시도해주세요.'); }
    finally { setBusy(false); }
  };
  return { status, connected, authenticated, busy, startAuth, retryNow, stop, unlink };
}
