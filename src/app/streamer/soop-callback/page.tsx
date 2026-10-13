'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FLOW_STORAGE_KEY } from '../../../lib/use-soop-chat';
export default function SoopCallbackPage() {
  const started = useRef(false);
  const [message, setMessage] = useState('SOOP 계정을 확인하고 있습니다.');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    window.history.replaceState(null, '', '/streamer/soop-callback');
    const finish = async () => {
      try {
        const nonce = sessionStorage.getItem(FLOW_STORAGE_KEY);
        sessionStorage.removeItem(FLOW_STORAGE_KEY);
        if (!code || !nonce || params.has('error')) {
          setMessage('연결이 취소됐거나 시간이 만료됐습니다. 미니게임에서 다시 연결해주세요.'); return;
        }
        const response = await fetch('/api/soop/chat/callback', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, nonce }),
        });
        const data = await response.json();
        if (!response.ok) { setMessage(data.error || '연결을 완료하지 못했습니다.'); return; }
        window.location.replace('/streamer/minigames');
      } catch { setMessage('연결을 완료하지 못했습니다. 미니게임에서 다시 시도해주세요.'); }
    };
    void finish();
  }, []);
  return <main style={{ maxWidth: 560, margin: '100px auto', padding: 24, textAlign: 'center' }}>
    <h1>SOOP 계정 연결</h1><p role="status">{message}</p>
    <Link href="/streamer/minigames">미니게임으로 돌아가기</Link>
  </main>;
}
