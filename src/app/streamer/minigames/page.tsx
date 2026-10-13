'use client';
import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ChatMessage, useSoopChat } from '../../../lib/use-soop-chat';
import ChatBoardGame, { GAME_INFO, GameKind } from '../../../components/board-games/ChatBoardGame';
import styles from '../../../components/board-games/board-games.module.css';
const GAMES: GameKind[] = ['connect-four', 'gomoku', 'chess', 'janggi'];
export default function StreamerMinigamesPage() {
  const [game, setGame] = useState<GameKind>('connect-four');
  const listeners = useRef(new Set<(chat: ChatMessage) => void>());
  const subscribe = useCallback((listener: (chat: ChatMessage) => void) => {
    listeners.current.add(listener); return () => { listeners.current.delete(listener); };
  }, []);
  const onMessage = useCallback((chat: ChatMessage) => { listeners.current.forEach(listener => listener(chat)); }, []);
  const connection = useSoopChat(onMessage);
  return <main className={styles.room}><div className={styles.inner}>
    <header className={styles.topbar}><div className={styles.brand}><span className={styles.brandMark}>✦</span>MONGNA PLAYROOM</div><Link className={styles.homeLink} href="/">팬페이지로 돌아가기 ↗</Link></header>
    <div className={styles.hero}><div><span className={styles.eyebrow}>몽나와 달구가 함께 두는 한 수</span><h1>오늘은 어떤 승부를 할까?</h1><p>몽나는 보드 위에서, 달구는 채팅으로.<br />함께 생각하고 한 수씩 겨뤄보세요.</p></div>
      <section className={styles.connectionCard}><div className={styles.connectionStatus} role="status" aria-live="polite"><i className={`${styles.statusDot} ${connection.connected ? styles.liveDot : ''}`} />{connection.status}</div>
        <div className={styles.connectionButtons}>{!connection.authenticated ? <button disabled={connection.busy} onClick={connection.startAuth}>SOOP 계정 연결</button> : <>
          {!connection.connected && <button disabled={connection.busy} onClick={connection.retryNow}>채팅 다시 연결</button>}
          {connection.connected && <button onClick={connection.stop}>채팅 중지</button>}
          <button disabled={connection.busy} onClick={connection.unlink}>이 브라우저 연동 해제</button>
        </>}</div>
        {!connection.authenticated && <p className={styles.connectionNote}>방송 중 몽나 계정으로 처음 한 번 연결해주세요. 이후 같은 브라우저에서 자동 연결됩니다.</p>}
      </section></div>
    <nav className={styles.gameTabs} aria-label="게임 선택">{GAMES.map(kind => <button type="button" key={kind} className={`${styles.gameTab} ${game === kind ? styles.gameTabActive : ''}`} aria-pressed={game === kind} onClick={() => setGame(kind)}><span className={styles.tabIcon}>{GAME_INFO[kind].icon}</span><span><strong>{GAME_INFO[kind].title}</strong><small>{GAME_INFO[kind].subtitle}</small></span></button>)}</nav>
    {GAMES.map(kind => <div key={kind} hidden={kind !== game}><ChatBoardGame kind={kind} enabled={connection.connected && kind === game} subscribe={subscribe} /></div>)}
    <footer className={styles.footer}>사용자당 한 턴에 한 표 · 유효한 수만 집계 · 동률은 몽나가 선택<br />게임을 바꿔도 채팅 연결과 게임별 대국은 유지됩니다.</footer>
  </div></main>;
}
