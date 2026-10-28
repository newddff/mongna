'use client';
import { useEffect, useRef, useState } from 'react';
import { useSoopChat } from '../../../lib/use-soop-chat';
import { beginSoopAuth } from '../../../lib/soop-auth-client';
import { AudiencePoll, suspects } from '../../../lib/mystery/case';
import s from './mystery.module.css';
export default function AudiencePanel() {
  const poll = useRef(new AudiencePoll());
  const [now, setNow] = useState(0), [running, setRunning] = useState(false), [revealed, setRevealed] = useState(false), [count, setCount] = useState(0), [authError, setAuthError] = useState('');
  const connection = useSoopChat(message => { if (poll.current.cast(message.userId, message.text, Date.now())) setCount(poll.current.size); });
  useEffect(() => { if (!running) return; const tick = () => { const time = Date.now(); setNow(time); if (time >= poll.current.deadline) { poll.current.stop(); setRunning(false); } }; tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer); }, [running]);
  useEffect(() => { if (!connection.connected && running) { poll.current.stop(); setRunning(false); } }, [connection.connected, running]);
  const start = () => { const time = Date.now(); poll.current.start(time); setNow(time); setCount(0); setRevealed(false); setRunning(true); };
  const auth = async () => { try { setAuthError(''); await beginSoopAuth({ purpose: 'chat', returnTo: '/streamer/mystery' }); } catch { setAuthError('연결을 시작하지 못했어요. 다시 시도해주세요.'); } };
  return <div className={s.poll}><p role="status">{connection.status}</p>
    {!connection.authenticated && <button onClick={auth} disabled={connection.busy}>몽나 SOOP 계정 연결</button>}
    {connection.authenticated && !connection.connected && <button onClick={connection.retryNow} disabled={connection.busy}>채팅 다시 연결</button>}
    {connection.connected && <button onClick={connection.stop}>채팅 연결 중지</button>}
    {authError && <p role="alert">{authError}</p>}
    <p>몽나가 생각을 말한 뒤, 달구들의 의견을 열어보세요.</p>
    <div className={s.pollChoices}>{suspects.map((v, i) => <span key={v.id}>{i + 1}. {v.name}</span>)}</div>
    <p>채팅에 <strong>!투표 1</strong> ~ <strong>!투표 4</strong> · 1인 1표 · 첫 유효 표만 집계</p>
    <div className={s.actions}><button disabled={!connection.connected || running} onClick={start}>30초 투표 시작</button>{running && <button onClick={() => { poll.current.stop(); setRunning(false); }}>투표 마감</button>}{!running && count > 0 && <button onClick={() => setRevealed(v => !v)}>{revealed ? '결과 가리기' : '결과 공개'}</button>}</div>
    <p role="status">{running ? `남은 시간 ${Math.max(0, Math.ceil((poll.current.deadline - now) / 1000))}초 · ` : ''}{count}명 참여{!revealed && count > 0 ? ' · 결과는 가려져 있어요' : ''}</p>
    {revealed && !running && <div>{poll.current.counts().map((v, i) => <div key={i} className={s.resultBar}><span>{suspects[i].name}</span><meter min={0} max={Math.max(1, count)} value={v} /><strong>{v}표</strong></div>)}</div>}
    <small>투표는 참고용이에요. 몽나의 선택이나 게임 진행을 바꾸지 않아요. 연결이 끊기면 투표를 마감해요.</small>
  </div>;
}
