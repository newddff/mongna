'use client';
import { useCallback, useRef } from 'react';
import { ChatMessage, useSoopChat } from '../../../lib/use-soop-chat';
import StreamerConnectFour from '../../../components/StreamerConnectFour';
export default function StreamerMinigamesPage() {
  const listeners = useRef(new Set<(chat: ChatMessage) => void>());
  const subscribe = useCallback((listener: (chat: ChatMessage) => void) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);
  const onMessage = useCallback((chat: ChatMessage) => {
    listeners.current.forEach(listener => listener(chat));
  }, []);
  const connection = useSoopChat(onMessage);
  return <main style={{ minHeight: '100vh', background: '#f3f0f8', padding: '32px 20px', color: '#2d3748' }}>
    <style>{`
      .host-game button { padding: 10px 16px; border: 1px solid #c4b5fd; border-radius: 10px; background: #f5f3ff; color: #6d28d9; font-weight: 700; cursor: pointer; }
      .host-game button:disabled { opacity: .55; cursor: wait; }
    `}</style>
    <div className="host-game" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26 }}>💜 몽나 방송 미니게임</h1>
      <section style={{ padding: 24, background: 'white', borderRadius: 20, marginBottom: 24 }}>
        <p role="status" aria-live="polite" style={{ fontWeight: 700 }}>{connection.status}</p>
        {!connection.authenticated && <p>방송을 켠 뒤 몽나 SOOP 계정으로 연결해주세요. 처음 한 번 동의하면 다음 실행부터 자동으로 연결합니다.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {!connection.authenticated ? <button disabled={connection.busy} onClick={connection.startAuth}>SOOP 계정 연결</button> : <>
            {!connection.connected && <button disabled={connection.busy} onClick={connection.retryNow}>채팅 다시 연결</button>}
            {connection.connected && <button onClick={connection.stop}>채팅 중지</button>}
            <button disabled={connection.busy} onClick={connection.unlink}>이 브라우저 연동 해제</button>
          </>}
        </div>
      </section>
      {connection.authenticated && <StreamerConnectFour connected={connection.connected} subscribe={subscribe} />}
    </div>
  </main>;
}
