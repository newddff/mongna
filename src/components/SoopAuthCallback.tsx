'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { consumeSoopFlow } from '../lib/soop-auth-client';
import { safeSoopReturnTo } from '../lib/soop-auth-paths';

export default function SoopAuthCallback({ fallbackReturnTo = '/' }: { fallbackReturnTo?: string }) {
  const started = useRef(false);
  const [message, setMessage] = useState('SOOP 계정을 확인하고 있습니다.');
  const [returnTo, setReturnTo] = useState(fallbackReturnTo);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    window.history.replaceState(null, '', window.location.pathname);
    const finish = async () => {
      try {
        const flow = consumeSoopFlow(fallbackReturnTo);
        setReturnTo(flow.returnTo);
        if (!code || !flow.nonce || params.has('error')) {
          setMessage('연결이 취소됐거나 시간이 만료됐습니다. 원래 페이지에서 다시 연결해주세요.'); return;
        }
        const response = await fetch('/api/soop/auth/callback', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, nonce: flow.nonce }),
        });
        const data = await response.json();
        if (!response.ok) { setMessage(data.error || '연결을 완료하지 못했습니다.'); return; }
        window.location.replace(safeSoopReturnTo(data.returnTo));
      } catch { setMessage('연결을 완료하지 못했습니다. 원래 페이지에서 다시 시도해주세요.'); }
    };
    void finish();
  }, [fallbackReturnTo]);
  return <main style={{ maxWidth: 560, margin: '100px auto', padding: 24, textAlign: 'center' }}>
    <h1>SOOP 계정 연결</h1><p role="status">{message}</p>
    <Link href={returnTo}>원래 페이지로 돌아가기</Link>
  </main>;
}
